"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Ban, ChevronDown, ChevronRight, ClipboardList, PencilLine, Trophy, UserCheck, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AWARD_SOURCE_LABEL,
  EXPORT_VIEW_LABEL,
  awardFilterKey,
  buildAwardQuery,
  exportErrorMessage,
  isExportContentType,
  levelNeedsReview,
  parseContentDispositionFilename,
  type ExportFormat,
  type ExportView,
  type OfficialAwardListResponse,
  type OfficialAwardRow,
} from "@/lib/contracts/official-awards";
import { confirmI18n } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

const PAGE_SIZE = 20;

type Filters = { year: string; level: string; subTrack: string };
type Failure = { kind: "forbidden" | "notfound" | "error"; message: string };
type CorrectionForm = { levelCode: string; subTrack: string; teamName: string; reason: string };

const SOURCE_CLASS: Record<string, string> = {
  official: "border-blue-200 bg-blue-50 text-blue-700",
  application: "border-violet-200 bg-violet-50 text-violet-700",
  manual: "border-orange-200 bg-orange-50 text-orange-700",
};

/** 等级配色：一等奖金、二等奖蓝、三等奖紫、优秀灰，深浅色主题都能分辨。 */
const LEVEL_TONE: Record<string, { badge: string; bar: string }> = {
  一等奖: {
    badge:
      "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-200",
    bar: "bg-amber-400",
  },
  二等奖: {
    badge: "border-sky-300 bg-sky-100 text-sky-900 dark:border-sky-500/40 dark:bg-sky-500/15 dark:text-sky-200",
    bar: "bg-sky-400",
  },
  三等奖: {
    badge:
      "border-violet-300 bg-violet-100 text-violet-900 dark:border-violet-500/40 dark:bg-violet-500/15 dark:text-violet-200",
    bar: "bg-violet-400",
  },
  优秀奖: {
    badge: "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-500/40 dark:bg-slate-500/15 dark:text-slate-300",
    bar: "bg-slate-400",
  },
};

