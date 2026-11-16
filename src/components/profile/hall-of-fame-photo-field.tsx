"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, RefreshCw, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EulerBridgeLoader } from "@/components/shared/euler-bridge-loader";
import {
  HALL_OF_FAME_PHOTO_ALLOWED_TYPES,
  HALL_OF_FAME_PHOTO_MAX_BYTES,
  parseHallPortraitUploadResponse,
  sanitizePublicPortraitSrc,
  type HallPortraitUploadRef,
} from "@/lib/hall-of-fame";
import {
  compressImage,
  getCompressedPreviewUrl,
  revokePreviewUrl,
} from "@/lib/image/compress";
import { isAbortError } from "@/lib/http-client";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { cn } from "@/lib/utils";

const HALL_PORTRAIT_UPLOAD_TIMEOUT_MS = 30_000;

export function validateHallPortraitFile(file: {
  type: string;
  size: number;
}): string | null {
  const mimeType = file.type.trim().toLowerCase();
  if (
    !HALL_OF_FAME_PHOTO_ALLOWED_TYPES.includes(
      mimeType as (typeof HALL_OF_FAME_PHOTO_ALLOWED_TYPES)[number],
    )
  ) {
    return "仅支持 JPG、PNG 或 WebP 格式图片";
  }

  if (!Number.isFinite(file.size) || file.size <= 0) {
    return "图片文件为空，请重新选择";
  }

  if (file.size > HALL_OF_FAME_PHOTO_MAX_BYTES) {
    return "图片大小不能超过 5MB";
  }

  return null;
}

export interface HallOfFamePhotoFieldProps {
  value: HallPortraitUploadRef | null;
  existingPreviewUrl?: string | null;
  onChange: (next: HallPortraitUploadRef | null) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  error?: string | null;
  inputId?: string;
  label?: string;
  helperText?: string;
}

function readUploadErrorMessage(status: number, payload: unknown): string {
  if (
    payload &&
    typeof payload === "object" &&
    "message" in payload &&
    typeof payload.message === "string" &&
    payload.message.trim()
  ) {
    return payload.message.trim();
  }
  if (status === 413) {
    return "上传图片体积超出限制，请裁剪或更换清晰度适中的照片后重试";
  }
  if (status === 429) {
    return "上传过于频繁，请稍候再试";
  }
  if (status === 403) {
    return "当前账号暂不具备上传名人堂照片的权限，请刷新页面核对状态";
  }
  if (status === 503) {
    return "上传服务暂不可用，请稍后点击重试";
  }
  return `上传失败（HTTP ${status}），请检查图片格式后重试`;
}

