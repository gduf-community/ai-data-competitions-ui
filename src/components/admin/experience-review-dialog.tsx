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
import { Textarea } from "@/components/ui/textarea";

interface ExperienceReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postTitle: string;
  postStatus: string;
  postAuthor: string;
  competitionTitle?: string | null;
  awardLevel?: string | null;
  content: string;
  onAction: (
    action: "approve" | "reject" | "offline",
    comment: string,
  ) => Promise<void>;
}

export function ExperienceReviewDialog({
  open,
  onOpenChange,
  postTitle,
  postStatus,
  postAuthor,
  competitionTitle,
  awardLevel,
  content,
  onAction,
}: ExperienceReviewDialogProps) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setComment("");
    }
    onOpenChange(nextOpen);
  }

  async function handleAction(action: "approve" | "reject" | "offline") {
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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>审核经验文章</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-900">{postTitle}</p>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              <span>作者：{postAuthor}</span>
              {competitionTitle ? <span>比赛：{competitionTitle}</span> : null}
              {awardLevel ? <span>获奖：{awardLevel}</span> : null}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/20 p-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              文章正文
            </p>
            <div className="max-h-80 overflow-y-auto">
              {content || "未填写正文"}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="comment">审核意见</Label>
            <Textarea
              id="comment"
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
          {postStatus === "pending_review" && (
            <>
              <Button
                variant="destructive"
                onClick={() => handleAction("reject")}
                disabled={submitting}
              >
                驳回
              </Button>
              <Button
                onClick={() => handleAction("approve")}
                disabled={submitting}
              >
                通过
              </Button>
            </>
          )}
          {postStatus === "published" && (
            <Button
              variant="destructive"
              onClick={() => handleAction("offline")}
              disabled={submitting}
            >
              强制下线
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
