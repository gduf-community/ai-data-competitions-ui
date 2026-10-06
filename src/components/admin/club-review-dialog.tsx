"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RichTextContent } from "@/components/shared/rich-text-content";
import { Textarea } from "@/components/ui/textarea";

interface ClubReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentTitle: string;
  contentStatus: string;
  clubName: string;
  authorName: string;
  content: string;
  onAction: (action: "approve" | "reject" | "offline", comment: string) => Promise<void>;
}

export function ClubReviewDialog({
  open,
  onOpenChange,
  contentTitle,
  contentStatus,
  clubName,
  authorName,
  content,
  onAction,
}: ClubReviewDialogProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) setComment("");
    onOpenChange(nextOpen);
  }

  async function handleAction(action: "approve" | "reject" | "offline") {
    if (action === "reject" && !comment.trim()) {
      return;
    }
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contentTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            所属社团：{clubName} ｜ 作者：{authorName}
          </p>
          <div className="rounded-lg border border-border/60 p-4">
            <RichTextContent html={content} />
          </div>
        </div>

        {contentStatus === "pending_review" || contentStatus === "published" ? (
          <div className="space-y-1.5">
            <Label htmlFor="club-review-comment">
              审核意见{contentStatus === "pending_review" ? "（驳回时必填）" : "（可选）"}
            </Label>
            <Textarea
              id="club-review-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="填写驳回原因或备注"
            />
          </div>
        ) : null}

        <DialogFooter>
          {contentStatus === "pending_review" ? (
            <>
              <Button
                variant="destructive"
                disabled={submitting || !comment.trim()}
                onClick={() => handleAction("reject")}
              >
                驳回
              </Button>
              <Button disabled={submitting} onClick={() => handleAction("approve")}>
                通过
              </Button>
            </>
          ) : null}
          {contentStatus === "published" ? (
            <Button
              variant="destructive"
              disabled={submitting}
              onClick={() => handleAction("offline")}
            >
              强制下线
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
