"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";

import { AwardReviewDialog } from "@/components/admin/award-review-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { DirectUploadImage } from "@/components/shared/direct-upload-image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

interface AwardCertificate {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  competitionId: string;
  competitionTitle: string;
  awardLevel: string | null;
  imageUrl: string;
  imageLargeUrl: string | null;
  status: string;
  showOnHomepage: boolean;
  reviewComment: string | null;
  displayOrder: number;
  createdAt: string;
}

const statusLabels: Record<string, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  all: "全部",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "outline" | "destructive"
> = {
  pending: "default",
  approved: "outline",
  rejected: "destructive",
};

const statusOptions = [
  { value: "pending", label: "待审核" },
  { value: "approved", label: "已通过" },
  { value: "rejected", label: "已驳回" },
  { value: "all", label: "全部" },
];

export default function AdminAwardReviewsPage() {
  const [awards, setAwards] = useState<AwardCertificate[]>([]);
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reviewTarget, setReviewTarget] = useState<AwardCertificate | null>(null);
  const [savingShowcaseId, setSavingShowcaseId] = useState<string | null>(null);
  const [deletingAwardId, setDeletingAwardId] = useState<string | null>(null);

  async function fetchAwards(status: string): Promise<AwardCertificate[]> {
    const params = status !== "all" ? `?status=${status}` : "";
    const res = await fetch(`/api/admin/award-certificates${params}`);
    if (!res.ok) throw new Error("获取奖状列表失败");
    const payload = (await res.json()) as {
      data?: AwardCertificate[];
      permissions?: {
        canManage?: boolean;
      };
    };
    setCanManage(payload.permissions?.canManage === true);
    return payload.data ?? [];
  }

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const data = await fetchAwards(statusFilter);
        if (!cancelled) setAwards(data);
      } catch {
        if (!cancelled) toast.error("获取奖状列表失败");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  function handleStatusFilterChange(value: string) {
    if (value === statusFilter) return;
    setLoading(true);
    setStatusFilter(value);
  }

  function updateAwardLocal(
    id: string,
    patch: Partial<Pick<AwardCertificate, "showOnHomepage" | "displayOrder" | "status">>,
  ) {
    setAwards((current) =>
      current.map((award) => (award.id === id ? { ...award, ...patch } : award)),
    );
  }

  async function refreshAwards() {
    setLoading(true);
    try {
      const data = await fetchAwards(statusFilter);
      setAwards(data);
    } catch {
      toast.error("刷新奖状列表失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleReview(action: "approve" | "reject", comment: string) {
    if (!reviewTarget) return;
    try {
      const res = await fetchWithCsrf(
        `/api/admin/award-certificates/${reviewTarget.id}/review`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, comment: comment || undefined }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "操作失败" }));
        throw new Error(err.message);
      }
      toast.success(action === "approve" ? "奖状已通过审核" : "奖状已驳回");
      setReviewTarget(null);
      await refreshAwards();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function handleShowcaseSave(award: AwardCertificate) {
    setSavingShowcaseId(award.id);
    try {
      const res = await fetchWithCsrf(`/api/admin/award-certificates/${award.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          showOnHomepage: award.showOnHomepage,
          displayOrder: Number.isFinite(award.displayOrder)
            ? Math.max(0, award.displayOrder)
            : 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "保存失败" }));
        throw new Error(err.message);
      }

      toast.success("首页展示设置已更新");
      await refreshAwards();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingShowcaseId(null);
    }
  }

  async function handleDeleteAward(award: AwardCertificate) {
    setDeletingAwardId(award.id);
    try {
      const res = await fetchWithCsrf(`/api/admin/award-certificates/${award.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "撤回失败" }));
        throw new Error(err.message);
      }

      toast.success("奖状已撤回");
      await refreshAwards();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤回失败");
    } finally {
      setDeletingAwardId(null);
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="奖状审核"
          title="奖状审核"
          description="审核学生上传的获奖证书，并单独决定哪些奖状可以展示到首页作品墙。首页最多建议维护 20 张以内。"
        />

        {canManage === false ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              当前账号为只读后台权限，可查看奖状审核数据，但不可执行审核、撤回或首页展示设置。
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
        ) : awards.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              暂无奖状
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {awards.map((award) => {
              const isApproved = award.status === "approved";
              const isSavingShowcase = savingShowcaseId === award.id;
              const isDeletingAward = deletingAwardId === award.id;

              return (
                <Card key={award.id} className="overflow-hidden">
                  <DirectUploadImage
                    src={award.imageUrl}
                    alt={award.competitionTitle}
                    className="aspect-[4/3]"
                    imgClassName="object-cover"
                  />
                  <CardContent className="space-y-4 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {award.competitionTitle}
                      </span>
                      <Badge variant={statusVariants[award.status] ?? "secondary"}>
                        {statusLabels[award.status] ?? award.status}
                      </Badge>
                    </div>

                    <div className="space-y-1 text-xs text-slate-600">
                      <p>比赛 ID：{award.competitionId}</p>
                      {award.awardLevel ? <p>获奖等级：{award.awardLevel}</p> : null}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Avatar className="size-5 border border-border/70">
                        <AvatarImage
                          src={award.userImage ?? undefined}
                          alt={award.userName}
                        />
                        <AvatarFallback className="text-[9px]">
                          {award.userName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <span>{award.userName}</span>
                      <span className="ml-auto">
                        {new Date(award.createdAt).toLocaleDateString("zh-CN")}
                      </span>
                    </div>

                    {award.reviewComment ? (
                      <p className="line-clamp-2 text-xs text-slate-500">
                        审核备注：{award.reviewComment}
                      </p>
                    ) : null}

                    {isApproved ? (
                      <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">
                              首页作品墙展示
                            </p>
                            <p className="text-xs text-muted-foreground">
                              审核通过后仍需手动勾选，避免首页一次性展示全部奖状。
                            </p>
                          </div>
                          <Switch
                            checked={award.showOnHomepage}
                            disabled={!canManage}
                            onCheckedChange={(checked) =>
                              updateAwardLocal(award.id, { showOnHomepage: checked })
                            }
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label htmlFor={`award-order-${award.id}`}>展示顺序</Label>
                          <Input
                            id={`award-order-${award.id}`}
                            type="number"
                            min={0}
                            disabled={!canManage}
                            value={award.displayOrder}
                            onChange={(event) =>
                              updateAwardLocal(award.id, {
                                displayOrder: Number(event.target.value || 0),
                              })
                            }
                          />
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          disabled={isSavingShowcase || !canManage}
                          onClick={() => void handleShowcaseSave(award)}
                        >
                          {isSavingShowcase ? "保存中..." : "保存首页展示设置"}
                        </Button>
                      </div>
                    ) : null}

                    {!canManage ? (
                      <div className="rounded-lg border border-dashed border-border/70 p-3 text-center text-xs text-muted-foreground">
                        只读模式
                      </div>
                    ) : award.status === "pending" ? (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setReviewTarget(award)}
                        >
                          审核
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1"
                          disabled={isDeletingAward}
                          onClick={() => void handleDeleteAward(award)}
                        >
                          {isDeletingAward ? "撤回中..." : "撤回"}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        disabled={isDeletingAward}
                        onClick={() => void handleDeleteAward(award)}
                        >
                          {isDeletingAward ? "撤回中..." : "撤回奖状"}
                        </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <AwardReviewDialog
          key={reviewTarget?.id ?? "empty"}
          open={!!reviewTarget}
          onOpenChange={(open) => {
            if (!open) setReviewTarget(null);
          }}
          awardTitle={reviewTarget?.competitionTitle ?? ""}
          awardLevel={reviewTarget?.awardLevel}
          applicantName={reviewTarget?.userName ?? ""}
          imageUrl={reviewTarget?.imageLargeUrl ?? reviewTarget?.imageUrl ?? ""}
          onAction={handleReview}
        />
      </div>
    </div>
  );
}
