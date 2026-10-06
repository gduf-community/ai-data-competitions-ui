"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Send, Trash2, Undo2, XCircle } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requestJSON } from "@/lib/http-client";
import type { ClubContentRow } from "@/lib/contracts/clubs";

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "草稿", variant: "secondary" },
  pending_review: { label: "待审核", variant: "default" },
  published: { label: "已发布", variant: "outline" },
  rejected: { label: "已驳回", variant: "destructive" },
  offline: { label: "已下线", variant: "destructive" },
  archived: { label: "已归档", variant: "secondary" },
};

const TYPE_LABEL: Record<string, string> = {
  recruitment: "招新信息",
  activity: "近期活动",
  announcement: "社团公告",
  event_summary: "往期活动",
};

const STATUS_FILTERS: Array<{ value: string; label: string }> = [
  { value: "all", label: "全部" },
  { value: "draft", label: "草稿" },
  { value: "pending_review", label: "待审核" },
  { value: "published", label: "已发布" },
  { value: "rejected", label: "已驳回" },
  { value: "offline", label: "已下线" },
  { value: "archived", label: "已归档" },
];

interface ClubContentManageListProps {
  clubId: string;
  contents: ClubContentRow[];
}

export function ClubContentManageList({
  clubId,
  contents,
}: ClubContentManageListProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (statusFilter === "all") return contents;
    return contents.filter((item) => item.status === statusFilter);
  }, [contents, statusFilter]);

  async function handleAction(
    contentId: string,
    action: "submit" | "withdraw" | "offline" | "delete",
  ) {
    setLoading(contentId);
    try {
      const url =
        action === "delete"
          ? `/api/me/clubs/${clubId}/contents/${contentId}`
          : `/api/me/clubs/${clubId}/contents/${contentId}/${action}`;
      const method = action === "delete" ? "DELETE" : "POST";
      await requestJSON(url, { method, expect: "empty" });
      toast.success(
        action === "submit"
          ? "已提交审核"
          : action === "withdraw"
            ? "已撤回"
            : action === "offline"
              ? "已下线"
              : "已删除",
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((option) => (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant={statusFilter === option.value ? "default" : "outline"}
            onClick={() => setStatusFilter(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            暂无内容
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.draft;
            const isLoading = loading === item.id;
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {TYPE_LABEL[item.contentType] ?? item.contentType}
                      </Badge>
                      <h3 className="truncate text-sm font-semibold">
                        {item.title}
                      </h3>
                      <Badge variant={cfg.variant} className="shrink-0 text-xs">
                        {cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      更新于 {new Date(item.updatedAt).toLocaleString("zh-CN")}
                    </p>
                    {item.status === "rejected" && item.reviewComment ? (
                      <p className="text-xs text-red-500">
                        驳回原因：{item.reviewComment}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {(item.status === "draft" ||
                      item.status === "rejected" ||
                      item.status === "offline") && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/me/clubs/${clubId}/contents/${item.id}/edit`}>
                          <Pencil className="mr-1 size-3.5" />
                          编辑
                        </Link>
                      </Button>
                    )}
                    {item.status === "draft" ? (
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleAction(item.id, "submit")}
                      >
                        <Send className="mr-1 size-3.5" />
                        提交审核
                      </Button>
                    ) : null}
                    {item.status === "pending_review" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleAction(item.id, "withdraw")}
                      >
                        <Undo2 className="mr-1 size-3.5" />
                        撤回
                      </Button>
                    ) : null}
                    {item.status === "published" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleAction(item.id, "offline")}
                      >
                        <XCircle className="mr-1 size-3.5" />
                        下线
                      </Button>
                    ) : null}
                    {(item.status === "draft" || item.status === "offline") && (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleAction(item.id, "delete")}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        删除
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
