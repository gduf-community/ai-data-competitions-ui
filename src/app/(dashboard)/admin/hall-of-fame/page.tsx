"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Check,
  ExternalLink,
  EyeOff,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Trash2,
} from "lucide-react";

import { HallOfFameEditDialog } from "@/components/admin/hall-of-fame-edit-dialog";
import { AdminHallOfFameMilestoneHistory } from "@/components/admin/hall-of-fame-milestone-history";
import {
  buildHallOfFameUpdatePayload,
  defaultAdminHallOfFameFilters,
  filterAdminHallOfFameEntries,
  formatAdminDateTime,
  formatAdminHallOfFameLevelLabel,
  formatAdminInviteStatusLabel,
  formatAdminMemberStatusLabel,
  hasActiveAdminHallOfFameFilters,
  parseAdminRequestError,
  resolveAdminEntryDisplayName,
  type AdminHallOfFameFilters,
} from "@/components/admin/hall-of-fame-helpers";
import { HallOfFamePhotoRequestsTab } from "@/components/admin/hall-of-fame-photo-requests-tab";
import { HallOfFamePromoteDialog } from "@/components/admin/hall-of-fame-promote-dialog";
import { LoadingStatus } from "@/components/shared/euler-bridge-loader";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminHallOfFameEntrySchema,
  adminHallOfFameListResponseSchema,
  adminHallOfFamePhotoRequestsResponseSchema,
  type AdminHallOfFameEntry,
  type HallOfFameStatus,
} from "@/lib/contracts/profiles";
import {
  HALL_OF_FAME_LEVEL_CONFIG,
  HALL_OF_FAME_LEVEL_ORDER,
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  HALL_OF_FAME_PHOTO_REVIEW_LABELS,
  HALL_OF_FAME_STATUS_LABELS,
} from "@/lib/hall-of-fame";
import { isAbortError, requestJSON } from "@/lib/http-client";
import { toast } from "@/lib/i18n/toast";

const statusVariants: Record<
  HallOfFameStatus,
  "default" | "secondary" | "destructive"
> = {
  invited: "secondary",
  candidate: "secondary",
  active: "default",
  hidden: "destructive",
};

