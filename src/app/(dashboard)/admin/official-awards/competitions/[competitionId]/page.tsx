"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  Ban,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  PencilLine,
  Plus,
  Trash2,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  AWARD_LEVEL_CODES,
  AWARD_LEVEL_LABEL,
  AWARD_SOURCE_LABEL,
  EXPORT_VIEW_LABEL,
  VERIFICATION_LABEL,
  awardFilterKey,
  buildAwardQuery,
  exportErrorMessage,
  isExportContentType,
  levelNeedsReview,
  parseContentDispositionFilename,
  type AwardLevelCode,
  type AwardSource,
  type ExportFormat,
  type ExportView,
  type MemberVerification,
  type OfficialAwardListResponse,
  type OfficialAwardRow,
} from "@/lib/contracts/official-awards";
import { confirmI18n } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

const PAGE_SIZE = 20;

type Filters = { year: string; level: string; subTrack: string };
type Failure = { kind: "forbidden" | "notfound" | "error"; message: string };
type MemberDraft = { memberId: string; name: string; grade: string; college: string; major: string };
type AdvisorDraft = { name: string; college: string };
type CorrectionForm = {
  levelCode: AwardLevelCode;
  subTrack: string;
  teamName: string;
  reason: string;
  members: MemberDraft[];
  advisors: AdvisorDraft[];
};

const SOURCE_CLASS: Record<string, string> = {
  official: "border-blue-400/30 bg-blue-400/10 text-blue-800 dark:text-blue-200",
  registration: "border-violet-400/30 bg-violet-400/10 text-violet-800 dark:text-violet-200",
  manual: "border-orange-400/30 bg-orange-400/10 text-orange-800 dark:text-orange-200",
  unknown: "border-slate-400/30 bg-slate-400/10 text-slate-700 dark:text-slate-300",
};

const VERIFICATION_CLASS: Record<MemberVerification, string> = {
  verified: "border-emerald-400/30 bg-emerald-400/10 text-emerald-800 dark:text-emerald-200",
  unverified: "border-amber-400/30 bg-amber-400/10 text-amber-800 dark:text-amber-200",
  anonymous: "border-slate-400/30 bg-slate-400/10 text-slate-700 dark:text-slate-300",
};

const LEVEL_BAR: Record<string, string> = {
  special: "bg-gradient-to-b from-rose-300 to-rose-500",
  first: "bg-gradient-to-b from-amber-300 to-amber-500",
  second: "bg-gradient-to-b from-sky-300 to-sky-500",
  third: "bg-gradient-to-b from-violet-300 to-violet-500",
  excellence: "bg-gradient-to-b from-slate-300 to-slate-500",
  other: "bg-gradient-to-b from-teal-300 to-teal-500",
  unclassified: "bg-border",
};

function Missing({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground" title={`缺失：${label}`}>
      —
    </span>
  );
}

