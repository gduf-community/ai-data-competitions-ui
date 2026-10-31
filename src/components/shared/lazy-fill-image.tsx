"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

const subscribeToCapability = () => () => {};
const readIntersectionObserverSupport = () =>
  typeof IntersectionObserver !== "undefined";
const readIntersectionObserverSupportOnServer = () => null;

interface LazyFillImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  fallbackText?: string;
  fallbackClassName?: string;
  priority?: boolean;
  /** 只给经 LCP 归因的关键图；首页 LCP 是 Hero 文本，本期不使用。 */
  fetchPriority?: "high" | "low" | "auto";
  /** 非首屏图片：进入扩展视口前不挂载 next/image，避免浏览器原生 lazy 提前请求。 */
  nearViewport?: boolean;
}

interface ConnectionInfo {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * 扩展视口：移动 768px / 桌面 320px；Save-Data 或 2G 降到 0px。
 * 移动端 768px 由 2026-10-31 实测得出：256px 时受限 4G 下可见图停住后还需 1.4–1.6s，
 * 而首页荣誉墙首卡距首屏 2372px，768px 仍不会产生初始请求。
 */
export function resolveNearViewportRootMargin({
  saveData,
  effectiveType,
  isMobile,
}: {
  saveData?: boolean;
  effectiveType?: string;
  isMobile: boolean;
}): string {
  if (saveData || effectiveType === "slow-2g" || effectiveType === "2g") {
    return "0px";
  }
  return isMobile ? "768px 0px" : "320px 0px";
}

function readNearViewportRootMargin(): string {
  const connection = (navigator as Navigator & { connection?: ConnectionInfo })
    .connection;
  return resolveNearViewportRootMargin({
    saveData: connection?.saveData,
    effectiveType: connection?.effectiveType,
    isMobile: window.matchMedia("(max-width: 640px)").matches,
  });
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
  fetchPriority,
  nearViewport = false,
}: LazyFillImageProps) {
  const gate = nearViewport && !priority;
  const [loadState, setLoadState] = useState({src, failed: false});
  const [mounted, setMounted] = useState(!gate);
  const placeholderRef = useRef<HTMLDivElement | null>(null);
  // 服务端为 null（按占位渲染）；客户端水合后才知道浏览器是否有 IntersectionObserver。
  const observerSupport = useSyncExternalStore<boolean | null>(
    subscribeToCapability,
    readIntersectionObserverSupport,
    readIntersectionObserverSupportOnServer,
  );
  // 注意：只在经实测位于折叠线下方的区块启用 gate。若区块进入首屏，图片要等水合后
  // 才开始请求；2026-10-31 合成样例中图片 LCP 会从 2.4s 退到 7.2s（移动受限 4G）。
  const renderNow = !gate || mounted || observerSupport === false;

  useEffect(() => {
    if (!gate || mounted || observerSupport !== true) return;
    const node = placeholderRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        setMounted(true);
      },
      { rootMargin: readNearViewportRootMargin() },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // src 为空时先渲染回退文本、没有占位节点；src 变为有效地址后需要重新挂 observer。
  }, [gate, mounted, observerSupport, src]);

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

  if (!renderNow) {
    // 未进入扩展视口：只占位，不产生 <img> 与真实请求；挂载后不再卸载。
    return (
      <div
        ref={placeholderRef}
        aria-hidden="true"
        className={cn("size-full bg-muted/40", fallbackClassName)}
      />
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
      fetchPriority={fetchPriority}
      quality={70}
      sizes={sizes}
      className={cn("object-cover", className)}
      onError={() => setLoadState({src, failed: true})}
    />
  );
}
