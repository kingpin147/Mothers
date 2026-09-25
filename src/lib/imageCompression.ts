"use client";

/**
 * Fast client-side image compression & EXIF stripping using HTMLCanvas.
 * Resizes max dimension to 1000px and converts to WebP/JPEG ~150KB.
 */
export async function compressImageClient(file: File, maxDimension = 1000, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("File must be an image"));
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("Image size must be 10MB or less"));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to initialize canvas"));
          return;
        }

        // Draw image (automatically strips EXIF metadata for privacy)
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP (or fallback to JPEG)
        const format = canvas.toDataURL("image/webp", quality).startsWith("data:image/webp")
          ? "image/webp"
          : "image/jpeg";

        const dataUrl = canvas.toDataURL(format, quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Failed to load image into canvas"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });
}
