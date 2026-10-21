"use client";

import { Ban, PencilLine, Users } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AWARD_LEVEL_LABEL,
  VERIFICATION_LABEL,
  type OfficialAwardRow,
  type OfficialAwardSummary,
} from "@/lib/contracts/official-awards";
import { SourceBadge } from "@/components/admin/official-awards/award-table";

type Props = {
  rows: OfficialAwardRow[];
  summary?: OfficialAwardSummary;
  loading: boolean;
  errorMessage?: string;
  onRetry: () => void;
  expanded: string[];
  onToggle: (awardId: string) => void;
  canCorrect: boolean;
  canVoid: boolean;
  onCorrect: (row: OfficialAwardRow) => void;
  onVoid: (row: OfficialAwardRow) => void;
  cursorPaging: {
    pageNumber: number;
    hasPrev: boolean;
    hasNext: boolean;
    onPrev: () => void;
    onNext: () => void;
  };
};

/** 移动端：与桌面同等的字段、动作与分页，不把功能留给“桌面模式”。 */
export function OfficialAwardCards({
  rows,
  summary,
  loading,
  errorMessage,
  onRetry,
  expanded,
  onToggle,
  canCorrect,
  canVoid,
  onCorrect,
  onVoid,
  cursorPaging,
}: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
        正在加载获奖事实…
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-border/60 p-6 text-center text-sm" role="alert">
        <p>{errorMessage}</p>
        <Button size="sm" variant="outline" onClick={onRetry}>
          重试
        </Button>
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState description="换个筛选条件，或确认该比赛是否已导入名单。" title="暂无获奖事实" />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
        <Button disabled={!cursorPaging.hasPrev} size="sm" variant="outline" onClick={cursorPaging.onPrev}>
          上一页
        </Button>
        <span className="text-xs text-muted-foreground">第 {cursorPaging.pageNumber} 页</span>
        <Button disabled={!cursorPaging.hasNext} size="sm" variant="outline" onClick={cursorPaging.onNext}>
          下一页
        </Button>
      </div>

      <ul className="space-y-3">
        {rows.map((row) => {
          const open = expanded.includes(row.awardId);
          return (
            <li key={row.awardId} className="rounded-xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline">{AWARD_LEVEL_LABEL[row.levelCode]}</Badge>
                    {row.voided ? (
                      <Badge className="border-slate-300 bg-slate-100 text-[10px] text-slate-600" variant="outline">
                        已撤销
                      </Badge>
                    ) : null}
                    {row.levelReviewRequired ? (
                      <span className="text-[10px] text-amber-600">需人工核对</span>
                    ) : null}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {row.awardYear ?? "年份缺失"} · {row.subTrack ?? "赛道缺失"} · {row.teamName ?? "无团队"}
                  </p>
                  {row.levelRaw ? (
                    <p className="truncate text-[11px] text-muted-foreground">原文：{row.levelRaw}</p>
                  ) : null}
                </div>
                <button
                  aria-expanded={open}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                  type="button"
                  onClick={() => onToggle(row.awardId)}
                >
                  <Users className="size-3.5" />
                  {open ? "收起" : `${row.memberCount} 人`}
                </button>
              </div>

              <p className="mt-2 truncate text-xs text-muted-foreground">
                指导老师 {row.advisors.length > 0 ? row.advisors.map((advisor) => advisor.name).join("、") : "无"}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">来源</span>
                <SourceBadge source={row.source} />
              </div>

              {open ? (
                <ul className="mt-3 space-y-2 border-t border-border/40 pt-3">
                  {row.members.map((member) => (
                    <li className="space-y-1 text-[11px] leading-4" key={member.memberId}>
                      <span className="text-sm font-medium text-foreground">{member.name}</span>
                      <span className="ml-1 text-muted-foreground">
                        {member.grade ?? "年级缺失"} · {member.college ?? "学院缺失"} · {member.major ?? "专业缺失"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge className="text-[10px]" variant="outline">
                          {VERIFICATION_LABEL[member.verification]}
                        </Badge>
                        <SourceBadge source={member.source} />
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="mt-3 flex justify-end gap-2 border-t border-border/40 pt-3">
                <Button
                  aria-label="更正该获奖事实"
                  disabled={!canCorrect || row.voided}
                  size="sm"
                  variant="outline"
                  onClick={() => onCorrect(row)}
                >
                  <PencilLine className="size-4" />
                  <span className="ml-1">更正</span>
                </Button>
                <Button
                  aria-label="撤销该获奖事实"
                  className="text-rose-600"
                  disabled={!canVoid || row.voided}
                  size="sm"
                  variant="outline"
                  onClick={() => onVoid(row)}
                >
                  <Ban className="size-4" />
                  <span className="ml-1">撤销</span>
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2">
        <Button disabled={!cursorPaging.hasPrev} size="sm" variant="outline" onClick={cursorPaging.onPrev}>
          上一页
        </Button>
        <span className="text-xs text-muted-foreground">
          {summary ? `共 ${summary.awardCount} 项奖 · ` : ""}第 {cursorPaging.pageNumber} 页
        </span>
        <Button disabled={!cursorPaging.hasNext} size="sm" variant="outline" onClick={cursorPaging.onNext}>
          下一页
        </Button>
      </div>
    </div>
  );
}
