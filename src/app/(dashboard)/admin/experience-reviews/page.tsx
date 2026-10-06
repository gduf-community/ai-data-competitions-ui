"use client";

import { useEffect, useState } from "react";
import { Plus } from "lucide-react";

import {
  ExperienceInviteDialog,
  type ExperienceInviteFormData,
} from "@/components/admin/experience-invite-dialog";
import { ExperienceReviewDialog } from "@/components/admin/experience-review-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/i18n/toast";

interface ExperiencePost {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  title: string;
  content: string;
  competitionTitle: string | null;
  awardLevel: string | null;
  status: string;
  updatedAt: string;
}

interface ExperiencePostPayload {
  data?: ExperiencePost[];
  permissions?: {
    canManage?: boolean;
  };
  message?: string;
}

const statusLabels: Record<string, string> = {
  draft: "草稿",
  pending_review: "待审核",
  published: "已发布",
  offline: "已下线",
  all: "全部",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  draft: "secondary",
  pending_review: "default",
  published: "outline",
  offline: "destructive",
};

const statusOptions: Array<{ value: string; label: string }> = [
  { value: "pending_review", label: "待审核" },
  { value: "published", label: "已发布" },
  { value: "draft", label: "草稿" },
  { value: "offline", label: "已下线" },
  { value: "all", label: "全部" },
];

function getNameInitial(name: string) {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "U";
}

function buildPreview(content: string) {
  const plain = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) {
    return "未填写正文";
  }
  return plain.length > 120 ? `${plain.slice(0, 120)}...` : plain;
}

export default function AdminExperienceReviewsPage() {
  const [posts, setPosts] = useState<ExperiencePost[]>([]);
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending_review");
  const [reviewTarget, setReviewTarget] = useState<ExperiencePost | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  async function fetchPostsData(status: string): Promise<ExperiencePost[]> {
    const params = status !== "all" ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/experience-posts${params}`);
    const payload = (await res.json()) as ExperiencePostPayload;
    if (!res.ok) {
      throw new Error(payload.message ?? "获取文章列表失败");
    }

    setCanManage(payload.permissions?.canManage === true);
    return payload.data ?? [];
  }

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await fetchPostsData(statusFilter);
        if (!cancelled) {
          setPosts(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "获取文章列表失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  async function reloadPosts() {
    setLoading(true);
    try {
      const nextPosts = await fetchPostsData(statusFilter);
      setPosts(nextPosts);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取文章列表失败");
    } finally {
      setLoading(false);
    }
  }

  function handleStatusFilterChange(value: string) {
    if (value === statusFilter) {
      return;
    }
    setLoading(true);
    setStatusFilter(value);
  }

  async function handleReview(
    action: "approve" | "reject" | "offline",
    comment: string,
  ) {
    if (!reviewTarget) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin/experience-posts/${reviewTarget.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, comment: comment || undefined }),
        },
      );
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(payload.message ?? "操作失败");
      }

      toast.success(
        action === "approve"
          ? "已通过经验文章审核"
          : action === "reject"
            ? "已驳回经验文章"
            : "已下线经验文章",
      );
      setReviewTarget(null);
      await reloadPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function handleInvite(data: ExperienceInviteFormData) {
    try {
      const res = await fetch("/api/admin/experience-posts/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
      };

      if (!res.ok) {
        throw new Error(payload.message ?? "邀请失败");
      }

      toast.success("已发送经验文章邀请");
      setInviteOpen(false);
      await reloadPosts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "邀请失败");
      throw error;
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="经验文章审核"
          title="经验文章审核"
          description="查看经验文章投稿与当前状态；高权限账号可发起邀请、审核发布或强制下线文章。"
          actions={
            canManage ? (
              <Button size="sm" onClick={() => setInviteOpen(true)}>
                <Plus className="mr-1 size-4" />
                发起邀请
              </Button>
            ) : null
          }
        />

        {canManage === false ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              当前账号为只读后台权限，可查看经验文章审核数据，但不可发起邀请、审核或下线文章。
            </CardContent>
          </Card>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((option) => (
            <Button
              key={option.value}
              type="button"
              size="sm"
              variant={statusFilter === option.value ? "default" : "outline"}
              onClick={() => handleStatusFilterChange(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : posts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              暂无经验文章
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{post.title}</span>
                      <Badge variant={statusVariants[post.status] ?? "secondary"}>
                        {statusLabels[post.status] ?? post.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {post.competitionTitle ?? "未关联比赛"}
                      {post.awardLevel ? ` | ${post.awardLevel}` : ""}
                      {" | "}
                      {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                    </p>
                    <p className="line-clamp-2 text-sm text-slate-600">
                      {buildPreview(post.content)}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="size-6 border border-border/70">
                        <AvatarImage
                          src={post.userImage ?? undefined}
                          alt={`${post.userName} 头像`}
                        />
                        <AvatarFallback className="text-[10px]">
                          {getNameInitial(post.userName)}
                        </AvatarFallback>
                      </Avatar>
                      <span>投稿人：{post.userName}</span>
                    </div>
                  </div>

                  {canManage && (post.status === "pending_review" || post.status === "published") ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setReviewTarget(post)}
                    >
                      {post.status === "pending_review" ? "审核" : "管理"}
                    </Button>
                  ) : (
                    <div className="text-xs text-muted-foreground">只读模式</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <ExperienceReviewDialog
          key={reviewTarget?.id ?? "empty"}
          open={Boolean(reviewTarget)}
          onOpenChange={(open) => {
            if (!open) {
              setReviewTarget(null);
            }
          }}
          postTitle={reviewTarget?.title ?? ""}
          postStatus={reviewTarget?.status ?? ""}
          postAuthor={reviewTarget?.userName ?? ""}
          competitionTitle={reviewTarget?.competitionTitle}
          awardLevel={reviewTarget?.awardLevel}
          content={reviewTarget?.content ?? ""}
          onAction={handleReview}
        />

        <ExperienceInviteDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onInvite={handleInvite}
        />
      </div>
    </div>
  );
}
