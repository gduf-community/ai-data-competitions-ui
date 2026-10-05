export const IMAGE_LIMITS = {
  maxOriginalSizeMB: 10,
  maxPixels: 24_000_000,
  maxWidth: 1920,
  maxHeight: 1920,
  targetSizeKB: 800,
  minQuality: 0.55,
  startQuality: 0.82,
} as const;

export const SCENE_PRESETS = {
  avatar: { maxWidth: 512, maxHeight: 512, targetSizeKB: 150, quality: 0.75 },
  content: { maxWidth: 1280, maxHeight: 1280, targetSizeKB: 500, quality: 0.82 },
  showcase: { maxWidth: 1920, maxHeight: 1920, targetSizeKB: 900, quality: 0.85 },
  thumb: { maxWidth: 320, maxHeight: 320, targetSizeKB: 80, quality: 0.7 },
} as const;

export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export const COMPRESSION_SIZES = {
  thumb: 320,
  medium: 960,
  large: 1920,
} as const;