export function HallOfFamePhotoField({
  value,
  existingPreviewUrl,
  onChange,
  onUploadingChange,
  disabled = false,
  error,
  inputId,
  label = "本人展示照片",
  helperText = "支持 JPG / PNG / WebP，最大 5MB。上传成功仅保存在待审草稿中，提交且审核通过后才会公开展示，不会改动你的账号头像。",
}: HallOfFamePhotoFieldProps) {
  const generatedId = useId();
  const fieldId = inputId ?? generatedId;
  const errorId = `${fieldId}-error`;
  const helpId = `${fieldId}-help`;

  const inputRef = useRef<HTMLInputElement>(null);
  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const [uploading, setUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);

  const releaseObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      revokePreviewUrl(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      requestIdRef.current += 1;
      abortRef.current?.abort();
      releaseObjectUrl();
    };
  }, [releaseObjectUrl]);

  const startUpload = useCallback(
    async (file: File) => {
      const validationMessage = validateHallPortraitFile(file);
      if (validationMessage) {
        abortRef.current?.abort();
        requestIdRef.current += 1;
        releaseObjectUrl();
        lastFileRef.current = null;
        setLocalPreviewUrl(null);
        setUploading(false);
        onUploadingChange?.(false);
        onChange(null);
        setUploadError(validationMessage);
        setCanRetry(false);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }

      abortRef.current?.abort();
      const requestId = ++requestIdRef.current;
      const controller = new AbortController();
      abortRef.current = controller;
      lastFileRef.current = file;

      releaseObjectUrl();
      setLocalPreviewUrl(null);
      setUploadError(null);
      setCanRetry(false);
      onChange(null);
      setUploading(true);
      onUploadingChange?.(true);

      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      let timedOut = false;

      try {
        let compressedFile: File;
        try {
          compressedFile = await compressImage(file, {
            maxWidth: 1600,
            maxHeight: 1600,
            targetSizeKB: 600,
            mimeType: "image/webp",
          });
        } catch (compressError) {
          throw new Error(
            compressError instanceof Error && compressError.message.trim()
              ? `图片读取或压缩失败：${compressError.message}`
              : "图片读取或压缩失败，请更换清晰的 JPG、PNG 或 WebP 照片",
          );
        }

        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }

        const preview = getCompressedPreviewUrl(compressedFile);
        objectUrlRef.current = preview;
        setLocalPreviewUrl(preview);

        const formData = new FormData();
        formData.set("scope", "hall_portrait");
        formData.set("files", compressedFile);

        timeoutId = setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, HALL_PORTRAIT_UPLOAD_TIMEOUT_MS);

        const response = await fetchWithCsrf("/api/uploads", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const payload = await response.json().catch(() => null);
        if (requestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok) {
          throw new Error(readUploadErrorMessage(response.status, payload));
        }

        const ref = parseHallPortraitUploadResponse(payload);
        onChange(ref);
        setUploadError(null);
        setCanRetry(false);
      } catch (caughtError) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        if (isAbortError(caughtError) && !timedOut) {
          return;
        }
        const message = timedOut
          ? "照片上传超时，请检查网络后点击重试"
          : caughtError instanceof Error && caughtError.message.trim()
            ? caughtError.message
            : "照片上传失败，请稍后重试";
        onChange(null);
        setUploadError(message);
        setCanRetry(Boolean(lastFileRef.current));
      } finally {
        if (timeoutId !== null) {
          clearTimeout(timeoutId);
        }
        if (abortRef.current === controller) {
          abortRef.current = null;
        }
        if (requestId === requestIdRef.current) {
          setUploading(false);
          onUploadingChange?.(false);
          if (inputRef.current) inputRef.current.value = "";
        }
      }
    },
    [onChange, onUploadingChange, releaseObjectUrl],
  );

  function handleClear() {
    abortRef.current?.abort();
    requestIdRef.current += 1;
    releaseObjectUrl();
    lastFileRef.current = null;
    setLocalPreviewUrl(null);
    setUploadError(null);
    setCanRetry(false);
    setUploading(false);
    onUploadingChange?.(false);
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleRetry() {
    if (!lastFileRef.current || uploading || disabled) return;
    void startUpload(lastFileRef.current);
  }

  const safeFallbackUrl = sanitizePublicPortraitSrc(
    value?.previewUrl ?? existingPreviewUrl ?? null,
  );
  const displayPreview = localPreviewUrl ?? safeFallbackUrl;
  const combinedError = uploadError ?? error ?? null;
  const isInteractiveDisabled = disabled || uploading;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={fieldId} className="text-sm font-medium">
          {label}
        </label>
        {value ? (
          <Badge variant="secondary" className="gap-1 bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
            <CheckCircle2 className="size-3.5" />
            已上传待提交（尚未公开展示）
          </Badge>
        ) : null}
      </div>

      <p id={helpId} className="text-xs leading-relaxed text-muted-foreground">
        {helperText}
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={cn(
            "relative flex aspect-[3/4] w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/40",
            combinedError ? "border-destructive/70" : "border-border",
          )}
        >
          {displayPreview ? (
            // 本地压缩 blob 预览与私有受控预览不适用 Next 静态优化缓存
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayPreview}
              alt={`${label}预览`}
              className="size-full object-cover"
            />
          ) : (
            <span className="px-2 text-center text-xs text-muted-foreground">
              暂无新上传照片
            </span>
          )}

          {uploading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 px-2 text-center text-white">
              <EulerBridgeLoader size={22} tone="inherit" className="text-white" />
              <span className="text-xs">正在压缩上传...</span>
            </div>
          ) : null}

          {(value || localPreviewUrl) && !uploading && !disabled ? (
            <button
              type="button"
              onClick={handleClear}
              aria-label="移除已选照片"
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/65 text-white transition-colors hover:bg-black/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2.5">
          <input
            ref={inputRef}
            id={fieldId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={isInteractiveDisabled}
            aria-invalid={Boolean(combinedError)}
            aria-describedby={combinedError ? `${helpId} ${errorId}` : helpId}
            className="sr-only"
            onChange={(event) => {
              const selected = event.target.files?.[0];
              if (!selected) return;
              void startUpload(selected);
            }}
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={uploading}
              disabled={isInteractiveDisabled}
              onClick={() => inputRef.current?.click()}
            >
              <ImagePlus className="mr-1.5 size-4" />
              {uploading
                ? "上传中..."
                : value
                  ? "重新选择照片"
                  : "选择并上传照片"}
            </Button>

            {canRetry && !uploading && !disabled ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleRetry}
              >
                <RefreshCw className="mr-1.5 size-4" />
                重试上传
              </Button>
            ) : null}

            {(value || localPreviewUrl) && !uploading && !disabled ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
              >
                清除重选
              </Button>
            ) : null}
          </div>

          {value ? (
            <p className="text-xs text-muted-foreground">
              当前上传照片已就绪，请核对个人展示信息并完成下方表单提交后进入审核。
            </p>
          ) : existingPreviewUrl ? (
            <p className="text-xs text-muted-foreground">
              当前已有已提交或审核通过的照片；如需替换，请重新选择图片上传。
            </p>
          ) : null}

          {combinedError ? (
            <p
              id={errorId}
              role="alert"
              className="flex items-start gap-1.5 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{combinedError}</span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
