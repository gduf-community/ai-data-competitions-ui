"use client";

import Image from "next/image";
import { useState } from "react";

import { cn } from "@/lib/utils";

interface LazyFillImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  fallbackText?: string;
  fallbackClassName?: string;
  priority?: boolean;
}

function isExternalUrl(src: string) {
  return src.startsWith("http://") || src.startsWith("https://");
}

/** 失败按地址记录；新地址自动重试。动态授权素材不进入 Next 优化缓存。 */
export function LazyFillImage({
  src,
  alt,
  className,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  fallbackText = "暂无图片",
  fallbackClassName,
  priority = false,
}: LazyFillImageProps) {
  const [loadState, setLoadState] = useState({src, failed: false});
  if (loadState.src !== src) setLoadState({src, failed: false});
  if (!src || (loadState.src === src && loadState.failed)) {
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
    src.includes("/api/uploads?") || src.includes("/api/portal/assets?");
  const isExternal = isExternalUrl(src);

  return (
    <Image
      key={src}
      src={src}
      alt={alt}
      fill
      unoptimized={isDynamicUploadRoute || isExternal}
      loading={priority ? "eager" : "lazy"}
      priority={priority}
      quality={70}
      sizes={sizes}
      className={cn("object-cover", className)}
      onError={() => setLoadState({src, failed: true})}
    />
  );
}
