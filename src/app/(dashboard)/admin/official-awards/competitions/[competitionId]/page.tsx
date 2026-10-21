"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ClipboardList, Trophy, UserCheck, Users } from "lucide-react";

import { OfficialAwardCards } from "@/components/admin/official-awards/award-cards";
import { OfficialAwardTable } from "@/components/admin/official-awards/award-table";
import { OfficialAwardCorrectionDialog } from "@/components/admin/official-awards/correction-dialog";
import { OfficialAwardFilters } from "@/components/admin/official-awards/filters-bar";
import { OfficialAwardVoidDialog } from "@/components/admin/official-awards/void-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXPORT_VIEW_LABEL, type ExportView, type OfficialAwardRow } from "@/lib/contracts/official-awards";
import { useOfficialAwardExport } from "@/hooks/use-official-award-export";
import { useOfficialAwardList } from "@/hooks/use-official-award-list";
import { useOfficialAwardQuery } from "@/hooks/use-official-award-query";

const PAGE_SIZE = 20;

export default function OfficialAwardCompetitionPage() {
  const params = useParams<{ competitionId: string }>();
  const competitionId = String(params?.competitionId ?? "");

  const query = useOfficialAwardQuery(competitionId, PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);
  const list = useOfficialAwardList(competitionId, query.query, query.identity, refreshKey);

  const [exportView, setExportView] = useState<ExportView>("award");
  // 导出只带筛选，不带 cursor/limit（#138：导出当前筛选的全部结果）。
  const exporter = useOfficialAwardExport(competitionId, query.filterQuery);

  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<OfficialAwardRow | null>(null);
  const [editingBaseline, setEditingBaseline] = useState<OfficialAwardRow | null>(null);
  const [voiding, setVoiding] = useState<OfficialAwardRow | null>(null);
  const [conflict, setConflict] = useState(false);
  const [conflictLost, setConflictLost] = useState(false);
  // 记录「冲突发生时列表的刷新代际」，只有真正拿到新一代响应才回填版本。
  const [conflictWait, setConflictWait] = useState<{ awardId: string; revision: number } | null>(null);

  useEffect(() => {
    if (!conflictWait) return;
    if (list.revision <= conflictWait.revision) return;
    const fresh = list.data?.items.find((item) => item.awardId === conflictWait.awardId);
    if (!fresh) {
      // 记录已离开当前筛选/页：不能冒充已回填，提示用户重新打开。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConflict(true);
      setConflictLost(true);
      setConflictWait(null);
      return;
    }
    setEditing((prev) => (prev && prev.awardId === fresh.awardId ? fresh : prev));
    setVoiding((prev) => (prev && prev.awardId === fresh.awardId ? fresh : prev));
    setConflict(true);
    setConflictWait(null);
  }, [conflictWait, list.data, list.revision]);

  const refreshAfterMutation = () => {
    setEditing(null);
    setEditingBaseline(null);
    setVoiding(null);
    setConflict(false);
    setConflictLost(false);
    setRefreshKey((value) => value + 1);
  };

  const handleConflict = (awardId: string) => {
    setConflictWait({ awardId, revision: list.revision });
    setRefreshKey((value) => value + 1);
  };

  const toggleExpanded = (awardId: string) => {
    setExpanded((prev) => (prev.includes(awardId) ? prev.filter((id) => id !== awardId) : [...prev, awardId]));
  };

  const summary = list.summary ?? { awardCount: 0, memberCount: 0, verifiedMemberCount: 0, draftPending: 0 };
  const permissions = list.permissions;
  const exportReady = list.kind === "ok" && !list.loading && Boolean(list.data);
  // 失败/加载时不把 0 当成真实统计展示，避免误读。
  const showStats = list.kind === "ok" && !list.loading && Boolean(list.data);
  const stat = (value: number) => (showStats ? String(value) : "—");

  if (list.kind === "forbidden" || list.kind === "notfound") {
    return (
      <div className="px-3 pb-8 sm:px-4 lg:px-6">
        <EmptyState
          description={
            list.kind === "forbidden"
              ? `${list.message} 权限由 API 按当前有效的比赛范围授权校验。`
              : list.message
          }
          title={list.kind === "forbidden" ? "没有查看该比赛获奖名单的权限" : "没有找到这场比赛"}
        />
      </div>
    );
  }

  const cursorPaging = {
    pageNumber: query.pageNumber,
    hasPrev: query.canGoPrev,
    hasNext: Boolean(list.data?.hasMore),
    onPrev: query.goPrev,
    onNext: () => query.goNext(list.data?.nextCursor ?? null),
  };

  return (
    <div className="px-3 pb-8 sm:px-4 lg:px-6">
      <div className="space-y-4 sm:space-y-6">
        <PageHeader
          eyebrow="官方获奖名单"
          title={list.competition?.title ?? "获奖名单"}
          description={
            list.competition
              ? `${list.competition.edition} · 一奖一行，展开可查看获奖成员与指导老师；已核实人数只按 person_id 去重。`
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
                  disabled={Boolean(exporter.exporting) || !exportReady || !permissions?.canExport}
                  variant="outline"
                  onClick={() =>
                    void exporter.run("csv", exportView, {
                      awardCount: summary.awardCount,
                      memberCount: summary.memberCount,
                    })
                  }
                >
                  {exporter.exporting === "csv" ? "导出中…" : "导出 CSV"}
                </Button>
                <Button
                  className="flex-1 sm:flex-none"
                  disabled={Boolean(exporter.exporting) || !exportReady || !permissions?.canExport}
                  onClick={() =>
                    void exporter.run("xlsx", exportView, {
                      awardCount: summary.awardCount,
                      memberCount: summary.memberCount,
                    })
                  }
                >
                  {exporter.exporting === "xlsx" ? "导出中…" : "导出 XLSX"}
                </Button>
                {exporter.exporting ? (
                  <Button variant="ghost" onClick={exporter.cancel}>
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
            icon={<Trophy className="size-4 text-muted-foreground" />}
            label="奖项数"
            value={stat(summary.awardCount)}
          />
          <StatsCard
            description="团队成员累加，含未核实与匿名"
            icon={<Users className="size-4 text-muted-foreground" />}
            label="获奖人次"
            value={stat(summary.memberCount)}
          />
          <StatsCard
            description="COUNT(DISTINCT person_id)，仅已核实"
            icon={<UserCheck className="size-4 text-muted-foreground" />}
            label="已核实去重人数"
            value={stat(summary.verifiedMemberCount)}
          />
          <StatsCard
            description="导入草稿，不计入正式事实"
            icon={<ClipboardList className="size-4 text-muted-foreground" />}
            label="草稿待处理"
            value={stat(summary.draftPending)}
          />
        </div>

        {showStats && summary.draftPending > 0 ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] leading-5 text-amber-800 sm:px-4 sm:py-3 sm:text-sm">
            有 <strong>{summary.draftPending}</strong> 条导入草稿待处理，它们<strong>不计入</strong>上方正式事实统计；
            请先在导入/补全流程中确认。
          </div>
        ) : null}

        <OfficialAwardFilters
          keyword={query.keyword}
          level={query.filters.level}
          levels={list.competition?.levels ?? []}
          onKeywordChange={query.setKeyword}
          onLevelChange={query.setLevel}
          onSubTrackChange={query.setSubTrack}
          onYearChange={query.setYear}
          subTrack={query.filters.subTrack}
          subTracks={list.competition?.subTracks ?? []}
          year={query.filters.year}
          years={list.competition?.years ?? []}
        />

        <div className="hidden md:block">
          <OfficialAwardTable
            canCorrect={Boolean(permissions?.canCorrect)}
            canVoid={Boolean(permissions?.canVoid)}
            cursorPaging={cursorPaging}
            error={list.kind === "error" ? list.message : undefined}
            expanded={expanded}
            loading={list.loading}
            onCorrect={(row) => {
              setConflict(false);
              setConflictLost(false);
              setEditingBaseline(row);
              setEditing(row);
            }}
            onRetry={() => setRefreshKey((value) => value + 1)}
            onToggle={toggleExpanded}
            onVoid={(row) => {
              setConflict(false);
              setConflictLost(false);
              setVoiding(row);
            }}
            rows={list.rows}
            total={summary.awardCount}
          />
        </div>

        <div className="md:hidden">
          <OfficialAwardCards
            canCorrect={Boolean(permissions?.canCorrect)}
            canVoid={Boolean(permissions?.canVoid)}
            cursorPaging={cursorPaging}
            errorMessage={list.kind === "error" ? list.message : undefined}
            expanded={expanded}
            loading={list.loading}
            onCorrect={(row) => {
              setConflict(false);
              setConflictLost(false);
              setEditingBaseline(row);
              setEditing(row);
            }}
            onRetry={() => setRefreshKey((value) => value + 1)}
            onToggle={toggleExpanded}
            onVoid={(row) => {
              setConflict(false);
              setConflictLost(false);
              setVoiding(row);
            }}
            rows={list.rows}
            summary={summary}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          导出范围：当前筛选的全部结果（不受分页影响）；上限 500 项奖 / 5000 人次，超出返回 413 并提示；
          导出由服务端生成并记录审计，权限与范围在服务端再次校验。
        </p>
      </div>

      <OfficialAwardCorrectionDialog
        award={editing}
        baseline={editingBaseline}
        conflict={conflict}
        conflictLost={conflictLost}
        onClose={() => {
          setEditing(null);
          setEditingBaseline(null);
          setConflict(false);
          setConflictLost(false);
        }}
        onConflict={() => handleConflict(editing?.awardId ?? "")}
        onSubmitted={refreshAfterMutation}
      />

      <OfficialAwardVoidDialog
        award={voiding}
        conflict={conflict}
        onClose={() => {
          setVoiding(null);
          setConflict(false);
          setConflictLost(false);
        }}
        onConflict={() => handleConflict(voiding?.awardId ?? "")}
        onSubmitted={refreshAfterMutation}
      />
    </div>
  );
}