function levelTone(level: string) {
  return (
    LEVEL_TONE[level] ?? {
      badge: "border-border bg-muted text-foreground",
      bar: "bg-border",
    }
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  hint: string;
  tone: string;
  icon: typeof Trophy;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2">
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="size-4" />
        </span>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function Missing({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground" title={`缺失：${label}`}>
      —
    </span>
  );
}

export default function OfficialAwardCompetitionPage() {
  const params = useParams<{ competitionId: string }>();
  const competitionId = String(params?.competitionId ?? "");

  const [filters, setFilters] = useState<Filters>({ year: "all", level: "all", subTrack: "all" });
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [cursorStack, setCursorStack] = useState<Array<string | null>>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const [data, setData] = useState<(OfficialAwardListResponse & { filterKey: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [failure, setFailure] = useState<Failure | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);

  const [exportView, setExportView] = useState<ExportView>("award");
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const [editing, setEditing] = useState<OfficialAwardRow | null>(null);
  const [correctionForm, setCorrectionForm] = useState<CorrectionForm | null>(null);
  const [voiding, setVoiding] = useState<OfficialAwardRow | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [dialogConflict, setDialogConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const exportAbort = useRef<AbortController | null>(null);
  const prevKeyword = useRef("");

  // 从 URL 恢复筛选，保证刷新/分享后看到同一份名单。首帧保持服务端渲染结果。
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const nextFilters: Filters = {
      year: search.get("year") ?? "all",
      level: search.get("level") ?? "all",
      subTrack: search.get("subTrack") ?? "all",
    };
    const nextKeyword = search.get("q") ?? "";
    prevKeyword.current = nextKeyword;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(nextFilters);
    setKeyword(nextKeyword);
    setAppliedKeyword(nextKeyword);
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (filters.year !== "all") next.set("year", filters.year);
    if (filters.level !== "all") next.set("level", filters.level);
    if (filters.subTrack !== "all") next.set("subTrack", filters.subTrack);
    if (appliedKeyword.trim()) next.set("q", appliedKeyword.trim());
    const query = next.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [appliedKeyword, filters]);

  // 搜索防抖；只有用户真的改了词才回到第一页（避免 300ms 后覆盖 URL 里的翻页状态）。
  useEffect(() => {
    const timer = setTimeout(() => setAppliedKeyword(keyword), 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    if (prevKeyword.current === appliedKeyword) return;
    prevKeyword.current = appliedKeyword;
    setCursorStack([null]);
    setPageIndex(0);
  }, [appliedKeyword]);

  const filterKey = useMemo(() => awardFilterKey({ ...filters, q: appliedKeyword }), [appliedKeyword, filters]);

  const listQuery = useMemo(
    () => buildAwardQuery({ ...filters, q: appliedKeyword }, { cursor: cursorStack[pageIndex] ?? null, limit: PAGE_SIZE }),
    [appliedKeyword, cursorStack, filters, pageIndex],
  );

  useEffect(() => {
    if (!competitionId) return;
    let active = true;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setFailure(null);
      try {
        const response = await fetch(
          `/api/admin/official-awards/competitions/${encodeURIComponent(competitionId)}?${listQuery}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (response.status === 403) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          if (active) {
            setFailure({ kind: "forbidden", message: payload.message ?? "你没有查看该比赛获奖名单的权限。" });
            setLoading(false);
          }
          return;
        }
        if (response.status === 404) {
          if (active) {
            setFailure({ kind: "notfound", message: "比赛不存在，或该比赛还没有导入官方名单。" });
            setLoading(false);
          }
          return;
        }
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message ?? `加载获奖名单失败（HTTP ${response.status}）`);
        }
        const payload = (await response.json()) as OfficialAwardListResponse;
        if (!active) return;
        setData({ ...payload, filterKey });
      } catch (cause) {
        if (!active || controller.signal.aborted) return;
        setFailure({ kind: "error", message: cause instanceof Error ? cause.message : "加载获奖名单失败" });
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [competitionId, filterKey, listQuery, refreshKey]);

  const summary = data?.summary ?? { awardCount: 0, memberCount: 0, verifiedMemberCount: 0, draftPending: 0 };
  const rows = data?.items ?? [];
  const canExport = Boolean(data?.permissions.canExport);
  // 只有“当前筛选 + 已完成加载”才允许导出，避免用旧 total 打开新筛选。
  const exportReady = Boolean(data) && !loading && !failure && data?.filterKey === filterKey;

  const resetToFirstPage = () => {
    setCursorStack([null]);
    setPageIndex(0);
  };

  const toggleExpanded = (awardId: string) => {
    setExpanded((prev) => (prev.includes(awardId) ? prev.filter((id) => id !== awardId) : [...prev, awardId]));
  };

  const runExport = async (format: ExportFormat) => {
    if (!data || !exportReady) {
      toast.error("名单尚未加载完成，请稍后再导出。");
      return;
    }
    if (!canExport) {
      toast.error("你没有导出该比赛获奖名单的权限。");
      return;
    }
    const scope = `${EXPORT_VIEW_LABEL[exportView]}，共 ${summary.awardCount} 项奖 / ${summary.memberCount} 人次`;
    if (!confirmI18n(`将按当前筛选导出（${scope}），导出会记录审计日志，是否继续？`)) return;

    const controller = new AbortController();
    exportAbort.current = controller;
    setExporting(format);
    try {
      const query = buildAwardQuery({ ...filters, q: appliedKeyword });
      const response = await fetch(
        `/api/admin/official-awards/competitions/${encodeURIComponent(competitionId)}/export?${query}&view=${exportView}&format=${format}`,
        { cache: "no-store", signal: controller.signal },
      );
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { message?: string; code?: string } | null;
        throw new Error(exportErrorMessage(response.status, payload));
      }
      if (!isExportContentType(response.headers.get("content-type"), format)) {
        throw new Error("服务返回的不是文件（可能是错误页），已取消下载。");
      }
      const blob = await response.blob();
      const filename =
        parseContentDispositionFilename(response.headers.get("content-disposition")) ?? `官方获奖名单.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`已导出：${filename}`);
    } catch (cause) {
      if (!controller.signal.aborted) {
        toast.error(cause instanceof Error ? cause.message : "导出失败");
      }
    } finally {
      setExporting(null);
      exportAbort.current = null;
    }
  };

  const openCorrection = (row: OfficialAwardRow) => {
    setDialogConflict(false);
    setEditing(row);
    setCorrectionForm({
      levelCode: row.levelCode,
      subTrack: row.subTrack,
      teamName: row.teamName ?? "",
      reason: "",
    });
  };

  const submitCorrection = async () => {
    if (!editing || !correctionForm) return;
    if (!correctionForm.reason.trim()) {
      toast.error("请填写更正原因，便于审计追溯。");
      return;
    }
    setSubmitting(true);
    setDialogConflict(false);
    try {
      const response = await fetchWithCsrf(`/api/admin/official-awards/${editing.awardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedVersion: editing.version,
          reason: correctionForm.reason.trim(),
          levelCode: correctionForm.levelCode,
          subTrack: correctionForm.subTrack,
          teamName: correctionForm.teamName,
        }),
      });
      if (response.status === 409) {
        setDialogConflict(true);
        setRefreshKey((value) => value + 1);
        toast.error("版本冲突：该记录已被他人更新，列表已刷新，请核对后重新提交。");
        return;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? `更正失败（HTTP ${response.status}）`);
      }
      toast.success("已提交更正，正在重新查询名单。");
      setEditing(null);
      setCorrectionForm(null);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "更正失败");
    } finally {
      setSubmitting(false);
    }
  };

  const openVoid = (row: OfficialAwardRow) => {
    setDialogConflict(false);
    setVoidReason("");
    setVoiding(row);
  };

  const submitVoid = async () => {
    if (!voiding) return;
    if (!voidReason.trim()) {
      toast.error("请填写撤销原因，便于审计追溯。");
      return;
    }
    setSubmitting(true);
    setDialogConflict(false);
    try {
      const response = await fetchWithCsrf(`/api/admin/official-awards/${voiding.awardId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expectedVersion: voiding.version, reason: voidReason.trim() }),
      });
      if (response.status === 409) {
        setDialogConflict(true);
        setRefreshKey((value) => value + 1);
        toast.error("版本冲突：该记录已被他人更新，列表已刷新，请核对后重新操作。");
        return;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? `撤销失败（HTTP ${response.status}）`);
      }
      toast.success("已撤销该获奖事实，正在重新查询名单。");
      setVoiding(null);
      setVoidReason("");
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "撤销失败");
    } finally {
      setSubmitting(false);
    }
  };

  if (failure?.kind === "forbidden" || failure?.kind === "notfound") {
    return (
      <div className="px-3 pb-6 sm:px-4 lg:px-6">
        <Card className="border-dashed">
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-lg font-medium">
              {failure.kind === "forbidden" ? "没有查看该比赛获奖名单的权限" : "没有找到这场比赛"}
            </p>
            <p className="text-sm text-muted-foreground">{failure.message}</p>
            <p className="text-sm text-muted-foreground">
              {failure.kind === "forbidden"
                ? "权限由 API 按当前有效的比赛范围授权校验，如需开通请联系管理员。"
                : "请确认比赛编号，或返回官方获奖名单入口重新选择。"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-3 pb-6 sm:px-4 lg:px-6">
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          eyebrow="官方获奖名单"
          title={data?.competition.title ?? "获奖名单"}
          description={
            data
              ? `${data.competition.edition} · 一奖一行，展开可查看获奖成员与指导老师；草稿待处理数与正式事实分开统计。`
              : "按奖项查看已确认的官方获奖事实。"
          }
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Select value={exportView} onValueChange={(value) => setExportView(value as ExportView)}>
                <SelectTrigger aria-label="选择导出视图" className="w-full sm:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="award">{EXPORT_VIEW_LABEL.award}</SelectItem>
                  <SelectItem value="member">{EXPORT_VIEW_LABEL.member}</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex w-full gap-2 sm:w-auto">
                <Button
                  className="flex-1 sm:flex-none"
                  disabled={Boolean(exporting) || !exportReady || !canExport}
                  variant="outline"
                  onClick={() => void runExport("csv")}
                >
                  {exporting === "csv" ? "导出中…" : "导出 CSV"}
                </Button>
                <Button
                  className="flex-1 sm:flex-none"
                  disabled={Boolean(exporting) || !exportReady || !canExport}
                  onClick={() => void runExport("xlsx")}
                >
                  {exporting === "xlsx" ? "导出中…" : "导出 XLSX"}
                </Button>
                {exporting ? (
                  <Button variant="ghost" onClick={() => exportAbort.current?.abort()}>
                    取消
                  </Button>
                ) : null}
              </div>
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard
            hint="一奖一行，团队奖不按人数放大"
            icon={Trophy}
            label="奖项数"
            tone="bg-amber-500/15 text-amber-600 dark:text-amber-300"
            value={summary.awardCount}
          />
          <StatCard
            hint="团队成员累加"
            icon={Users}
            label="获奖人次"
            tone="bg-sky-500/15 text-sky-600 dark:text-sky-300"
            value={summary.memberCount}
          />
          <StatCard
            hint="按姓名 + 学院去重"
            icon={UserCheck}
            label="去重人数"
            tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-300"
            value={summary.verifiedMemberCount}
          />
          <StatCard
            hint="不计入上方正式事实"
            icon={ClipboardList}
            label="草稿待处理"
            tone="bg-orange-500/15 text-orange-600 dark:text-orange-300"
            value={summary.draftPending}
          />
        </div>

        {summary.draftPending > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-800 sm:px-4 sm:py-3 sm:text-sm">
            有 <strong>{summary.draftPending}</strong> 条导入草稿待处理，它们<strong>不计入</strong>上方正式事实统计；
            请先在导入/补全流程中确认。
          </div>
        ) : null}

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">获奖年份</Label>
              <Select
                value={filters.year}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, year: value }));
                  resetToFirstPage();
                }}
              >
                <SelectTrigger aria-label="按获奖年份筛选" className="w-full">
                  <SelectValue placeholder="全部年份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部年份</SelectItem>
                  {(data?.competition.years ?? []).map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year} 年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">规范等级</Label>
              <Select
                value={filters.level}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, level: value }));
                  resetToFirstPage();
                }}
              >
                <SelectTrigger aria-label="按规范等级筛选" className="w-full">
                  <SelectValue placeholder="全部等级" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部等级</SelectItem>
                  {(data?.competition.levels ?? []).map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-normal text-muted-foreground">赛道</Label>
              <Select
                value={filters.subTrack}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, subTrack: value }));
                  resetToFirstPage();
                }}
              >
                <SelectTrigger aria-label="按赛道筛选" className="w-full">
                  <SelectValue placeholder="全部赛道" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部赛道</SelectItem>
                  {(data?.competition.subTracks ?? []).map((track) => (
                    <SelectItem key={track} value={track}>
                      {track}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1.5 xl:col-span-1">
              <Label className="text-xs font-normal text-muted-foreground">搜索学生</Label>
              <Input
                aria-label="按姓名搜索获奖名单"
                className="h-9 w-full"
                maxLength={64}
                placeholder="输入姓名，如：何子轩"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            正在加载获奖事实…
          </div>
        ) : failure ? (
          <div className="space-y-3 rounded-xl border border-dashed border-border/60 p-8 text-center text-sm" role="alert">
            <p>{failure.message}</p>
            <Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>
              重试
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
            该比赛在当前筛选下还没有已确认的获奖事实。
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card">
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="h-11 w-10" />
                    <TableHead className="h-11 text-xs font-semibold tracking-wide text-muted-foreground">奖项</TableHead>
                    <TableHead className="h-11 text-xs font-semibold tracking-wide text-muted-foreground">年份</TableHead>
                    <TableHead className="h-11 text-xs font-semibold tracking-wide text-muted-foreground">赛道</TableHead>
                    <TableHead className="h-11 text-xs font-semibold tracking-wide text-muted-foreground">团队</TableHead>
                    <TableHead className="h-11 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                      人数
                    </TableHead>
                    <TableHead className="h-11 text-xs font-semibold tracking-wide text-muted-foreground">
                      指导老师
                    </TableHead>
                    <TableHead className="h-11 text-xs font-semibold tracking-wide text-muted-foreground">来源</TableHead>
                    <TableHead className="h-11 text-right text-xs font-semibold tracking-wide text-muted-foreground">
                      操作
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const open = expanded.includes(row.awardId);
                    const tone = levelTone(row.levelCode);
                    return (
                      <Fragment key={row.awardId}>
                        <TableRow className="h-14">
                          <TableCell>
                            <button
                              aria-expanded={open}
                              aria-label={open ? "收起成员" : "展开成员"}
                              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                              type="button"
                              onClick={() => toggleExpanded(row.awardId)}
                            >
                              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                            </button>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col items-start gap-1">
                              <Badge className={`px-2 py-0.5 text-xs font-medium ${tone.badge}`} variant="outline">
                                {row.levelRaw}
                              </Badge>
                              {levelNeedsReview(row) ? (
                                <span className="text-[10px] text-muted-foreground">规范：{row.levelCode}</span>
                              ) : null}
                              {row.voided ? (
                                <Badge className="border-slate-300 bg-slate-100 text-[10px] text-slate-600" variant="outline">
                                  已撤销
                                </Badge>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
                              {row.awardYear}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm">{row.subTrack}</TableCell>
                          <TableCell className="max-w-[16rem] truncate text-sm font-medium">
                            {row.teamName ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="inline-flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
                              <Users className="size-3.5" />
                              {row.memberCount}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground">
                            {row.advisors.length > 0 ? row.advisors.map((advisor) => advisor.name).join("、") : "无"}
                          </TableCell>
                          <TableCell>
                            <Badge className={SOURCE_CLASS[row.source] ?? ""} variant="outline">
                              {AWARD_SOURCE_LABEL[row.source] ?? row.source}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                aria-label="更正该获奖事实"
                                disabled={!data?.permissions.canCorrect || row.voided}
                                size="sm"
                                title="更正"
                                variant="ghost"
                                onClick={() => openCorrection(row)}
                              >
                                <PencilLine className="size-3.5" />
                                <span className="ml-1 hidden xl:inline">更正</span>
                              </Button>
                              <Button
                                aria-label="撤销该获奖事实"
                                className="text-rose-600 hover:text-rose-700"
                                disabled={!data?.permissions.canVoid || row.voided}
                                size="sm"
                                title="撤销"
                                variant="ghost"
                                onClick={() => openVoid(row)}
                              >
                                <Ban className="size-3.5" />
                                <span className="ml-1 hidden xl:inline">撤销</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {open ? (
                          <TableRow>
                            <TableCell className="bg-muted/30 p-0" colSpan={9}>
                              <div className="px-4 py-3">
                                <p className="mb-2 text-xs text-muted-foreground">获奖成员（逐字段快照来源用于对账）</p>
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>姓名</TableHead>
                                      <TableHead>年级</TableHead>
                                      <TableHead>学院</TableHead>
                                      <TableHead>专业</TableHead>
                                      <TableHead>快照来源</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {row.members.map((member) => (
                                      <TableRow key={member.memberId}>
                                        <TableCell className="font-medium">{member.name}</TableCell>
                                        <TableCell>{member.grade ?? <Missing label="年级" />}</TableCell>
                                        <TableCell>{member.college ?? <Missing label="学院" />}</TableCell>
                                        <TableCell>{member.major ?? <Missing label="专业" />}</TableCell>
                                        <TableCell>
                                          <Badge className={SOURCE_CLASS[member.source] ?? ""} variant="outline">
                                            {AWARD_SOURCE_LABEL[member.source] ?? member.source}
                                          </Badge>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="divide-y divide-border/60 md:hidden">
              {rows.map((row) => {
                const open = expanded.includes(row.awardId);
                return (
                  <div key={row.awardId} className="relative p-4 pl-5">
                    <span
                      aria-hidden
                      className={`absolute inset-y-3 left-0 w-1 rounded-full ${levelTone(row.levelCode).bar}`}
                    />
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{row.levelRaw}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {row.awardYear} · {row.subTrack}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-foreground/80">{row.teamName ?? "无团队"}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {row.voided ? (
                          <Badge className="border-slate-300 bg-slate-100 text-[10px] text-slate-600" variant="outline">
                            已撤销
                          </Badge>
                        ) : null}
                        <button
                          aria-expanded={open}
                          className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                          type="button"
                          onClick={() => toggleExpanded(row.awardId)}
                        >
                          <Users className="size-3.5" />
                          {open ? "收起" : `${row.memberCount} 人`}
                        </button>
                      </div>
                    </div>
                    <p className="mt-1.5 truncate text-xs text-muted-foreground">
                      指导老师 {row.advisors.length > 0 ? row.advisors.map((advisor) => advisor.name).join("、") : "无"}
                    </p>
                    {open ? (
                      <ul className="mt-2 space-y-1.5 border-t border-border/40 pt-2">
                        {row.members.map((member) => (
                          <li key={member.memberId} className="text-[11px] leading-4 text-muted-foreground">
                            <span className="text-foreground">{member.name}</span>
                            {" · "}
                            {member.grade ?? "年级缺失"}
                            {" · "}
                            {member.college ?? "学院缺失"}
                            {" · "}
                            {member.major ?? "专业缺失"}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <Button
            disabled={pageIndex === 0 || loading}
            size="sm"
            variant="outline"
            onClick={() => setPageIndex((value) => Math.max(0, value - 1))}
          >
            上一页
          </Button>
          <span className="text-xs text-muted-foreground">第 {pageIndex + 1} 页</span>
          <Button
            disabled={!data?.hasMore || loading}
            size="sm"
            variant="outline"
            onClick={() => {
              const next = data?.nextCursor;
              if (!next) return;
              setCursorStack((prev) => {
                const copy = prev.slice(0, pageIndex + 1);
                copy[pageIndex + 1] = next;
                return copy;
              });
              setPageIndex((value) => value + 1);
            }}
          >
            下一页
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          导出范围：当前筛选的全部结果（不受分页影响）；上限 500 项奖 / 5000 人次，超出返回 413 并提示；
          导出由服务端生成并记录审计，权限与范围在服务端再次校验。
        </p>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (open ? undefined : setEditing(null))}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>更正获奖事实</DialogTitle>
            <DialogDescription>
              更正会写入审计并抬高版本号（当前 v{editing?.version ?? "-"}）。提交后自动重新查询。
            </DialogDescription>
          </DialogHeader>
          {correctionForm ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="levelCode">规范等级</Label>
                <Input
                  id="levelCode"
                  value={correctionForm.levelCode}
                  onChange={(event) =>
                    setCorrectionForm((prev) => (prev ? { ...prev, levelCode: event.target.value } : prev))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subTrack">赛道</Label>
                <Input
                  id="subTrack"
                  value={correctionForm.subTrack}
                  onChange={(event) =>
                    setCorrectionForm((prev) => (prev ? { ...prev, subTrack: event.target.value } : prev))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="teamName">团队名称</Label>
                <Input
                  id="teamName"
                  value={correctionForm.teamName}
                  onChange={(event) =>
                    setCorrectionForm((prev) => (prev ? { ...prev, teamName: event.target.value } : prev))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reason">更正原因（必填）</Label>
                <Input
                  id="reason"
                  placeholder="例如：官方原文为二等奖，录入时误填三等奖"
                  value={correctionForm.reason}
                  onChange={(event) =>
                    setCorrectionForm((prev) => (prev ? { ...prev, reason: event.target.value } : prev))
                  }
                />
              </div>
              {dialogConflict ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  提交时检测到版本冲突，列表已刷新。请关闭后重新打开该记录，确认最新内容再提交。
                </p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button disabled={submitting} variant="outline" onClick={() => setEditing(null)}>
              取消
            </Button>
            <Button disabled={submitting} onClick={() => void submitCorrection()}>
              {submitting ? "提交中…" : "提交更正"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(voiding)} onOpenChange={(open) => (open ? undefined : setVoiding(null))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>撤销获奖事实</DialogTitle>
            <DialogDescription>
              撤销不会删除数据，只会标记为无效并记录原因；当前版本 v{voiding?.version ?? "-"}。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="voidReason">撤销原因（必填）</Label>
            <Input
              id="voidReason"
              placeholder="例如：该团队实际未获奖，官方原文核对有误"
              value={voidReason}
              onChange={(event) => setVoidReason(event.target.value)}
            />
          </div>
          {dialogConflict ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              版本冲突，列表已刷新，请核对后重新操作。
            </p>
          ) : null}
          <DialogFooter>
            <Button disabled={submitting} variant="outline" onClick={() => setVoiding(null)}>
              取消
            </Button>
            <Button className="text-rose-600" disabled={submitting} onClick={() => void submitVoid()}>
              {submitting ? "提交中…" : "确认撤销"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
