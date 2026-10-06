"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";

import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationRecord } from "@/lib/types";

interface ApplicationDetail {
  id: string;
  competitionId: string;
  competitionTitle: string;
  applicantName: string;
  college: string;
  major: string;
  grade: string;
  submittedAt: string;
  mode: ApplicationRecord["mode"];
  status: ApplicationRecord["status"];
  reviewer: string;
  note: string;
  selectedSubTrack: string | null;
  statement: string | null;
  teamName: string | null;
  teamMembers: Array<{
    name: string;
    college: string;
    major: string;
    grade: string;
  }>;
  advisors?: Array<{
    name: string;
    college: string;
    major: string;
  }> | null;
}

interface ApplicationReviewDialogProps {
  application: ApplicationRecord;
  onUpdated?: () => void;
}

export function ApplicationReviewDialog({
  application,
  onUpdated,
}: ApplicationReviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(application.note || "");
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setNote(application.note || "");
    if (!nextOpen) {
      setDetail(null);
    }
  };

  useEffect(() => {
    if (!open || detail) return;

    let cancelled = false;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const response = await fetch(`/api/admin/applications/${application.id}`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const payload = (await response.json()) as { application?: ApplicationDetail };
        if (!cancelled) {
          setDetail(payload.application ?? null);
        }
      } catch {
        // Silently fail, detail is optional
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    };
    void fetchDetail();
    return () => { cancelled = true; };
  }, [open, application.id, detail]);

  const submitReview = async (
    action: "approve" | "reject" | "withdraw" | "cancel",
    fallbackNote: string,
  ) => {
    setLoadingAction(action);
    try {
      const response = await fetchWithCsrf(`/api/admin/applications/${application.id}/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          comment: note.trim() || fallbackNote,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "审核操作失败");
      }

      const actionLabel =
        action === "approve"
          ? "审核通过"
          : action === "reject"
            ? "驳回补充"
            : action === "withdraw"
              ? "撤回审核"
              : "取消报名";
      toast.success(`${actionLabel}已提交`);
      setOpen(false);
      onUpdated?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "审核操作失败";
      toast.error(message);
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setNote(application.note || "")}
        >
          审核
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>审核报名记录</DialogTitle>
          <DialogDescription>
            {application.competitionTitle} · {application.applicantName}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 text-sm max-h-[60vh] overflow-y-auto">
          <div className="grid gap-3 rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 md:grid-cols-2">
            <div>
              <p className="text-muted-foreground">学院 / 专业</p>
              <p className="font-medium">
                {application.college} · {application.major}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">年级</p>
              <p className="font-medium">{application.grade}</p>
            </div>
            <div>
              <p className="text-muted-foreground">提交时间</p>
              <p className="font-medium">{application.submittedAt}</p>
            </div>
            <div>
              <p className="text-muted-foreground">报名模式</p>
              <p className="font-medium">
                {application.mode === "team" ? "团队报名" : "个人报名"}
              </p>
            </div>
          </div>

          {loadingDetail ? (
            <p className="text-xs text-muted-foreground">加载报名详情中...</p>
          ) : detail ? (
            <>
              {detail.selectedSubTrack ? (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4">
                  <p className="text-muted-foreground">所选子赛道</p>
                  <p className="font-medium">{detail.selectedSubTrack}</p>
                </div>
              ) : null}

              {detail.teamName && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4">
                  <p className="text-muted-foreground">团队名称</p>
                  <p className="font-medium">{detail.teamName}</p>
                </div>
              )}

              {detail.teamMembers.length > 0 && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4 space-y-3">
                  <p className="text-muted-foreground font-medium">队员信息</p>
                  {detail.teamMembers.map((member, i) => (
                    <div key={i} className="grid gap-1 rounded-lg border border-border/60 p-3 md:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">姓名：</span>
                        <span className="font-medium">{member.name}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">学院：</span>
                        <span className="font-medium">{member.college}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">专业：</span>
                        <span className="font-medium">{member.major}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">年级：</span>
                        <span className="font-medium">{member.grade}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {detail.advisors && detail.advisors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">指导老师</p>
                  {detail.advisors.map((advisor, index) => (
                    <div key={index} className="rounded-lg border border-border/50 p-3">
                      <p className="font-medium">
                        {advisor.name} · {advisor.college} · {advisor.major}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {detail.statement && (
                <div className="rounded-2xl border border-dashed border-border/70 bg-muted/40 p-4">
                  <p className="text-muted-foreground">备注</p>
                  <p className="mt-1 whitespace-pre-wrap font-medium leading-relaxed">
                    {detail.statement}
                  </p>
                </div>
              )}
            </>
          ) : null}

          <Textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            rows={5}
            placeholder="填写审核意见或补充说明"
            aria-label="审核意见"
          />
        </div>

        <DialogFooter className="flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={loadingAction !== null}
            onClick={() => submitReview("reject", "请按要求补充报名材料")}
          >
            {loadingAction === "reject" ? "提交中..." : "驳回补充"}
          </Button>
          <Button
            variant="secondary"
            disabled={loadingAction !== null}
            onClick={() => submitReview("withdraw", "该记录已撤回到学生侧")}
          >
            {loadingAction === "withdraw" ? "提交中..." : "撤回审核"}
          </Button>
          <Button
            variant="outline"
            disabled={loadingAction !== null}
            onClick={() => submitReview("cancel", "该记录已由管理员取消")}
          >
            {loadingAction === "cancel" ? "提交中..." : "取消报名"}
          </Button>
          <Button
            disabled={loadingAction !== null}
            onClick={() => submitReview("approve", "审核通过")}
          >
            {loadingAction === "approve" ? "提交中..." : "审核通过"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
