export type CompressionOptions = {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  mimeType?: string;
};

export const compressImageFile = async (file: File, options?: CompressionOptions): Promise<File> => {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.85, mimeType = "image/jpeg" } = options ?? {};

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
    };

    image.onload = () => {
      try {
        let { width, height } = image;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");

        if (!context) {
          cleanup();
          reject(new Error("Browser does not support canvas"));
          return;
        }

        context.fillStyle = "#FFFFFF";
        context.fillRect(0, 0, width, height);
        context.drawImage(image, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            cleanup();
            if (!blob) {
              reject(new Error("Image compression failed"));
              return;
            }
            const baseName = file.name.replace(/\.[^.]+$/, "");
            const extension = mimeType === "image/png" ? ".png" : ".jpg";
            resolve(new File([blob], `${baseName}${extension}`, { type: mimeType }));
          },
          mimeType,
          quality
        );
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    image.onerror = () => {
      cleanup();
      reject(new Error("Failed to read image file"));
    };

    image.src = objectUrl;
  });
};
