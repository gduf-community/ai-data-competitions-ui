"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Send, Trash2, Undo2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { requestJSON } from "@/lib/http-client";
import type { ExperiencePostRow } from "@/lib/contracts/profiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "outline" | "destructive" }
> = {
  draft: { label: "草稿", variant: "secondary" },
  pending_review: { label: "待审核", variant: "default" },
  published: { label: "已发布", variant: "outline" },
  offline: { label: "已下线", variant: "destructive" },
};

interface ExperiencePostListProps {
  posts: ExperiencePostRow[];
}

export function ExperiencePostList({ posts }: ExperiencePostListProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleAction(
    postId: string,
    action: "submit" | "withdraw" | "delete",
  ) {
    setLoading(postId);
    try {
      const url =
        action === "delete"
          ? `/api/me/experience-posts/${postId}`
          : `/api/me/experience-posts/${postId}/${action}`;
      const method = action === "delete" ? "DELETE" : "POST";
      await requestJSON(url, { method, expect: "empty" });
      toast.success(
        action === "submit"
          ? "已提交审核"
          : action === "withdraw"
            ? "已撤回"
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
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">经验文章</h2>
        <p className="text-sm text-muted-foreground">
          经验文章需由超级管理员邀请并绑定比赛后才会出现在这里。个人不能自行新建，但可以编辑、提交、撤回和删除自己的文章。
        </p>
      </div>

      {posts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              当前暂无受邀文章。超级管理员发出邀请后，会自动生成一篇待填写草稿。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => {
            const cfg = statusConfig[post.status] ?? statusConfig.draft;
            const isLoading = loading === post.id;
            return (
              <Card key={post.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {post.title}
                      </h3>
                      <Badge variant={cfg.variant} className="shrink-0 text-xs">
                        {cfg.label}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {post.competitionTitle ? <span>{post.competitionTitle}</span> : null}
                      {post.awardLevel ? <span>{post.awardLevel}</span> : null}
                      <span>
                        更新于 {new Date(post.updatedAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                    {post.reviewComment && post.status === "draft" ? (
                      <p className="text-xs text-red-500">
                        审核意见：{post.reviewComment}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {(post.status === "draft" || post.status === "offline") && (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/me/experiences/${post.id}/edit`}>
                          <Pencil className="mr-1 size-3.5" />
                          编辑
                        </Link>
                      </Button>
                    )}
                    {post.status === "draft" ? (
                      <Button
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleAction(post.id, "submit")}
                      >
                        <Send className="mr-1 size-3.5" />
                        提交审核
                      </Button>
                    ) : null}
                    {post.status !== "draft" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isLoading}
                        onClick={() => handleAction(post.id, "withdraw")}
                      >
                        <Undo2 className="mr-1 size-3.5" />
                        撤回
                      </Button>
                    ) : null}
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={isLoading}
                      onClick={() => handleAction(post.id, "delete")}
                    >
                      <Trash2 className="mr-1 size-3.5" />
                      删除
                    </Button>
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
