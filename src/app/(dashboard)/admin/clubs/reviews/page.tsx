"use client";

import { useCallback, useEffect, useState } from "react";

import { ClubReviewDialog } from "@/components/admin/club-review-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

interface ClubContentForReview {
  id: string;
  clubId: string;
  clubName: string;
  clubSlug: string;
  authorName: string;
  contentType: string;
  title: string;
  content: string;
  status: string;
  reviewComment: string | null;
  updatedAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  pending_review: "待审核",
  published: "已发布",
  rejected: "已驳回",
  offline: "已下线",
  archived: "已归档",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  pending_review: "default",
  published: "outline",
  rejected: "destructive",
  offline: "destructive",
  archived: "secondary",
};

const TYPE_LABEL: Record<string, string> = {
  recruitment: "招新信息",
  activity: "近期活动",
  announcement: "社团公告",
  event_summary: "往期活动",
};

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "pending_review", label: "待审核" },
  { value: "published", label: "已发布" },
  { value: "rejected", label: "已驳回" },
  { value: "offline", label: "已下线" },
  { value: "archived", label: "已归档" },
];

export default function AdminClubReviewsPage() {
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [items, setItems] = useState<ClubContentForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState<ClubContentForReview | null>(
    null,
  );
  const [archivingId, setArchivingId] = useState<string | null>(null);

  const load = useCallback(
    async (status: string) => {
      try {
        const res = await fetch(`/api/admin/clubs/contents?status=${status}`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.message ?? "获取待审核内容失败");
        }
        setItems(body.data ?? []);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "获取失败");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void load(statusFilter);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [statusFilter, load]);

  async function handleReviewAction(
    action: "approve" | "reject" | "offline",
    comment: string,
  ) {
    if (!reviewTarget) return;
    try {
      const url =
        action === "offline"
          ? `/api/admin/clubs/contents/${reviewTarget.id}/offline`
          : `/api/admin/clubs/contents/${reviewTarget.id}/review`;
      const body =
        action === "offline"
          ? { comment: comment || undefined }
          : { action, comment: comment || undefined };

      const res = await fetchWithCsrf(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.message ?? "操作失败");
      }
      toast.success(
        action === "approve" ? "已通过审核" : action === "reject" ? "已驳回" : "已强制下线",
      );
      setReviewTarget(null);
      setLoading(true);
      await load(statusFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function handleArchive(id: string) {
    setArchivingId(id);
    try {
      const res = await fetchWithCsrf(`/api/admin/clubs/contents/${id}/archive`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message ?? "归档失败");
      }
      toast.success("已归档");
      setLoading(true);
      await load(statusFilter);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "归档失败");
    } finally {
      setArchivingId(null);
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="社团管理"
          title="社团内容审核"
          description="审核各社团提交的招新信息、活动与公告；已发布内容如有问题可强制下线。"
        />

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_OPTIONS.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? "default" : "outline"}
              onClick={() => {
                if (option.value === statusFilter) return;
                setLoading(true);
                setStatusFilter(option.value);
              }}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              暂无内容
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {TYPE_LABEL[item.contentType] ?? item.contentType}
                      </Badge>
                      <span className="truncate font-medium">{item.title}</span>
                      <Badge variant={STATUS_VARIANT[item.status] ?? "secondary"}>
                        {STATUS_LABEL[item.status] ?? item.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {item.clubName} ｜ 作者：{item.authorName} ｜{" "}
                      {new Date(item.updatedAt).toLocaleString("zh-CN")}
                    </p>
                    {item.status === "rejected" && item.reviewComment ? (
                      <p className="text-xs text-red-500">
                        驳回原因：{item.reviewComment}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    {item.status === "pending_review" ||
                    item.status === "published" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReviewTarget(item)}
                      >
                        {item.status === "pending_review" ? "审核" : "管理"}
                      </Button>
                    ) : null}
                    {item.status === "offline" || item.status === "rejected" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={archivingId === item.id}
                        onClick={() => handleArchive(item.id)}
                      >
                        归档
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ClubReviewDialog
          key={reviewTarget?.id ?? "empty"}
          open={Boolean(reviewTarget)}
          onOpenChange={(open) => {
            if (!open) setReviewTarget(null);
          }}
          contentTitle={reviewTarget?.title ?? ""}
          contentStatus={reviewTarget?.status ?? ""}
          clubName={reviewTarget?.clubName ?? ""}
          authorName={reviewTarget?.authorName ?? ""}
          content={reviewTarget?.content ?? ""}
          onAction={handleReviewAction}
        />
      </div>
    </div>
  );
}
