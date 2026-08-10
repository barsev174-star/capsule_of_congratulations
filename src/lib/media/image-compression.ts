export type CompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: "image/jpeg" | "image/webp";
  maxOutputBytes?: number;
  onProgress?: (progress: number) => void;
};

export type PreparedImage = {
  file: File;
  originalBytes: number;
  optimized: boolean;
};

export const CARD_IMAGE_UPLOAD_MAX_BYTES = 6 * 1024 * 1024;
export const CARD_IMAGE_SOURCE_MAX_BYTES = 40 * 1024 * 1024;

const browserSourceTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif"
]);

const extension = (file: Pick<File, "name">) => file.name.split(".").at(-1)?.toLocaleLowerCase() ?? "";

export const isHeicImageFile = (file: Pick<File, "name" | "type">) =>
  file.type === "image/heic" || file.type === "image/heif" || ["heic", "heif"].includes(extension(file));

export const isSupportedImageSource = (file: Pick<File, "name" | "type">) =>
  browserSourceTypes.has(file.type) || ["jpg", "jpeg", "png", "webp", "heic", "heif"].includes(extension(file));

export const shouldOptimizeImageFile = (file: Pick<File, "name" | "type" | "size">) =>
  file.size > CARD_IMAGE_UPLOAD_MAX_BYTES || isHeicImageFile(file);

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  cleanup: () => void;
};

const decodeImage = async (file: File): Promise<DecodedImage> => {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close()
      };
    } catch {
      // Safari can decode HEIC through an image element even when createImageBitmap cannot.
    }
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(objectUrl);
    image.onload = () => resolve({
      source: image,
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      cleanup
    });
    image.onerror = () => {
      cleanup();
      reject(new Error("IMAGE_DECODE_FAILED"));
    };
    image.src = objectUrl;
  });
};

const encodeCanvas = (canvas: HTMLCanvasElement, mimeType: string, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("IMAGE_COMPRESSION_FAILED")),
      mimeType,
      quality
    );
  });

export const compressImageFile = async (file: File, options?: CompressionOptions): Promise<File> => {
  const {
    maxWidth = 2000,
    maxHeight = 2000,
    quality = 0.86,
    mimeType = "image/jpeg",
    maxOutputBytes = CARD_IMAGE_UPLOAD_MAX_BYTES,
    onProgress
  } = options ?? {};
  onProgress?.(0.08);
  const decoded = await decodeImage(file);

  try {
    onProgress?.(0.32);
    const ratio = Math.min(1, maxWidth / decoded.width, maxHeight / decoded.height);
    const width = Math.max(1, Math.round(decoded.width * ratio));
    const height = Math.max(1, Math.round(decoded.height * ratio));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("CANVAS_UNAVAILABLE");

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, width, height);
    context.drawImage(decoded.source, 0, 0, width, height);
    onProgress?.(0.68);

    let currentQuality = quality;
    let blob = await encodeCanvas(canvas, mimeType, currentQuality);
    while (blob.size > maxOutputBytes && currentQuality > 0.56) {
      currentQuality = Math.max(0.56, currentQuality - 0.1);
      blob = await encodeCanvas(canvas, mimeType, currentQuality);
    }
    if (blob.size > maxOutputBytes) throw new Error("IMAGE_STILL_TOO_LARGE");

    onProgress?.(1);
    const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
    const outputExtension = mimeType === "image/webp" ? ".webp" : ".jpg";
    return new File([blob], `${baseName}${outputExtension}`, {
      type: mimeType,
      lastModified: Date.now()
    });
  } finally {
    decoded.cleanup();
  }
};

export const prepareImageFileForUpload = async (
  file: File,
  options?: Pick<CompressionOptions, "onProgress">
): Promise<PreparedImage> => {
  if (!isSupportedImageSource(file)) throw new Error("UNSUPPORTED_IMAGE_TYPE");
  if (file.size <= 0) throw new Error("EMPTY_IMAGE");
  if (file.size > CARD_IMAGE_SOURCE_MAX_BYTES) throw new Error("IMAGE_SOURCE_TOO_LARGE");

  if (!shouldOptimizeImageFile(file)) {
    options?.onProgress?.(1);
    return { file, originalBytes: file.size, optimized: false };
  }

  const prepared = await compressImageFile(file, {
    maxOutputBytes: CARD_IMAGE_UPLOAD_MAX_BYTES,
    onProgress: options?.onProgress
  });
  return { file: prepared, originalBytes: file.size, optimized: true };
};
