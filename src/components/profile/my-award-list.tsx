"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ImageIcon, Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { CompetitionPicker } from "@/components/competitions/competition-picker";
import { DirectUploadImage } from "@/components/shared/direct-upload-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { compressImage } from "@/lib/image/compress";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import type { MyAwardRow } from "@/lib/contracts/profiles";

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  pending: { label: "待审核", variant: "default" },
  approved: { label: "已通过", variant: "outline" },
  rejected: { label: "已驳回", variant: "destructive" },
};

interface MyAwardListProps {
  awards: MyAwardRow[];
}

export function MyAwardList({ awards }: MyAwardListProps) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [competition, setCompetition] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [awardLevel, setAwardLevel] = useState("");

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("请选择奖状图片");
      return;
    }
    if (!competition) {
      toast.error("请选择比赛");
      return;
    }

    setUploading(true);
    try {
      const compressedFile = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetSizeKB: 600,
        mimeType: "image/webp",
      });

      const body = new FormData();
      body.append("file", compressedFile);
      body.append("competitionId", competition.id);
      if (awardLevel) {
        body.append("awardLevel", awardLevel);
      }

      const res = await fetch("/api/me/award-certificates", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "上传失败" }));
        throw new Error(err.message);
      }

      toast.success("奖状已上传，等待管理员审核");
      setShowUpload(false);
      setCompetition(null);
      setAwardLevel("");
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetchWithCsrf(`/api/me/award-certificates/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "撤销失败" }));
        throw new Error(err.message);
      }

      toast.success("奖状记录已撤销");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤销失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {awards.length} 份奖状</p>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Plus className="mr-1 size-4" />
          上传奖状
        </Button>
      </div>

      {awards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ImageIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">暂无奖状</p>
            <p className="text-xs text-muted-foreground">
              比赛报名成功后，可在这里补充获奖证书。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((award) => {
            const config = statusConfig[award.status] ?? statusConfig.pending;
            const isDeleting = deletingId === award.id;
            return (
              <Card key={award.id} className="overflow-hidden">
                <DirectUploadImage
                  src={award.imageUrl}
                  alt={award.competitionTitle}
                  className="aspect-[4/3]"
                  imgClassName="object-cover"
                />
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {award.competitionTitle}
                    </span>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  {award.awardLevel ? (
                    <p className="text-xs text-primary">{award.awardLevel}</p>
                  ) : null}
                  {award.reviewComment ? (
                    <p className="text-xs text-slate-500">
                      审核备注：{award.reviewComment}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(award.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                  {award.status === "approved" ? (
                    <p className="text-xs text-muted-foreground">
                      是否展示到首页作品墙由管理员单独决定。
                    </p>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={isDeleting}
                    onClick={() => void handleDelete(award.id)}
                  >
                    <Trash2 className="mr-1 size-3.5" />
                    {isDeleting ? "撤销中..." : "撤销奖状"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上传奖状</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="award-competition">比赛</Label>
              <CompetitionPicker
                value={competition}
                onChange={setCompetition}
                placeholder="请选择比赛"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="award-level">获奖等级（选填）</Label>
              <Input
                id="award-level"
                value={awardLevel}
                onChange={(event) => setAwardLevel(event.target.value)}
                placeholder="如：国家级一等奖"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="award-file">
                奖状图片（PNG/JPG/WebP，≤5MB，上传前会自动压缩）
              </Label>
              <Input
                id="award-file"
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpload(false)}
              disabled={uploading}
            >
              取消
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "上传中..." : "提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
