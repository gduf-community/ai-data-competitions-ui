"use client";

import { useState } from "react";

import { DirectUploadImage } from "@/components/shared/direct-upload-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AwardReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  awardTitle: string;
  awardScope?: string | null;
  awardLevel?: string | null;
  displayLevel?: string | null;
  awardYear?: number | null;
  applicantName: string;
  memberNames?: string[];
  imageUrl: string;
  onAction: (action: "approve" | "reject", comment: string) => Promise<void>;
}

export function AwardReviewDialog({
  open,
  onOpenChange,
  awardTitle,
  awardScope,
  awardLevel,
  displayLevel,
  awardYear,
  applicantName,
  memberNames = [],
  imageUrl,
  onAction,
}: AwardReviewDialogProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setComment("");
    }
    onOpenChange(nextOpen);
  }

  async function handleAction(action: "approve" | "reject") {
    setSubmitting(true);
    try {
      await onAction(action, comment);
      setComment("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-lg">
        <DialogHeader className="shrink-0">
          <DialogTitle>审核奖状</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {imageUrl ? (
            <DirectUploadImage
              src={imageUrl}
              alt={awardTitle}
              className="aspect-[4/3] overflow-hidden rounded-lg border border-border"
              imgClassName="object-contain bg-black/5"
            />
          ) : null}
        </div>

        <div className="shrink-0 space-y-4 border-t border-border pt-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{awardTitle}</p>
            <div className="grid grid-cols-3 gap-2 text-xs text-slate-500">
              <span>范围：{awardScope || "—"}</span>
              <span>等级：{awardLevel || "—"}</span>
              <span>年份：{awardYear != null ? awardYear : "—"}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
              <span>提交人：{applicantName}</span>
              <span>获奖等级：{displayLevel || "—"}</span>
            </div>
            <p className="text-xs text-slate-500 line-clamp-2 break-words">
              参赛成员：
              {memberNames.length > 0 ? memberNames.join("、") : applicantName}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="award-comment">审核意见</Label>
            <Textarea
              id="award-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={2}
              placeholder="选填"
            />
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button loading={submitting}
            variant="destructive"
            onClick={() => handleAction("reject")}
            disabled={submitting}
          >
            驳回
          </Button>
          <Button loading={submitting} onClick={() => handleAction("approve")} disabled={submitting}>
            通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
