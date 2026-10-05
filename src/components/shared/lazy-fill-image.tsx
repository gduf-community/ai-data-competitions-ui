import Image from "next/image";

import { cn } from "@/lib/utils";

interface LazyFillImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  fallbackText?: string;
  fallbackClassName?: string;
}

function isExternalUrl(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

/** 通用懒加载填充图，兼容站内上传路由与外部 https 链接，空图显示占位文案。 */
export function LazyFillImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  fallbackText = "暂无图片",
  fallbackClassName,
}: LazyFillImageProps) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex size-full items-center justify-center bg-muted/40 text-xs text-muted-foreground",
          fallbackClassName,
        )}
      >
        {fallbackText}
      </div>
    );
  }

  const isDynamicUploadRoute =
    src.startsWith("/api/uploads?") || src.includes("/api/uploads?");
  const isExternal = isExternalUrl(src);

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized={isDynamicUploadRoute || isExternal}
      loading="lazy"
      quality={70}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  );
}
