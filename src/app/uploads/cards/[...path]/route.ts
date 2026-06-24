import { readFile, stat } from "node:fs/promises";
import { basename, join, resolve, sep } from "node:path";
import { NextResponse } from "next/server";
import { CARD_UPLOADS_STORAGE_ROOT } from "@/lib/media/local-card-media-storage";

const contentTypes: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp"
};

const getContentType = (fileName: string) => {
  const extension = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  return contentTypes[extension] ?? "application/octet-stream";
};

const isInsideUploadsRoot = (filePath: string) => {
  const resolvedRoot = resolve(CARD_UPLOADS_STORAGE_ROOT);
  const resolvedPath = resolve(filePath);

  return resolvedPath === resolvedRoot || resolvedPath.startsWith(`${resolvedRoot}${sep}`);
};

export async function GET(
  _request: Request,
  {
    params
  }: {
    params: Promise<{ path: string[] }>;
  }
) {
  const { path } = await params;

  if (!Array.isArray(path) || path.length !== 2 || path.some((segment) => segment.includes("..") || segment.includes(sep))) {
    return NextResponse.json({ ok: false, message: "Invalid media path." }, { status: 400 });
  }

  const [cardId, fileName] = path;
  const filePath = join(CARD_UPLOADS_STORAGE_ROOT, cardId, basename(fileName));

  if (!isInsideUploadsRoot(filePath)) {
    return NextResponse.json({ ok: false, message: "Invalid media path." }, { status: 400 });
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      return NextResponse.json({ ok: false, message: "Media not found." }, { status: 404 });
    }

    const file = await readFile(filePath);

    return new NextResponse(file, {
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "Content-Length": String(file.length),
        "Content-Type": getContentType(fileName)
      }
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Media not found." }, { status: 404 });
  }
}
