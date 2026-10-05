"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

interface DirectUploadImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback?: React.ReactNode;
}

function buildRetrySrc(src: string, retryToken: number) {
  return `${src}${src.includes("?") ? "&" : "?"}v=${retryToken}`;
}

export function DirectUploadImage({
  src,
  alt,
  className,
  imgClassName,
  fallback = (
    <div className="flex size-full items-center justify-center bg-muted/40 px-4 text-center text-xs text-muted-foreground">
      图片加载失败
    </div>
  ),
}: DirectUploadImageProps) {
  const [retryToken, setRetryToken] = useState(0);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);

  if (!src || imageLoadFailed) {
    return <div className={className}>{fallback}</div>;
  }

  return (
    <div className={className}>
      {/* 后台与个人中心仍保留原生 img 的重试能力，但展示地址应始终指向压缩后的图片。 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={buildRetrySrc(src, retryToken)}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={cn("size-full", imgClassName)}
        onError={() => {
          if (retryToken === 0) {
            setRetryToken(1);
            return;
          }
          setImageLoadFailed(true);
        }}
      />
    </div>
  );
}
