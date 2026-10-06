"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

interface ClubCoverUploadFieldProps {
  clubId: string;
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export function ClubCoverUploadField({
  clubId,
  value,
  onChange,
  label = "封面图",
}: ClubCoverUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("仅支持 PNG / JPEG / WEBP 格式图片");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error("图片大小不能超过 5MB");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set("scope", "club");
      formData.set("clubId", clubId);
      formData.set("files", file);

      const res = await fetchWithCsrf("/api/uploads", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "上传失败" }));
        throw new Error(err.message);
      }

      const payload = (await res.json()) as {
        files?: Array<{ publicUrl: string }>;
      };
      const uploadedUrl = payload.files?.[0]?.publicUrl;
      if (!uploadedUrl) {
        throw new Error("上传成功但未返回图片地址");
      }

      onChange(uploadedUrl);
      toast.success("封面图已上传");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="relative aspect-[16/9] w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted/30">
        <LazyFillImage src={value} alt={label} fallbackText="暂无封面图" />
        {uploading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="size-6 animate-spin text-white" />
          </div>
        ) : null}
        {value && !uploading ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="移除封面图"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
      >
        <ImagePlus className="mr-1 size-3.5" />
        {value ? "更换封面图" : "上传封面图"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