function SourceBadge({ source }: { source: AwardSource }) {
  return (
    <Badge className={SOURCE_CLASS[source] ?? ""} variant="outline">
      {AWARD_SOURCE_LABEL[source] ?? source}
    </Badge>
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
  const [form, setForm] = useState<CorrectionForm | null>(null);
  const [voiding, setVoiding] = useState<OfficialAwardRow | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [dialogConflict, setDialogConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const exportAbort = useRef<AbortController | null>(null);
  const prevKeyword = useRef("");

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
    () =>
      buildAwardQuery(
        { ...filters, q: appliedKeyword },
        { cursor: cursorStack[pageIndex] ?? null, limit: PAGE_SIZE },
      ),
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
    setForm({
      levelCode: row.levelCode,
      subTrack: row.subTrack ?? "",
      teamName: row.teamName ?? "",
      reason: "",
      members: row.members.map((member) => ({
        memberId: member.memberId,
        name: member.name,
        grade: member.grade ?? "",
        college: member.college ?? "",
        major: member.major ?? "",
      })),
      advisors: row.advisors.map((advisor) => ({ name: advisor.name, college: advisor.college ?? "" })),
    });
  };

  const submitCorrection = async () => {
    if (!editing || !form) return;
    if (!form.reason.trim()) {
      toast.error("请填写更正原因，便于审计追溯。");
      return;
    }
    if (form.members.length === 0) {
      toast.error("至少需要一名获奖成员。");
      return;
    }
    if (form.members.some((member) => !member.name.trim())) {
      toast.error("成员姓名不能为空，请补全或删除该行。");
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
          reason: form.reason.trim(),
          levelCode: form.levelCode,
          subTrack: form.subTrack.trim() || null,
          teamName: form.teamName.trim() || null,
          members: form.members.map((member) => ({
            memberId: member.memberId,
            name: member.name.trim(),
            grade: member.grade.trim() || null,
            college: member.college.trim() || null,
            major: member.major.trim() || null,
          })),
          advisors: form.advisors
            .filter((advisor) => advisor.name.trim())
            .map((advisor) => ({ name: advisor.name.trim(), college: advisor.college.trim() || null })),
        }),
      });
      if (response.status === 409) {
        setDialogConflict(true);
        setRefreshKey((value) => value + 1);
        toast.error("版本冲突：该记录已被他人更新，列表已刷新，编辑内容已保留，请核对后重新提交。");
        return;
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? `更正失败（HTTP ${response.status}）`);
      }
      toast.success("已提交更正，正在重新查询名单。");
      setEditing(null);
      setForm(null);
      setRefreshKey((value) => value + 1);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "更正失败");
    } finally {
      setSubmitting(false);
    }
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

  const updateMember = (index: number, patch: Partial<MemberDraft>) => {
    setForm((prev) =>
      prev
        ? { ...prev, members: prev.members.map((item, position) => (position === index ? { ...item, ...patch } : item)) }
        : prev,
    );
  };

  const updateAdvisor = (index: number, patch: Partial<AdvisorDraft>) => {
    setForm((prev) =>
      prev
        ? { ...prev, advisors: prev.advisors.map((item, position) => (position === index ? { ...item, ...patch } : item)) }
        : prev,
    );
  };

  const columns = useMemo<ColumnDef<OfficialAwardRow>[]>(
    () => [
      {
        id: "expand",
        header: "",
        cell: ({ row }) => {
          const open = expanded.includes(row.original.awardId);
          return (
            <button
              aria-expanded={open}
              aria-label={open ? "收起成员" : "展开成员"}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              type="button"
              onClick={() => toggleExpanded(row.original.awardId)}
            >
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          );
        },
      },
      {
        accessorKey: "levelCode",
        header: "奖项",
        cell: ({ row }) => {
          const award = row.original;
          return (
            <div className="flex items-start gap-2.5">
              <span
                aria-hidden
                className={`mt-1 h-8 w-1.5 shrink-0 rounded-full ${LEVEL_BAR[award.levelCode] ?? "bg-border"}`}
              />
              <div className="min-w-0">
                <p className="truncate text-sm leading-6 font-semibold">{AWARD_LEVEL_LABEL[award.levelCode]}</p>
                {award.levelRaw && award.levelRaw !== AWARD_LEVEL_LABEL[award.levelCode] ? (
                  <p className="truncate text-[11px] leading-4 text-muted-foreground">原文：{award.levelRaw}</p>
                ) : null}
                {levelNeedsReview(award) ? (
                  <p className="text-[10px] leading-4 text-amber-600 dark:text-amber-400">原文与规范等级不一致</p>
                ) : null}
                {award.voided ? (
                  <span className="mt-1 inline-flex rounded bg-slate-500/15 px-1.5 py-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                    已撤销
                  </span>
                ) : null}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "awardYear",
        header: "年份",
        cell: ({ row }) =>
          row.original.awardYear ? (
            <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
              {row.original.awardYear}
            </span>
          ) : (
            <Missing label="年份" />
          ),
      },
      {
        accessorKey: "subTrack",
        header: "赛道",
        cell: ({ row }) => row.original.subTrack ?? <Missing label="赛道" />,
      },
      {
        accessorKey: "teamName",
        header: "团队",
        cell: ({ row }) => <span className="text-sm font-medium">{row.original.teamName ?? "—"}</span>,
      },
      {
        accessorKey: "memberCount",
        header: "人数",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 text-sm tabular-nums text-muted-foreground">
            <Users className="size-3.5" />
            {row.original.memberCount}
          </span>
        ),
      },
      {
        accessorKey: "advisors",
        header: "指导老师",
        cell: ({ row }) =>
          row.original.advisors.length > 0 ? (
            <span className="text-sm text-muted-foreground">
              {row.original.advisors.map((advisor) => advisor.name).join("、")}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">无</span>
          ),
      },
      {
        accessorKey: "source",
        header: "来源",
        cell: ({ row }) => <SourceBadge source={row.original.source} />,
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button
              aria-label="更正该获奖事实"
              disabled={!data?.permissions.canCorrect || row.original.voided}
              size="sm"
              title="更正"
              variant="ghost"
              onClick={() => openCorrection(row.original)}
            >
              <PencilLine className="size-4" />
              <span className="ml-1">更正</span>
            </Button>
            <Button
              aria-label="撤销该获奖事实"
              className="text-rose-600 hover:text-rose-700"
              disabled={!data?.permissions.canVoid || row.original.voided}
              size="sm"
              title="撤销"
              variant="ghost"
              onClick={() => {
                setDialogConflict(false);
                setVoidReason("");
                setVoiding(row.original);
              }}
            >
              <Ban className="size-4" />
              <span className="ml-1">撤销</span>
            </Button>
          </div>
        ),
      },
    ],
    [data?.permissions.canCorrect, data?.permissions.canVoid, expanded],
  );

  const pagination: PaginationState = { pageIndex, pageSize: PAGE_SIZE };

  if (failure?.kind === "forbidden" || failure?.kind === "notfound") {
    return (
      <div className="px-3 pb-8 sm:px-4 lg:px-6">
        <EmptyState
          description={
            failure.kind === "forbidden"
              ? `${failure.message} 权限由 API 按当前有效的比赛范围授权校验。`
              : failure.message
          }
          title={failure.kind === "forbidden" ? "没有查看该比赛获奖名单的权限" : "没有找到这场比赛"}
        />
      </div>
    );
  }

  return (
    <div className="relative px-3 pb-8 sm:px-4 lg:px-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/5 via-transparent to-transparent"
      />
      <div className="relative space-y-4 sm:space-y-6">
        <PageHeader
          eyebrow="官方获奖名单"
          title={data?.competition.title ?? "获奖名单"}
          description={
            data
              ? `${data.competition.edition} · 一奖一行，展开可查看获奖成员与指导老师；已核实人数只按 person_id 去重。`
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
          <StatsCard
            description="一奖一行，团队奖不按人数放大"
            icon={<Trophy className="size-4 text-amber-500" />}
            label="奖项数"
            value={String(summary.awardCount)}
          />
          <StatsCard
            description="团队成员累加，含未核实与匿名"
            icon={<Users className="size-4 text-sky-500" />}
            label="获奖人次"
            value={String(summary.memberCount)}
          />
          <StatsCard
            description="COUNT(DISTINCT person_id)，仅已核实"
            icon={<UserCheck className="size-4 text-emerald-500" />}
            label="已核实去重人数"
            value={String(summary.verifiedMemberCount)}
          />
          <StatsCard
            description="导入草稿，不计入正式事实"
            icon={<ClipboardList className="size-4 text-orange-500" />}
            label="草稿待处理"
            value={String(summary.draftPending)}
          />
        </div>

        {summary.draftPending > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-800 sm:px-4 sm:py-3 sm:text-sm">
            有 <strong>{summary.draftPending}</strong> 条导入草稿待处理，它们<strong>不计入</strong>上方正式事实统计；
            请先在导入/补全流程中确认。
          </div>
        ) : null}

        <div className="rounded-2xl border border-border/60 bg-card p-4">
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
                  {(data?.competition.levels ?? []).map((code) => (
                    <SelectItem key={code} value={code}>
                      {AWARD_LEVEL_LABEL[code] ?? code}
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

        <div className="hidden md:block">
          <AdminDataTable
            columns={columns}
            data={rows}
            emptyLabel="该比赛在当前筛选下还没有已确认的获奖事实。"
            error={failure?.message}
            isRowExpanded={(row) => expanded.includes(row.awardId)}
            loading={loading}
            onPaginationChange={(updater) => {
              const next = typeof updater === "function" ? updater(pagination) : updater;
              if (next.pageIndex > pageIndex) {
                const cursor = data?.nextCursor;
                if (!cursor) return;
                setCursorStack((prev) => {
                  const copy = prev.slice(0, pageIndex + 1);
                  copy[pageIndex + 1] = cursor;
                  return copy;
                });
                setPageIndex(next.pageIndex);
                return;
              }
              if (next.pageIndex < pageIndex) setPageIndex(next.pageIndex);
            }}
            onRetry={() => setRefreshKey((value) => value + 1)}
            onSearchChange={setKeyword}
            pagination={pagination}
            renderExpandedRow={(row) => (
              <div className="px-4 py-3">
                <p className="mb-2 text-xs text-muted-foreground">
                  获奖成员（核实状态决定是否计入已核实去重人数）
                </p>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>姓名</TableHead>
                      <TableHead>年级</TableHead>
                      <TableHead>学院</TableHead>
                      <TableHead>专业</TableHead>
                      <TableHead>核实状态</TableHead>
                      <TableHead>来源</TableHead>
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
                          <Badge className={VERIFICATION_CLASS[member.verification]} variant="outline">
                            {VERIFICATION_LABEL[member.verification]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <SourceBadge source={member.source} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            rowCount={summary.awardCount}
            searchPlaceholder="搜索获奖学生姓名"
            searchValue={keyword}
          />
        </div>

        <div className="space-y-2.5 md:hidden">
          {loading ? (
            <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
              正在加载获奖事实…
            </div>
          ) : rows.length === 0 ? (
            <EmptyState description="换个筛选条件，或确认该比赛是否已导入名单。" title="暂无获奖事实" />
          ) : (
            rows.map((row) => {
              const open = expanded.includes(row.awardId);
              return (
                <div key={row.awardId} className="relative rounded-xl border border-border/60 bg-card p-4 pl-5">
                  <span
                    aria-hidden
                    className={`absolute inset-y-3 left-0 w-1 rounded-full ${LEVEL_BAR[row.levelCode] ?? "bg-border"}`}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">{AWARD_LEVEL_LABEL[row.levelCode]}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {row.awardYear ?? "年份缺失"} · {row.subTrack ?? "赛道缺失"}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-foreground/80">{row.teamName ?? "无团队"}</p>
                    </div>
                    <button
                      aria-expanded={open}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                      type="button"
                      onClick={() => toggleExpanded(row.awardId)}
                    >
                      <Users className="size-3.5" />
                      {open ? "收起" : `${row.memberCount} 人`}
                    </button>
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
                          {VERIFICATION_LABEL[member.verification]}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          导出范围：当前筛选的全部结果（不受分页影响）；上限 500 项奖 / 5000 人次，超出返回 413 并提示；
          导出由服务端生成并记录审计，权限与范围在服务端再次校验。
        </p>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(open) => (open ? undefined : setEditing(null))}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>更正获奖事实</DialogTitle>
            <DialogDescription>
              更正会写入审计并抬高版本号（当前 v{editing?.version ?? "-"}）；成员与指导老师整组替换，提交后自动重新查询。
            </DialogDescription>
          </DialogHeader>
          {form ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="levelCode">规范等级</Label>
                  <Select
                    value={form.levelCode}
                    onValueChange={(value) =>
                      setForm((prev) => (prev ? { ...prev, levelCode: value as AwardLevelCode } : prev))
                    }
                  >
                    <SelectTrigger aria-label="选择规范等级" id="levelCode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AWARD_LEVEL_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {AWARD_LEVEL_LABEL[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subTrack">赛道</Label>
                  <Input
                    id="subTrack"
                    value={form.subTrack}
                    onChange={(event) => setForm((prev) => (prev ? { ...prev, subTrack: event.target.value } : prev))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="teamName">团队名称</Label>
                <Input
                  id="teamName"
                  value={form.teamName}
                  onChange={(event) => setForm((prev) => (prev ? { ...prev, teamName: event.target.value } : prev))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>获奖成员（{form.members.length}）</Label>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setForm((prev) =>
                        prev
                          ? {
                              ...prev,
                              members: [...prev.members, { memberId: "", name: "", grade: "", college: "", major: "" }],
                            }
                          : prev,
                      )
                    }
                  >
                    <Plus className="size-3.5" />
                    添加成员
                  </Button>
                </div>
                {form.members.map((member, index) => (
                  <div className="grid grid-cols-[1fr_0.7fr_1fr_1fr_auto] gap-2" key={`member-${index}`}>
                    <Input
                      aria-label="成员姓名"
                      placeholder="姓名"
                      value={member.name}
                      onChange={(event) => updateMember(index, { name: event.target.value })}
                    />
                    <Input
                      aria-label="成员年级"
                      placeholder="年级"
                      value={member.grade}
                      onChange={(event) => updateMember(index, { grade: event.target.value })}
                    />
                    <Input
                      aria-label="成员学院"
                      placeholder="学院"
                      value={member.college}
                      onChange={(event) => updateMember(index, { college: event.target.value })}
                    />
                    <Input
                      aria-label="成员专业"
                      placeholder="专业"
                      value={member.major}
                      onChange={(event) => updateMember(index, { major: event.target.value })}
                    />
                    <Button
                      aria-label="移除该成员"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setForm((prev) =>
                          prev ? { ...prev, members: prev.members.filter((_, position) => position !== index) } : prev,
                        )
                      }
                    >
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>指导老师（{form.advisors.length}）</Label>
                  <Button
                    size="sm"
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setForm((prev) => (prev ? { ...prev, advisors: [...prev.advisors, { name: "", college: "" }] } : prev))
                    }
                  >
                    <Plus className="size-3.5" />
                    添加老师
                  </Button>
                </div>
                {form.advisors.map((advisor, index) => (
                  <div className="grid grid-cols-[1fr_1fr_auto] gap-2" key={`advisor-${index}`}>
                    <Input
                      aria-label="指导老师姓名"
                      placeholder="姓名"
                      value={advisor.name}
                      onChange={(event) => updateAdvisor(index, { name: event.target.value })}
                    />
                    <Input
                      aria-label="指导老师学院"
                      placeholder="学院（可空）"
                      value={advisor.college}
                      onChange={(event) => updateAdvisor(index, { college: event.target.value })}
                    />
                    <Button
                      aria-label="移除该老师"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setForm((prev) =>
                          prev ? { ...prev, advisors: prev.advisors.filter((_, position) => position !== index) } : prev,
                        )
                      }
                    >
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">更正原因（必填）</Label>
                <Input
                  id="reason"
                  placeholder="例如：官方原文为二等奖，录入时误填三等奖"
                  value={form.reason}
                  onChange={(event) => setForm((prev) => (prev ? { ...prev, reason: event.target.value } : prev))}
                />
              </div>

              {dialogConflict ? (
                <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  提交时检测到版本冲突，列表已刷新。编辑内容已保留，可比对后重新提交。
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