export default function AdminHallOfFamePage() {
  const [entries, setEntries] = useState<AdminHallOfFameEntry[]>([]);
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [filters, setFilters] = useState<AdminHallOfFameFilters>(
    defaultAdminHallOfFameFilters,
  );
  const [busyEntryId, setBusyEntryId] = useState<string | null>(null);
  const [tab, setTab] = useState("members");
  const [keyword, setKeyword] = useState("");
  const [sortBy, setSortBy] = useState<"display" | "updated">("display");
  const [pendingPhotoCount, setPendingPhotoCount] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminHallOfFameEntry | null>(null);

  const [promoteOpen, setPromoteOpen] = useState(false);
  const [promoting, setPromoting] = useState<AdminHallOfFameEntry | null>(null);

  const fetchEntries = useCallback(async (signal?: AbortSignal) => {
    const rawPayload = await requestJSON<unknown>("/api/admin/hall-of-fame", {
      cache: "no-store",
      signal,
    });
    const parsed = adminHallOfFameListResponseSchema.safeParse(rawPayload);
    if (!parsed.success) {
      throw new Error("获取名人堂列表格式异常，请稍后重试。");
    }
    return parsed.data;
  }, []);

  const refreshPendingPhotoCount = useCallback(async () => {
    try {
      const raw = await requestJSON<unknown>(
        "/api/admin/hall-of-fame/photo-requests?status=pending&pageSize=1",
        { cache: "no-store" },
      );
      const parsed = adminHallOfFamePhotoRequestsResponseSchema.safeParse(raw);
      if (parsed.success) {
        setPendingPhotoCount(parsed.data.total ?? parsed.data.data.length);
      }
    } catch {
      // 角标只是增强信息，失败不阻断成员管理。
    }
  }, []);

  const reloadEntries = useCallback(async () => {
    setLoading(true);
    setListError("");
    try {
      const payload = await fetchEntries();
      setCanManage(payload.permissions?.canManage === true);
      setEntries(payload.data);
      void refreshPendingPhotoCount();
    } catch (error) {
      if (isAbortError(error)) return;
      const parsedError = parseAdminRequestError(error, "获取名人堂列表失败");
      if (parsedError.isForbidden) {
        setCanManage(false);
      }
      setListError(parsedError.message);
      toast.error(parsedError.message);
    } finally {
      setLoading(false);
    }
  }, [fetchEntries, refreshPendingPhotoCount]);

  useEffect(() => {
    const controller = new AbortController();

    async function run() {
      setLoading(true);
      setListError("");
      try {
        const payload = await fetchEntries(controller.signal);
        if (controller.signal.aborted) return;
        setCanManage(payload.permissions?.canManage === true);
        setEntries(payload.data);
        void refreshPendingPhotoCount();
      } catch (error) {
        if (controller.signal.aborted || isAbortError(error)) return;
        const parsedError = parseAdminRequestError(error, "获取名人堂列表失败");
        if (parsedError.isForbidden) {
          setCanManage(false);
        }
        setListError(parsedError.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void run();
    return () => controller.abort();
  }, [fetchEntries, refreshPendingPhotoCount]);

  const handleRefreshSingleEntry = useCallback(
    async (entryId: string): Promise<AdminHallOfFameEntry | null> => {
      try {
        const rawPayload = await requestJSON<{ data?: unknown }>(
          `/api/admin/hall-of-fame/${encodeURIComponent(entryId)}`,
          { cache: "no-store" },
        );
        const parsed = adminHallOfFameEntrySchema.safeParse(
          rawPayload && typeof rawPayload === "object" && "data" in rawPayload
            ? rawPayload.data
            : rawPayload,
        );
        if (parsed.success) {
          setEntries((current) =>
            current.map((item) => (item.id === entryId ? parsed.data : item)),
          );
          return parsed.data;
        }
      } catch {
        // 回退到重拉列表以获取最新条目的状态与修订号。
      }

      const listPayload = await fetchEntries();
      setCanManage(listPayload.permissions?.canManage === true);
      setEntries(listPayload.data);
      return listPayload.data.find((item) => item.id === entryId) ?? null;
    },
    [fetchEntries],
  );

  async function handleWithdrawUnpublished(entry: AdminHallOfFameEntry) {
    if (busyEntryId || canManage !== true) return;
    if (
      !confirm(
        `确定撤回「${resolveAdminEntryDisplayName(entry)}」尚未公开的名人堂邀请吗？撤回后可重新发起邀请。`,
      )
    ) {
      return;
    }

    setBusyEntryId(entry.id);
    try {
      await requestJSON(
        `/api/admin/hall-of-fame/${encodeURIComponent(entry.id)}`,
        {
          method: "DELETE",
          expect: "empty",
        },
      );
      toast.success("已撤回未公开名人堂邀请");
      await reloadEntries();
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "撤回邀请失败");
      if (parsedError.isForbidden) {
        setCanManage(false);
      }
      toast.error(parsedError.message);
      if (parsedError.isConflict) {
        await reloadEntries();
      }
    } finally {
      setBusyEntryId(null);
    }
  }

  async function handlePublish(entry: AdminHallOfFameEntry) {
    if (busyEntryId || canManage !== true) return;
    const displayName = resolveAdminEntryDisplayName(entry);
    if (
      !confirm(
        `确定发布「${displayName}」到名人堂公开展示吗？服务端会核验已通过照片、公开同意与资料完整性。`,
      )
    ) {
      return;
    }

    const payloadResult = buildHallOfFameUpdatePayload({
      expectedRevision: entry.revision ?? 0,
      displayName,
      displayGrade: entry.displayGrade ?? "",
      displayCollege: entry.displayCollege ?? entry.college ?? "",
      displayMajor: entry.displayMajor ?? "",
      memberStatus: entry.memberStatus ?? "serving",
      status: "active",
      displayOrder: entry.displayOrder,
      tag: entry.tag,
      bio: entry.bio,
      adminBio: entry.adminBio ?? "",
    });
    if (!payloadResult.ok) {
      toast.error(payloadResult.message);
      return;
    }

    setBusyEntryId(entry.id);
    try {
      await requestJSON(
        `/api/admin/hall-of-fame/${encodeURIComponent(entry.id)}`,
        {
          method: "PUT",
          json: payloadResult.data,
        },
      );
      toast.success("已发布到名人堂公开展示");
      await reloadEntries();
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "发布名人堂成员失败");
      if (parsedError.isForbidden) {
        setCanManage(false);
      }
      toast.error(parsedError.message);
      if (parsedError.isConflict) {
        await reloadEntries();
      }
    } finally {
      setBusyEntryId(null);
    }
  }

  async function handleArchiveFormalMember(entry: AdminHallOfFameEntry) {
    if (busyEntryId || canManage !== true) return;
    const displayName = resolveAdminEntryDisplayName(entry);
    if (
      !confirm(
        `确定隐藏归档正式成员「${displayName}」吗？隐藏后将不再公开展示，但完整保留其入选与进阶履历记录。`,
      )
    ) {
      return;
    }

    const payloadResult = buildHallOfFameUpdatePayload({
      expectedRevision: entry.revision ?? 0,
      displayName,
      displayGrade: entry.displayGrade ?? "",
      displayCollege: entry.displayCollege ?? entry.college ?? "",
      displayMajor: entry.displayMajor ?? "",
      memberStatus: entry.memberStatus ?? "serving",
      status: "hidden",
      displayOrder: entry.displayOrder,
      tag: entry.tag,
      bio: entry.bio,
      adminBio: entry.adminBio ?? "",
    });
    if (!payloadResult.ok) {
      toast.error(payloadResult.message);
      return;
    }

    setBusyEntryId(entry.id);
    try {
      await requestJSON<unknown>(
        `/api/admin/hall-of-fame/${encodeURIComponent(entry.id)}`,
        {
          method: "PUT",
          json: payloadResult.data,
        },
      );
      toast.success("已隐藏归档该成员（历史履历已保留）");
      await reloadEntries();
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "隐藏归档失败");
      if (parsedError.isForbidden) {
        setCanManage(false);
      }
      toast.error(parsedError.message);
      if (parsedError.isConflict) {
        await reloadEntries();
      }
    } finally {
      setBusyEntryId(null);
    }
  }

  const filteredEntries = filterAdminHallOfFameEntries(entries, filters);
  const visibleEntries = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const searched = normalizedKeyword
      ? filteredEntries.filter((entry) =>
          [
            resolveAdminEntryDisplayName(entry),
            entry.userName,
            entry.college,
            entry.displayCollege,
            entry.tag,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(normalizedKeyword)),
        )
      : filteredEntries;
    return [...searched].sort((left, right) =>
      sortBy === "updated"
        ? new Date(right.updatedAt ?? 0).getTime() - new Date(left.updatedAt ?? 0).getTime()
        : left.displayOrder - right.displayOrder ||
          resolveAdminEntryDisplayName(left).localeCompare(resolveAdminEntryDisplayName(right), "zh-Hans-CN"),
    );
  }, [filteredEntries, keyword, sortBy]);
  const filtersActive = hasActiveAdminHallOfFameFilters(filters) || keyword.trim().length > 0;

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-6">
        <PageHeader
          eyebrow="名人堂邀请与审核"
          title="名人堂管理"
          description="先在该成员的“照片申请”中通过首次照片或换照，再回“成员管理”执行通过并发布；发布后才会在前台名人堂展示。"
          actions={
            canManage === true ? (
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-1 size-4" />
                发起邀请
              </Button>
            ) : null
          }
        />

        {canManage === false ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              当前账号为只读后台权限，可查看名人堂成员记录，但不可发起邀请、编辑资料、办理进阶或审批照片申请。
            </CardContent>
          </Card>
        ) : null}

        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="members">成员管理</TabsTrigger>
            <TabsTrigger value="photo-requests">
              照片申请
              {pendingPhotoCount > 0 ? (
                <span className="ml-1.5 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {pendingPhotoCount > 99 ? "99+" : pendingPhotoCount}
                </span>
              ) : null}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
                <div className="min-w-[140px]">
                  <Select
                    value={filters.level}
                    onValueChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        level: value as AdminHallOfFameFilters["level"],
                      }))
                    }
                  >
                    <SelectTrigger aria-label="按等级筛选" triggerSize="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部等级</SelectItem>
                      {HALL_OF_FAME_LEVEL_ORDER.map((lvl) => (
                        <SelectItem key={lvl} value={String(lvl)}>
                          {HALL_OF_FAME_LEVEL_CONFIG[lvl].name}
                        </SelectItem>
                      ))}
                      <SelectItem value="unset">待定级（历史）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[140px]">
                  <Select
                    value={filters.memberStatus}
                    onValueChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        memberStatus:
                          value as AdminHallOfFameFilters["memberStatus"],
                      }))
                    }
                  >
                    <SelectTrigger aria-label="按成员身份筛选" triggerSize="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部身份</SelectItem>
                      <SelectItem value="serving">
                        {HALL_OF_FAME_MEMBER_STATUS_LABELS.serving}
                      </SelectItem>
                      <SelectItem value="honorary">
                        {HALL_OF_FAME_MEMBER_STATUS_LABELS.honorary}
                      </SelectItem>
                      <SelectItem value="unset">待确认身份</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[140px]">
                  <Select
                    value={filters.status}
                    onValueChange={(value) =>
                      setFilters((current) => ({
                        ...current,
                        status: value as AdminHallOfFameFilters["status"],
                      }))
                    }
                  >
                    <SelectTrigger aria-label="按邀请状态筛选" triggerSize="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="invited">
                        {HALL_OF_FAME_STATUS_LABELS.invited}
                      </SelectItem>
                      <SelectItem value="candidate">
                        {HALL_OF_FAME_STATUS_LABELS.candidate}
                      </SelectItem>
                      <SelectItem value="active">
                        {HALL_OF_FAME_STATUS_LABELS.active}
                      </SelectItem>
                      <SelectItem value="hidden">
                        {HALL_OF_FAME_STATUS_LABELS.hidden}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[180px]">
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="搜索姓名 / 标签 / 学院"
                    aria-label="搜索名人堂成员"
                    className="h-9"
                  />
                </div>

                <div className="min-w-[140px]">
                  <Select
                    value={sortBy}
                    onValueChange={(value) =>
                      setSortBy(value === "updated" ? "updated" : "display")
                    }
                  >
                    <SelectTrigger aria-label="成员排序" triggerSize="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="display">按展示顺序</SelectItem>
                      <SelectItem value="updated">按最近更新</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span>
                  显示 {visibleEntries.length} / {entries.length} 人
                </span>
                {filtersActive ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setFilters(defaultAdminHallOfFameFilters);
                      setKeyword("");
                      setSortBy("display");
                    }}
                  >
                    <RotateCcw className="mr-1 size-3" />
                    清空筛选
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs"
                  disabled={loading}
                  onClick={() => void reloadEntries()}
                >
                  <RefreshCw className="mr-1 size-3" />
                  刷新
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="py-4 text-sm text-muted-foreground">
                <LoadingStatus>正在加载名人堂成员列表...</LoadingStatus>
              </div>
            ) : listError ? (
              <Card className="border-destructive/40">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <p role="alert" className="text-sm text-destructive">
                    {listError}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void reloadEntries()}
                  >
                    <RefreshCw className="mr-1 size-3.5" />
                    重试
                  </Button>
                </CardContent>
              </Card>
            ) : entries.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  暂无名人堂条目
                </CardContent>
              </Card>
            ) : visibleEntries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 p-8 text-center text-sm text-muted-foreground">
                  <p>当前筛选条件下没有匹配的名人堂成员</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters(defaultAdminHallOfFameFilters)}
                  >
                    清空筛选条件
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {visibleEntries.map((entry) => {
                  const displayName = resolveAdminEntryDisplayName(entry);
                  const displayCollege =
                    entry.displayCollege ?? entry.college ?? "未填写学院";
                  const isBusy = busyEntryId === entry.id;
                  const canWithdrawUnpublished =
                    entry.status === "invited" || entry.status === "candidate";
                  const canArchiveFormal = entry.status === "active";

                  return (
                    <Card key={entry.id}>
                      <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium break-words">
                              {displayName}
                            </span>
                            <Badge variant={statusVariants[entry.status]}>
                              {formatAdminInviteStatusLabel(entry.status)}
                            </Badge>
                            <Badge variant="outline">
                              {formatAdminHallOfFameLevelLabel(entry.level)}
                            </Badge>
                            <Badge variant="secondary">
                              {formatAdminMemberStatusLabel(entry.memberStatus)}
                            </Badge>
                            <Badge
                              variant={
                                entry.photoReviewStatus === "approved"
                                  ? "default"
                                  : entry.photoReviewStatus === "rejected"
                                    ? "destructive"
                                    : "secondary"
                              }
                            >
                              照片审核：
                              {HALL_OF_FAME_PHOTO_REVIEW_LABELS[
                                entry.photoReviewStatus ?? "unsubmitted"
                              ]}
                            </Badge>
                            {entry.tag ? (
                              <Badge variant="outline">{entry.tag}</Badge>
                            ) : null}
                          </div>

                          <p className="text-xs text-muted-foreground break-words">
                            {[
                              entry.displayGrade || null,
                              displayCollege,
                              entry.displayMajor || null,
                            ]
                              .filter(Boolean)
                              .join(" · ")}{" "}
                            | 排序：{entry.displayOrder} | 资料版本：
                            {entry.revision ?? 0}
                            {entry.updatedAt
                              ? ` | 最近更新：${formatAdminDateTime(entry.updatedAt)}`
                              : ""}
                          </p>

                          <div className="space-y-1 text-sm">
                            <p className="whitespace-pre-wrap text-foreground/90">
                              公开简介：{entry.bio || "未填写"}
                            </p>
                            {entry.adminBio ? (
                              <p className="whitespace-pre-wrap text-xs text-muted-foreground">
                                管理员备注：{entry.adminBio}
                              </p>
                            ) : null}
                            {entry.milestones && entry.milestones.length > 0 ? (
                              <details className="pt-1">
                                <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                                  {(() => {
                                    const latest =
                                      entry.milestones[
                                        entry.milestones.length - 1
                                      ];
                                    const eventLabel =
                                      latest.eventType === "promoted"
                                        ? "进阶"
                                        : "入选";
                                    return `履历记录：${entry.milestones.length} 条（最近：成绩 ${latest.achievementYear} 年 / ${eventLabel} ${latest.eventYear} 年 → ${formatAdminHallOfFameLevelLabel(latest.toLevel)}）· 展开查看完整理由与双年份`;
                                  })()}
                                </summary>
                                <div className="mt-2">
                                  <AdminHallOfFameMilestoneHistory
                                    milestones={entry.milestones}
                                  />
                                </div>
                              </details>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                履历记录：暂无入选或进阶履历（待定级/补录）
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                          {entry.status === "active" ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                href={`/profile/${encodeURIComponent(entry.userId)}`}
                              >
                                <ExternalLink className="mr-1 size-3.5" />
                                查看公开页
                              </Link>
                            </Button>
                          ) : null}

                          {canManage === true ? (
                            <>
                              {entry.status === "candidate" ? (
                                <>
                                  {entry.photoReviewStatus !== "approved" ? (
                                    <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-900">
                                      <span>
                                        照片
                                        {HALL_OF_FAME_PHOTO_REVIEW_LABELS[
                                          entry.photoReviewStatus ?? "unsubmitted"
                                        ]}
                                        ，需先通过
                                      </span>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="link"
                                        className="h-auto p-0 text-xs text-amber-900 underline"
                                        onClick={() => setTab("photo-requests")}
                                      >
                                        去审核照片
                                      </Button>
                                    </div>
                                  ) : null}
                                  <Button
                                    type="button"
                                    size="sm"
                                    loading={isBusy}
                                    disabled={isBusy || entry.photoReviewStatus !== "approved"}
                                    title={
                                      entry.photoReviewStatus === "approved"
                                        ? "通过成员资料并发布到名人堂"
                                        : "请先在“照片申请”中通过成员照片"
                                    }
                                    onClick={() => void handlePublish(entry)}
                                  >
                                    <Check className="mr-1 size-3.5" />
                                    通过并发布
                                  </Button>
                                </>
                              ) : null}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() => {
                                  setEditing(entry);
                                  setDialogOpen(true);
                                }}
                              >
                                <Pencil className="mr-1 size-3.5" />
                                编辑
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() => {
                                  setPromoting(entry);
                                  setPromoteOpen(true);
                                }}
                              >
                                <ArrowUpRight className="mr-1 size-3.5" />
                                {entry.level ? "进阶" : "定级"}
                              </Button>
                              {canWithdrawUnpublished ? (
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  loading={isBusy}
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleWithdrawUnpublished(entry)
                                  }
                                >
                                  <Trash2 className="mr-1 size-3.5" />
                                  撤回邀请
                                </Button>
                              ) : canArchiveFormal ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  loading={isBusy}
                                  disabled={isBusy}
                                  onClick={() =>
                                    void handleArchiveFormalMember(entry)
                                  }
                                >
                                  <EyeOff className="mr-1 size-3.5" />
                                  隐藏归档
                                </Button>
                              ) : null}
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              只读模式
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="photo-requests">
            <HallOfFamePhotoRequestsTab
              canManage={canManage === true}
              onApproved={async () => {
                await reloadEntries();
                await refreshPendingPhotoCount();
              }}
              onPermissionRevoked={() => setCanManage(false)}
            />
          </TabsContent>
        </Tabs>

        <HallOfFameEditDialog
          key={`${editing?.id ?? "invite"}-${editing?.revision ?? 0}-${dialogOpen ? "open" : "closed"}`}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditing(null);
            }
          }}
          entry={editing}
          onSaved={reloadEntries}
          onRefreshEntry={handleRefreshSingleEntry}
          onOpenPromote={(targetEntry) => {
            setPromoting(targetEntry);
            setPromoteOpen(true);
          }}
          onPermissionRevoked={() => setCanManage(false)}
        />

        <HallOfFamePromoteDialog
          key={`promote-${promoting?.id ?? "none"}-${promoting?.revision ?? 0}-${promoteOpen ? "open" : "closed"}`}
          open={promoteOpen}
          onOpenChange={(open) => {
            setPromoteOpen(open);
            if (!open) {
              setPromoting(null);
            }
          }}
          entry={promoting}
          onPromoted={reloadEntries}
          onRefreshEntry={handleRefreshSingleEntry}
          onPermissionRevoked={() => setCanManage(false)}
        />
      </div>
    </div>
  );
}
