import { readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import sharp from "sharp";

export const runtime = "nodejs";

const supportedAssetPattern = /^\/templates\/[a-z0-9][a-z0-9/_-]*\.(?:webp|avif|png|jpe?g)$/iu;

const parseCrop = (value: string | null) => {
  if (!value) return null;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0)) return undefined;
  const [left, top, width, height] = parts;
  if (width < 1 || height < 1) return undefined;
  return { left, top, width, height };
};

const parseSize = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 4096 ? parsed : undefined;
};

const parseSlices = (value: string | null) => {
  if (!value) return null;
  const [kind, ...rawValues] = value.split(":");
  const values = rawValues.join(":").split(",").map(Number);
  if (kind === "nine" && values.length === 4 && values.every((part) => Number.isFinite(part) && part > 0 && part < .5)) {
    return { kind, top: values[0], right: values[1], bottom: values[2], left: values[3] } as const;
  }
  if (kind === "horizontal" && values.length === 1 && Number.isFinite(values[0]) && values[0] > 0 && values[0] < .5) {
    return { kind, edge: values[0] } as const;
  }
  return undefined;
};

const renderSlices = async (
  input: Buffer,
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  slices: NonNullable<ReturnType<typeof parseSlices>>
) => {
  const sourceXs = slices.kind === "nine"
    ? [0, Math.round(sourceWidth * slices.left), Math.round(sourceWidth * (1 - slices.right)), sourceWidth]
    : [0, Math.round(sourceWidth * slices.edge), Math.round(sourceWidth * (1 - slices.edge)), sourceWidth];
  const sourceYs = slices.kind === "nine"
    ? [0, Math.round(sourceHeight * slices.top), Math.round(sourceHeight * (1 - slices.bottom)), sourceHeight]
    : [0, sourceHeight];
  const targetXs = slices.kind === "nine"
    ? (() => {
        const scale = Math.min(targetWidth / sourceWidth, targetHeight / ((slices.top + slices.bottom) * sourceHeight));
        return [0, Math.round(slices.left * sourceWidth * scale), Math.round(targetWidth - slices.right * sourceWidth * scale), targetWidth];
      })()
    : (() => {
        const sourceEdgeWidth = sourceWidth * slices.edge;
        const targetEdgeWidth = Math.min(sourceEdgeWidth * (targetHeight / sourceHeight), targetWidth * .28);
        return [0, Math.round(targetEdgeWidth), Math.round(targetWidth - targetEdgeWidth), targetWidth];
      })();
  const targetYs = slices.kind === "nine"
    ? (() => {
        const scale = Math.min(targetWidth / sourceWidth, targetHeight / ((slices.top + slices.bottom) * sourceHeight));
        return [0, Math.round(slices.top * sourceHeight * scale), Math.round(targetHeight - slices.bottom * sourceHeight * scale), targetHeight];
      })()
    : [0, targetHeight];
  const composites = await Promise.all(sourceYs.slice(0, -1).flatMap((sourceY, row) =>
    sourceXs.slice(0, -1).map(async (sourceX, column) => {
      const width = Math.max(1, targetXs[column + 1] - targetXs[column]);
      const height = Math.max(1, targetYs[row + 1] - targetYs[row]);
      const tile = await sharp(input)
        .extract({
          left: sourceX,
          top: sourceY,
          width: Math.max(1, sourceXs[column + 1] - sourceX),
          height: Math.max(1, sourceYs[row + 1] - sourceY)
        })
        .resize(width, height, { fit: "fill" })
        .png()
        .toBuffer();
      return { input: tile, left: targetXs[column], top: targetYs[row] };
    })
  ));
  return sharp({
    create: { width: targetWidth, height: targetHeight, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite(composites).png().toBuffer();
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const src = searchParams.get("src") ?? "";
  const crop = parseCrop(searchParams.get("crop"));
  const width = parseSize(searchParams.get("width"));
  const height = parseSize(searchParams.get("height"));
  const slices = parseSlices(searchParams.get("slices"));
  if (!supportedAssetPattern.test(src) || src.split("/").includes("..")) {
    return new Response(null, { status: 404 });
  }
  if (crop === undefined || slices === undefined || width === undefined || height === undefined || Boolean(width) !== Boolean(height) || (slices && (!width || !height))) {
    return new Response(null, { status: 400 });
  }

  const publicRoot = resolve(process.cwd(), "public");
  const filePath = resolve(publicRoot, ...src.split("/").filter(Boolean));
  if (!filePath.startsWith(`${publicRoot}${sep}`)) return new Response(null, { status: 404 });

  try {
    const input = await readFile(filePath);
    const source = sharp(input);
    const metadata = await source.metadata();
    if (!metadata.width || !metadata.height) return new Response(null, { status: 404 });
    if (slices && width && height) {
      const png = await renderSlices(input, metadata.width, metadata.height, width, height, slices);
      return new Response(new Uint8Array(png), {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(png.length),
          "Cache-Control": "public, max-age=31536000, immutable"
        }
      });
    }
    if (crop) {
      if (crop.left + crop.width > metadata.width || crop.top + crop.height > metadata.height) {
        return new Response(null, { status: 400 });
      }
      source.extract(crop);
    }
    if (width && height) source.resize(width, height, { fit: "fill" });
    const png = await source.png().toBuffer();
    return new Response(new Uint8Array(png), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(png.length),
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
