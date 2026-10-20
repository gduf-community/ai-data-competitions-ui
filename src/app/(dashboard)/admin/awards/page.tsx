"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AWARD_SOURCE_LABEL,
  AWARD_STATUS_LABEL,
  type AwardOptionsResponse,
  type AwardRosterResponse,
  type AwardRosterRow,
} from "@/lib/contracts/awards";
import { confirmI18n } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";

type Filters = {
  competitionId: string;
  awardLevel: string;
  track: string;
  status: string;
};

const EMPTY_FILTERS: Filters = {
  competitionId: "all",
  awardLevel: "all",
  track: "all",
  status: "all",
};

const AWARD_LEVEL_CLASS: Record<string, string> = {
  一等奖: "border-emerald-200 bg-emerald-50 text-emerald-700",
  二等奖: "border-sky-200 bg-sky-50 text-sky-700",
  三等奖: "border-amber-200 bg-amber-50 text-amber-700",
  优秀奖: "border-slate-200 bg-slate-50 text-slate-600",
};

const SOURCE_CLASS: Record<string, string> = {
  official: "border-blue-200 bg-blue-50 text-blue-700",
  application: "border-violet-200 bg-violet-50 text-violet-700",
  manual: "border-orange-200 bg-orange-50 text-orange-700",
};

function filenameFromDisposition(value: string | null): string | null {
  if (!value) return null;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(value);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(value);
  return plain ? plain[1] : null;
}

function dash(value: string | null | undefined, missingLabel?: string) {
  if (value) return value;
  return <span className="text-muted-foreground" title={missingLabel ? `缺失：${missingLabel}` : undefined}>—</span>;
}

