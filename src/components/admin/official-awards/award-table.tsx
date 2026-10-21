"use client";

import { useMemo } from "react";
import { Ban, ChevronDown, ChevronRight, PencilLine, Users } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AWARD_LEVEL_LABEL,
  AWARD_SOURCE_LABEL,
  VERIFICATION_LABEL,
  type AwardSource,
  type MemberVerification,
  type OfficialAwardRow,
} from "@/lib/contracts/official-awards";

const SOURCE_CLASS: Record<string, string> = {
  official: "border-blue-200 bg-blue-50 text-blue-700",
  registration: "border-violet-200 bg-violet-50 text-violet-700",
  manual: "border-orange-200 bg-orange-50 text-orange-700",
  unknown: "border-slate-200 bg-slate-50 text-slate-600",
};

const VERIFICATION_CLASS: Record<MemberVerification, string> = {
  verified: "border-emerald-200 bg-emerald-50 text-emerald-700",
  unverified: "border-amber-200 bg-amber-50 text-amber-700",
  anonymous: "border-slate-200 bg-slate-50 text-slate-600",
};

function Missing({ label }: { label: string }) {
  return (
    <span className="text-muted-foreground" title={`缺失：${label}`}>
      —
    </span>
  );
}

export function SourceBadge({ source }: { source: AwardSource }) {
  return (
    <Badge className={SOURCE_CLASS[source] ?? ""} variant="outline">
      {AWARD_SOURCE_LABEL[source] ?? source}
    </Badge>
  );
}

type Props = {
  rows: OfficialAwardRow[];
  total: number;
  loading: boolean;
  error?: string;
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

/** 桌面端获奖列表：复用 AdminDataTable，cursor 分页只保留上一页/下一页。 */
export function OfficialAwardTable({
  rows,
  total,
  loading,
  error,
  onRetry,
  expanded,
  onToggle,
  canCorrect,
  canVoid,
  onCorrect,
  onVoid,
  cursorPaging,
}: Props) {
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
              onClick={() => onToggle(row.original.awardId)}
            >
              {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            </button>
          );
        },
      },
      {
        accessorKey: "levelCode",
        header: "奖项",
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-0.5">
            <Badge variant="outline">{AWARD_LEVEL_LABEL[row.original.levelCode]}</Badge>
            {row.original.levelRaw ? (
              <span className="text-[11px] text-muted-foreground">原文：{row.original.levelRaw}</span>
            ) : null}
            {row.original.levelReviewRequired ? (
              <span className="text-[11px] text-amber-600">原文与规范等级需人工核对</span>
            ) : null}
            {row.original.voided ? (
              <Badge className="border-slate-300 bg-slate-100 text-[10px] text-slate-600" variant="outline">
                已撤销
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "awardYear",
        header: "年份",
        cell: ({ row }) => (row.original.awardYear ? row.original.awardYear : <Missing label="年份" />),
      },
      {
        accessorKey: "subTrack",
        header: "赛道",
        cell: ({ row }) => row.original.subTrack ?? <Missing label="赛道" />,
      },
      {
        accessorKey: "teamName",
        header: "团队",
        cell: ({ row }) => row.original.teamName ?? "—",
      },
      {
        accessorKey: "memberCount",
        header: "人数",
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
            <Users className="size-3.5" />
            {row.original.memberCount}
          </span>
        ),
      },
      {
        accessorKey: "advisors",
        header: "指导老师",
        cell: ({ row }) =>
          row.original.advisors.length > 0
            ? row.original.advisors.map((advisor) => advisor.name).join("、")
            : "无",
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
              disabled={!canCorrect || row.original.voided}
              size="sm"
              variant="ghost"
              onClick={() => onCorrect(row.original)}
            >
              <PencilLine className="size-4" />
              <span className="ml-1">更正</span>
            </Button>
            <Button
              aria-label="撤销该获奖事实"
              className="text-rose-600 hover:text-rose-700"
              disabled={!canVoid || row.original.voided}
              size="sm"
              variant="ghost"
              onClick={() => onVoid(row.original)}
            >
              <Ban className="size-4" />
              <span className="ml-1">撤销</span>
            </Button>
          </div>
        ),
      },
    ],
    [canCorrect, canVoid, expanded, onCorrect, onToggle, onVoid],
  );

  return (
    <AdminDataTable
      columns={columns}
      cursorPaging={cursorPaging}
      data={rows}
      emptyLabel="该比赛在当前筛选下还没有已确认的获奖事实。"
      error={error}
      hideSearch
      isRowExpanded={(row) => expanded.includes(row.awardId)}
      loading={loading}
      onPaginationChange={() => undefined}
      onRetry={onRetry}
      renderExpandedRow={(row) => (
        <div className="px-4 py-3">
          <p className="mb-2 text-xs text-muted-foreground">获奖成员（核实状态决定是否计入已核实去重人数）</p>
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
      pagination={{ pageIndex: 0, pageSize: 20 }}
      rowCount={total}
      searchPlaceholder="搜索获奖学生姓名"
    />
  );
}
