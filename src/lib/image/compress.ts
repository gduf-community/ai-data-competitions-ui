import { IMAGE_LIMITS } from "./config";

type CompressOptions = {
  maxWidth?: number;
  maxHeight?: number;
  targetSizeKB?: number;
  mimeType?: "image/webp" | "image/jpeg";
  startQuality?: number;
  minQuality?: number;
};

export async function compressImage(
  file: File,
  options: CompressOptions = {},
): Promise<File> {
  const {
    maxWidth = IMAGE_LIMITS.maxWidth,
    maxHeight = IMAGE_LIMITS.maxHeight,
    targetSizeKB = IMAGE_LIMITS.targetSizeKB,
    mimeType = "image/webp",
    startQuality = IMAGE_LIMITS.startQuality,
    minQuality = IMAGE_LIMITS.minQuality,
  } = options;

  if (!file.type.startsWith("image/")) {
    throw new Error("只能上传图片文件");
  }

  if (file.size > IMAGE_LIMITS.maxOriginalSizeMB * 1024 * 1024) {
    throw new Error(
      `图片过大，请上传 ${IMAGE_LIMITS.maxOriginalSizeMB}MB 以内的图片`,
    );
  }

  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const originalPixels = originalWidth * originalHeight;

  if (originalPixels > IMAGE_LIMITS.maxPixels) {
    bitmap.close();
    throw new Error("图片分辨率过高，请上传 2400 万像素以内的图片");
  }

  const scale = Math.min(
    1,
    maxWidth / originalWidth,
    maxHeight / originalHeight,
  );

  const targetWidth = Math.round(originalWidth * scale);
  const targetHeight = Math.round(originalHeight * scale);

  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("浏览器不支持图片压缩");
  }

  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
  bitmap.close();

  let quality = startQuality;
  let blob = await canvasToBlob(canvas, mimeType, quality);
  const targetBytes = targetSizeKB * 1024;

  while (blob.size > targetBytes && quality > minQuality) {
    quality = Math.max(minQuality, quality - 0.07);
    blob = await canvasToBlob(canvas, mimeType, quality);
  }

  const ext = mimeType === "image/webp" ? "webp" : "jpg";
  const basename = file.name.replace(/\.[^.]+$/, "");

  return new File([blob], `${basename}.${ext}`, {
    type: mimeType,
    lastModified: Date.now(),
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("图片压缩失败"));
          return;
        }
        resolve(blob);
      },
      type,
      quality,
    );
  });
}

export function getCompressedPreviewUrl(blob: Blob): string {
  return URL.createObjectURL(blob);
}

export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}