export default function AdminAwardsPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [refreshKey, setRefreshKey] = useState(0);

  const [data, setData] = useState<AwardRosterResponse | null>(null);
  const [options, setOptions] = useState<AwardOptionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"csv" | "xlsx" | null>(null);
  const [initialized, setInitialized] = useState(false);

  // 从 URL 还原筛选条件，保证刷新/分享后看到同一份名单。
  // 这里必须在挂载后读取 window.location，首帧保持服务端渲染的结果以避免 hydration 不一致。
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters({
      competitionId: params.get("competitionId") ?? "all",
      awardLevel: params.get("awardLevel") ?? "all",
      track: params.get("track") ?? "all",
      status: params.get("status") ?? "all",
    });
    setKeyword(params.get("keyword") ?? "");
    setDebouncedKeyword(params.get("keyword") ?? "");
    const initialPage = Number.parseInt(params.get("page") ?? "1", 10);
    if (Number.isFinite(initialPage) && initialPage > 1) setPage(initialPage);
    setInitialized(true);
  }, []);

  // 筛选条件写回 URL（不触发路由跳转）。
  useEffect(() => {
    if (!initialized) return;
    const params = new URLSearchParams();
    if (filters.competitionId !== "all") params.set("competitionId", filters.competitionId);
    if (filters.awardLevel !== "all") params.set("awardLevel", filters.awardLevel);
    if (filters.track !== "all") params.set("track", filters.track);
    if (filters.status !== "all") params.set("status", filters.status);
    if (debouncedKeyword.trim()) params.set("keyword", debouncedKeyword.trim());
    if (page > 1) params.set("page", String(page));
    const query = params.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [filters, debouncedKeyword, page, initialized]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      try {
        const response = await fetch("/api/admin/awards/options", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as AwardOptionsResponse;
        if (active) setOptions(payload);
      } catch {
        // 选项加载失败不影响名单本身，筛选栏保留默认值即可。
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, []);

  const buildQuery = useCallback(
    (withPaging: boolean) => {
      const params = new URLSearchParams();
      if (filters.competitionId !== "all") params.set("competitionId", filters.competitionId);
      if (filters.awardLevel !== "all") params.set("awardLevel", filters.awardLevel);
      if (filters.track !== "all") params.set("track", filters.track);
      if (filters.status !== "all") params.set("status", filters.status);
      if (debouncedKeyword.trim()) params.set("keyword", debouncedKeyword.trim());
      if (withPaging) {
        params.set("page", String(page));
        params.set("pageSize", String(pageSize));
      }
      return params.toString();
    },
    [debouncedKeyword, filters, page, pageSize],
  );

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/admin/awards?${buildQuery(true)}`, { cache: "no-store" });
        if (response.status === 403) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          if (active) {
            setForbidden(payload.message ?? "你没有查看获奖名单的权限。");
            setLoading(false);
          }
          return;
        }
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message ?? `加载获奖名单失败（${response.status}）`);
        }
        const payload = (await response.json()) as AwardRosterResponse;
        if (!active) return;
        setData(payload);
        setForbidden(null);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : "加载获奖名单失败");
      } finally {
        if (active) setLoading(false);
      }
    };
    void run();
    return () => {
      active = false;
    };
  }, [buildQuery, refreshKey]);

  const total = data?.total ?? 0;
  const summary = data?.summary ?? { confirmed: 0, pending: 0, total: 0 };
  const rows = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setKeyword("");
    setDebouncedKeyword("");
    setPage(1);
  };

  const openExport = async (format: "csv" | "xlsx") => {
    if (total === 0) {
      toast.error("当前筛选没有可导出的记录，请先调整筛选条件。");
      return;
    }
    const confirmedScope = confirmI18n(
      `将导出当前筛选的全部 ${total} 条记录（不受分页影响），导出操作会记录到审计日志，是否继续？`,
    );
    if (!confirmedScope) return;

    setExporting(format);
    try {
      const response = await fetch(`/api/admin/awards/export?format=${format}&${buildQuery(false)}`, {
        cache: "no-store",
      });
      if (!response.ok) {
        // 错误响应必须是提示，不能落成一张打不开的表格。
        const payload = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(payload.message ?? `导出失败（${response.status}）`);
      }
      const blob = await response.blob();
      const filename =
        filenameFromDisposition(response.headers.get("content-disposition")) ?? `获奖名单.${format}`;
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      toast.success(`已导出 ${total} 条记录：${filename}`);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "导出失败");
    } finally {
      setExporting(null);
    }
  };

  const columns = useMemo<ColumnDef<AwardRosterRow>[]>(
    () => [
      {
        accessorKey: "awardLevel",
        header: "奖项",
        cell: ({ row }) => (
          <Badge variant="outline" className={AWARD_LEVEL_CLASS[row.original.awardLevel] ?? ""}>
            {row.original.awardLevel}
          </Badge>
        ),
      },
      {
        accessorKey: "track",
        header: "赛道",
      },
      {
        accessorKey: "teamName",
        header: "团队",
        cell: ({ row }) => <span className="text-muted-foreground">{row.original.teamName}</span>,
      },
      {
        accessorKey: "studentName",
        header: "学生姓名",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-medium">{row.original.studentName}</span>
            {row.original.missing.length > 0 ? (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-[11px] text-amber-700">
                缺{row.original.missing.join("、")}
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "grade",
        header: "年级",
        cell: ({ row }) => dash(row.original.grade, "年级"),
      },
      {
        accessorKey: "college",
        header: "学院",
      },
      {
        accessorKey: "major",
        header: "专业",
        cell: ({ row }) => dash(row.original.major, "专业"),
      },
      {
        accessorKey: "teachers",
        header: "指导老师",
        cell: ({ row }) =>
          row.original.teachers.length > 0 ? (
            <span>{row.original.teachers.join("、")}</span>
          ) : (
            <span className="text-muted-foreground">无指导老师</span>
          ),
      },
      {
        accessorKey: "source",
        header: "来源",
        cell: ({ row }) => (
          <Badge variant="outline" className={SOURCE_CLASS[row.original.source] ?? ""}>
            {AWARD_SOURCE_LABEL[row.original.source] ?? row.original.source}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "确认状态",
        cell: ({ row }) =>
          row.original.status === "confirmed" ? (
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              已确认
            </Badge>
          ) : (
            <Badge variant="outline" className="border-dashed border-amber-300 text-amber-700">
              待确认
            </Badge>
          ),
      },
    ],
    [],
  );

  const filtersActive =
    filters.competitionId !== "all" ||
    filters.awardLevel !== "all" ||
    filters.track !== "all" ||
    filters.status !== "all" ||
    debouncedKeyword.trim().length > 0;

  const emptyLabel = filtersActive
    ? "当前筛选没有符合条件的获奖记录，试试放宽条件。"
    : summary.pending > 0 && summary.confirmed === 0
      ? "获奖名单还没有确认完成，请先在名单补全工作台处理。"
      : filters.competitionId !== "all"
        ? "该比赛还没有导入获奖名单。"
        : "还没有可展示的获奖名单。";

  const pagination: PaginationState = { pageIndex: page - 1, pageSize };

  const mobilePager =
    total > pageSize ? (
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
        <Button
          disabled={page <= 1}
          size="sm"
          variant="outline"
          onClick={() => setPage((value) => Math.max(1, value - 1))}
        >
          上一页
        </Button>
        <span className="text-xs text-muted-foreground">
          第 {page} / {pageCount} 页
        </span>
        <Button
          disabled={page >= pageCount}
          size="sm"
          variant="outline"
          onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
        >
          下一页
        </Button>
      </div>
    ) : null;

  if (forbidden) {
    return (
      <div className="px-4 lg:px-6">
        <Card className="border-dashed">
          <CardContent className="space-y-2 py-10 text-center">
            <p className="text-lg font-medium">没有查看获奖名单的权限</p>
            <p className="text-sm text-muted-foreground">{forbidden}</p>
            <p className="text-sm text-muted-foreground">
              需要「赛事管理」范围内的名单查看权限，请联系管理员开通后再试。
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
          eyebrow="获奖管理"
          title="获奖名单"
          description={
            data?.scope.competitionId
              ? `${data.scope.competitionTitle}${data.scope.edition ? ` · ${data.scope.edition}` : ""} 的已确认获奖名单，包含年级、学院、专业与指导老师。`
              : "全部比赛的已确认获奖名单，可按比赛、奖项、赛道筛选，并导出 CSV/XLSX。"
          }
          actions={
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => void openExport("csv")}
                disabled={Boolean(exporting) || total === 0}
              >
                {exporting === "csv" ? "导出中…" : "导出 CSV"}
              </Button>
              <Button
                className="flex-1 sm:flex-none"
                onClick={() => void openExport("xlsx")}
                disabled={Boolean(exporting) || total === 0}
              >
                {exporting === "xlsx" ? "导出中…" : "导出 XLSX"}
              </Button>
            </div>
          }
        />

        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
          <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">已确认获奖人数</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums sm:mt-2">{summary.confirmed}</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">仅该部分计入正式获奖人数</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">待确认记录</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums sm:mt-2">{summary.pending}</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">未确认，不计入获奖人数</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">当前筛选结果</p>
            <p className="mt-1.5 text-2xl font-semibold tabular-nums sm:mt-2">{summary.total}</p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">导出将使用这一整份结果</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">名单最后更新</p>
            <p className="mt-1.5 text-sm font-medium sm:mt-2">
              {data?.scope.lastUpdated ? data.scope.lastUpdated.replace("T", " ").slice(0, 16) : "—"}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground sm:text-xs">{data?.scope.edition || "—"}</p>
          </div>
        </div>

        {summary.pending > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-800 sm:px-4 sm:py-3 sm:text-sm sm:leading-6">
            仍有 <strong>{summary.pending}</strong> 条记录待确认，它们<strong>不计入</strong>正式获奖人数；
            请先在名单补全工作台完成确认，再对外使用本名单。
          </div>
        ) : null}

        <div className="rounded-xl border border-border/60 bg-card p-3 sm:p-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-4">
            <Select
              value={filters.competitionId}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, competitionId: value }));
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="按比赛筛选">
                <SelectValue placeholder="全部比赛" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部比赛</SelectItem>
                {(options?.competitions ?? []).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.awardLevel}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, awardLevel: value }));
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="按奖项筛选">
                <SelectValue placeholder="全部奖项" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部奖项</SelectItem>
                {(options?.awardLevels ?? []).map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.track}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, track: value }));
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="按赛道筛选">
                <SelectValue placeholder="全部赛道" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部赛道</SelectItem>
                {(options?.tracks ?? []).map((track) => (
                  <SelectItem key={track} value={track}>
                    {track}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.status}
              onValueChange={(value) => {
                setFilters((prev) => ({ ...prev, status: value }));
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="按确认状态筛选">
                <SelectValue placeholder="全部状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="confirmed">{AWARD_STATUS_LABEL.confirmed}</SelectItem>
                <SelectItem value="pending">{AWARD_STATUS_LABEL.pending}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 桌面 / 平板：表格 */}
        <div className="hidden md:block">
          <AdminDataTable
            data={rows}
            columns={columns}
            searchPlaceholder="搜索姓名、团队、学院或指导老师"
            searchValue={keyword}
            onSearchChange={setKeyword}
            emptyLabel={emptyLabel}
            loading={loading}
            error={error ?? undefined}
            onRetry={() => setRefreshKey((value) => value + 1)}
            pagination={pagination}
            rowCount={total}
            onPaginationChange={(updater) => {
              const next = typeof updater === "function" ? updater(pagination) : updater;
              setPage(next.pageIndex + 1);
              setPageSize(next.pageSize);
            }}
            toolbar={
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={resetFilters} disabled={!filtersActive && !keyword}>
                  重置筛选
                </Button>
                <Button variant="outline" size="sm" onClick={() => setRefreshKey((value) => value + 1)} disabled={loading}>
                  刷新
                </Button>
              </div>
            }
          />
        </div>

        {/* 手机：卡片列表，避免横向滚动 */}
        <div className="space-y-3 md:hidden">
          <div className="flex items-center gap-2">
            <Input
              aria-label="搜索获奖名单"
              className="h-9"
              maxLength={256}
              placeholder="搜索姓名、团队、学院或老师"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <Button
              className="h-9 shrink-0"
              disabled={!filtersActive && !keyword}
              size="sm"
              variant="outline"
              onClick={resetFilters}
            >
              重置
            </Button>
          </div>

          <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
            <span role="status">{loading ? "加载中…" : error ? "加载失败" : `共 ${total} 条`}</span>
            <button
              className="underline-offset-2 hover:underline disabled:opacity-50"
              disabled={loading}
              type="button"
              onClick={() => setRefreshKey((value) => value + 1)}
            >
              刷新
            </button>
          </div>

          {!loading && !error ? mobilePager : null}

          {loading ? (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              正在加载…
            </div>
          ) : error ? (
            <div className="space-y-3 rounded-xl border border-dashed border-border/60 p-6 text-center text-sm" role="alert">
              <p>{error}</p>
              <Button size="sm" variant="outline" onClick={() => setRefreshKey((value) => value + 1)}>
                重试
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {rows.map((row) => (
                <li key={row.id} className="rounded-xl border border-border/60 bg-card p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium">{row.studentName}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.teamName}</p>
                    </div>
                    <Badge className={AWARD_LEVEL_CLASS[row.awardLevel] ?? ""} variant="outline">
                      {row.awardLevel}
                    </Badge>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <Badge className="text-[11px]" variant="outline">
                      {row.track}
                    </Badge>
                    {row.status === "confirmed" ? (
                      <Badge className="border-emerald-200 bg-emerald-50 text-[11px] text-emerald-700" variant="outline">
                        已确认
                      </Badge>
                    ) : (
                      <Badge className="border-dashed border-amber-300 text-[11px] text-amber-700" variant="outline">
                        待确认
                      </Badge>
                    )}
                    <Badge className={`text-[11px] ${SOURCE_CLASS[row.source] ?? ""}`} variant="outline">
                      {AWARD_SOURCE_LABEL[row.source] ?? row.source}
                    </Badge>
                    {row.missing.length > 0 ? (
                      <Badge className="border-amber-200 bg-amber-50 text-[11px] text-amber-700" variant="outline">
                        缺{row.missing.join("、")}
                      </Badge>
                    ) : null}
                  </div>

                  <dl className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-border/40 pt-2.5 text-xs">
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">年级</dt>
                      <dd className="mt-0.5 truncate">{row.grade ?? "—"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">学院</dt>
                      <dd className="mt-0.5 truncate">{row.college}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">专业</dt>
                      <dd className="mt-0.5 truncate">{row.major ?? "—"}</dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-muted-foreground">指导老师</dt>
                      <dd className="mt-0.5 truncate">
                        {row.teachers.length > 0 ? row.teachers.join("、") : "无"}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          )}

          {!loading && !error ? mobilePager : null}
        </div>

        <p className="text-xs text-muted-foreground">
          导出范围：当前筛选的全部 {total} 条记录（不受分页影响）；文件名包含比赛与届次；
          导出由服务端生成，权限与筛选条件在服务端再次校验。
        </p>
      </div>
    </div>
  );
}
