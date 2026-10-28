"use client";

import { useEffect, useState } from "react";
import { toast } from "@/lib/i18n/toast";

import { AwardReviewDialog } from "@/components/admin/award-review-dialog";
import { MultiSelectFilter } from "@/components/admin/multi-select-filter";
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
import { AWARD_LEVEL_OPTIONS, AWARD_SCOPE_OPTIONS, displayAwardLevel } from "@/lib/award-level";
import { LoadingStatus } from "@/components/shared/euler-bridge-loader";

interface AwardCertificate {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  competitionId: string;
  competitionTitle: string;
  awardScope: string | null;
  awardLevel: string | null;
  awardLevelText: string | null;
  awardYear: number | null;
  imageUrl: string;
  imageLargeUrl: string | null;
  status: string;
  showOnHomepage: boolean;
  reviewComment: string | null;
  displayOrder: number;
  createdAt: string;
  memberNames: string[];
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

function buildPageItems(pageCount: number, currentPage: number) {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, pageCount, currentPage]);

  if (currentPage > 1) pages.add(currentPage - 1);
  if (currentPage < pageCount) pages.add(currentPage + 1);

  if (currentPage <= 3) {
    pages.add(2);
    pages.add(3);
    pages.add(4);
  }

  if (currentPage >= pageCount - 2) {
    pages.add(pageCount - 1);
    pages.add(pageCount - 2);
    pages.add(pageCount - 3);
  }

  const sortedPages = [...pages]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);

  const items: Array<number | "ellipsis"> = [];
  for (const page of sortedPages) {
    const lastItem = items[items.length - 1];
    if (typeof lastItem === "number" && page - lastItem > 1) {
      items.push("ellipsis");
    }
    items.push(page);
  }

  return items;
}

