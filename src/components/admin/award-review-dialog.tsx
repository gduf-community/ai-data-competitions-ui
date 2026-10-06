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
  awardLevel?: string | null;
  applicantName: string;
  imageUrl: string;
  onAction: (action: "approve" | "reject", comment: string) => Promise<void>;
}

export function AwardReviewDialog({
  open,
  onOpenChange,
  awardTitle,
  awardLevel,
  applicantName,
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>审核奖状</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-900">{awardTitle}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span>提交人：{applicantName}</span>
              {awardLevel ? <span>获奖等级：{awardLevel}</span> : null}
            </div>
          </div>
          {imageUrl ? (
            <DirectUploadImage
              src={imageUrl}
              alt={awardTitle}
              className="aspect-[4/3] overflow-hidden rounded-lg border border-border"
              imgClassName="object-contain bg-black/5"
            />
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="award-comment">审核意见</Label>
            <Textarea
              id="award-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              placeholder="选填"
            />
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={() => handleAction("reject")}
            disabled={submitting}
          >
            驳回
          </Button>
          <Button onClick={() => handleAction("approve")} disabled={submitting}>
            通过
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