export default function AdminAwardReviewsPage() {
  const [awards, setAwards] = useState<AwardCertificate[]>([]);
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [reviewTarget, setReviewTarget] = useState<AwardCertificate | null>(null);
  const [savingShowcaseId, setSavingShowcaseId] = useState<string | null>(null);
  const [deletingAwardId, setDeletingAwardId] = useState<string | null>(null);
  const [scopeFilters, setScopeFilters] = useState<string[]>([]);
  const [levelFilters, setLevelFilters] = useState<string[]>([]);
  const [yearFilters, setYearFilters] = useState<string[]>([]);
  const [competitionFilters, setCompetitionFilters] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [gridColumns, setGridColumns] = useState(3);
  const [memberSearch, setMemberSearch] = useState("");

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

  // 根据窗口宽度确定网格列数（与 sm:grid-cols-2 / lg:grid-cols-3 对齐），
  // 以便每页固定显示 3 行。
  useEffect(() => {
    function updateColumns() {
      const width = window.innerWidth;
      setGridColumns(width >= 1024 ? 3 : width >= 640 ? 2 : 1);
    }
    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  function handleStatusFilterChange(value: string) {
    if (value === statusFilter) return;
    setLoading(true);
    setStatusFilter(value);
    // 比赛和年份选项来自当前状态的数据，切换时清除以免隐藏筛选继续生效。
    setCompetitionFilters([]);
    setYearFilters([]);
    setPage(1);
  }

  function handleScopeFiltersChange(next: string[]) {
    setScopeFilters(next);
    setPage(1);
  }

  function handleLevelFiltersChange(next: string[]) {
    setLevelFilters(next);
    setPage(1);
  }

  function handleYearFiltersChange(next: string[]) {
    setYearFilters(next);
    setPage(1);
  }

  function handleCompetitionFiltersChange(next: string[]) {
    setCompetitionFilters(next);
    setPage(1);
  }

  function handleMemberSearchChange(value: string) {
    setMemberSearch(value);
    setPage(1);
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

  const competitionOptions = Array.from(
    new Map(
      awards.map((award) => [award.competitionId, award.competitionTitle] as const),
    ),
    ([competitionId, competitionTitle]) => ({
      value: competitionId,
      label: competitionTitle,
    }),
  );

  const scopeOptions = AWARD_SCOPE_OPTIONS.map((scope) => ({
    value: scope,
    label: scope,
  }));

  const levelOptions = Array.from(new Set([
    ...AWARD_LEVEL_OPTIONS,
    ...awards.flatMap((award) => award.awardLevel ? [award.awardLevel] : []),
  ])).map((level) => ({
    value: level,
    label: level,
  }));

  const yearOptions = Array.from(
    new Set(
      awards
        .map((award) => award.awardYear)
        .filter((year): year is number => year != null),
    ),
  )
    .sort((left, right) => right - left)
    .map((year) => ({ value: String(year), label: `${year} 年` }));

  const visibleAwards = awards.filter((award) => {
    if (
      scopeFilters.length > 0 &&
      !scopeFilters.includes(award.awardScope ?? "")
    ) {
      return false;
    }
    if (
      levelFilters.length > 0 &&
      !levelFilters.includes(award.awardLevel ?? "")
    ) {
      return false;
    }
    if (
      yearFilters.length > 0 &&
      (award.awardYear == null || !yearFilters.includes(String(award.awardYear)))
    ) {
      return false;
    }
    if (
      competitionFilters.length > 0 &&
      !competitionFilters.includes(award.competitionId)
    ) {
      return false;
    }
    const keyword = memberSearch.trim().toLowerCase();
    if (
      keyword &&
      ![...award.memberNames, award.userName].some((name) =>
        name.toLowerCase().includes(keyword),
      )
    ) {
      return false;
    }
    return true;
  });

  const pageSize = gridColumns * 3;
  const totalPages = Math.max(1, Math.ceil(visibleAwards.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageAwards = visibleAwards.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const pageItems = buildPageItems(totalPages, currentPage);

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="奖状管理"
          title="奖状管理"
          description="审核学生上传的获奖证书，并单独决定哪些奖状可以展示到首页作品墙。首页最多建议维护 20 张以内。"
        />

        {canManage === false ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              当前账号为只读后台权限，可查看奖状管理数据，但不可执行审核、撤回或首页展示设置。
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

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              {"<"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(1)}
              disabled={currentPage <= 1}
            >
              {"<<"}
            </Button>
            {pageItems.map((item, index) =>
              item === "ellipsis" ? (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-sm text-muted-foreground"
                >
                  ...
                </span>
              ) : (
                <Button
                  key={item}
                  variant={item === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(item)}
                >
                  {item}
                </Button>
              ),
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              {">"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(totalPages)}
              disabled={currentPage >= totalPages}
            >
              {">>"}
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Input
            value={memberSearch}
            onChange={(event) => handleMemberSearchChange(event.target.value)}
            placeholder="搜索参赛成员"
            className="w-full"
          />

          <MultiSelectFilter
            value={competitionFilters}
            options={competitionOptions}
            placeholder="选择比赛"
            onChange={handleCompetitionFiltersChange}
            className="w-full"
          />

          <div className="grid grid-cols-2 gap-2 lg:grid-cols-3">
            <MultiSelectFilter
              value={scopeFilters}
              options={scopeOptions}
              placeholder="选择范围"
              onChange={handleScopeFiltersChange}
              className="w-full"
            />
            <MultiSelectFilter
              value={levelFilters}
              options={levelOptions}
              placeholder="选择等级"
              onChange={handleLevelFiltersChange}
              className="w-full"
            />
            <MultiSelectFilter
              value={yearFilters}
              options={yearOptions}
              placeholder="选择年份"
              onChange={handleYearFiltersChange}
              className="w-full"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : visibleAwards.length === 0 ? (
          <p className="text-sm text-muted-foreground"><LoadingStatus>加载中...</LoadingStatus></p>
        ) : awards.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              暂无奖状
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pageAwards.map((award) => {
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
                  <CardContent className="mt-auto space-y-4 p-4">
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
                      {award.awardYear != null ? (
                        <p>年份：{award.awardYear}</p>
                      ) : null}
                      {award.awardScope ? (
                        <p>范围：{award.awardScope}</p>
                      ) : null}
                      {award.awardLevel ? (
                        <p>等级：{award.awardLevel}</p>
                      ) : null}
                      {displayAwardLevel(award) ? (
                        <p>
                          显示奖项等级：{displayAwardLevel(award)}
                        </p>
                      ) : null}

                      <p className="line-clamp-2 break-words">
                        参赛成员：
                        {award.memberNames.length > 0
                          ? award.memberNames.join("、")
                          : award.userName}
                      </p>
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

                        <Button loading={isSavingShowcase}
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
                        <Button loading={isDeletingAward}
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
                      <Button loading={isDeletingAward}
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
          awardScope={reviewTarget?.awardScope ?? null}
          awardLevel={reviewTarget?.awardLevel ?? null}
          displayLevel={displayAwardLevel(reviewTarget ?? {})}
          awardYear={reviewTarget?.awardYear ?? null}
          applicantName={reviewTarget?.userName ?? ""}
          memberNames={reviewTarget?.memberNames ?? []}
          imageUrl={reviewTarget?.imageLargeUrl ?? reviewTarget?.imageUrl ?? ""}
          onAction={handleReview}
        />
      </div>
    </div>
  );
}
