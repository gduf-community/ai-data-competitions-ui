"use client";

import { useEffect, useMemo, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { ApplicationReviewDialog } from "@/components/admin/application-review-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { confirmI18n, promptI18n, useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApplicationRecord } from "@/lib/types";

const statusText: Record<ApplicationRecord["status"], string> = {
  draft: "草稿",
  submitted: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  withdrawn: "已撤回",
  cancelled: "已取消",
};

const statusColorClass: Record<ApplicationRecord["status"], string> = {
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  submitted: "border-sky-200 bg-sky-50 text-sky-700",
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-rose-200 bg-rose-50 text-rose-700",
  withdrawn: "border-amber-200 bg-amber-50 text-amber-700",
  cancelled: "border-slate-200 bg-slate-100 text-slate-500",
};

export default function AdminApplicationsPage() {
  const { tt } = useI18nText();
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("all");
  const [competitionId, setCompetitionId] = useState("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        const params = new URLSearchParams();
        if (keyword.trim()) params.set("keyword", keyword.trim());
        if (status !== "all") params.set("status", status);
        if (competitionId !== "all") params.set("competitionId", competitionId);

        const response = await fetch(`/api/admin/applications?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error("加载报名数据失败");
        }
        const payload = (await response.json()) as { applications: ApplicationRecord[] };
        if (!active) return;

        setApplications(payload.applications ?? []);
        setSelectedIds((prev) =>
          prev.filter((id) => (payload.applications ?? []).some((item) => item.id === id)),
        );
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error ? error.message : "加载报名数据失败";
        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [competitionId, keyword, refreshKey, status]);

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, id])] : prev.filter((item) => item !== id),
    );
  };

  const allChecked = useMemo(
    () => applications.length > 0 && selectedIds.length === applications.length,
    [applications.length, selectedIds.length],
  );

  const competitionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of applications) {
      map.set(item.competitionId, item.competitionTitle);
    }
    return [...map.entries()].map(([id, title]) => ({ id, title }));
  }, [applications]);

  const openExport = (format: "csv" | "xlsx") => {
    if (competitionId === "all") {
      toast.error("请先选择单个比赛，再导出报名数据");
      return;
    }

    if (!confirmI18n("导出将记录到审计日志，是否继续？")) {
      return;
    }

    const params = new URLSearchParams({
      format,
      competitionId,
    });
    window.open(`/api/admin/applications/export?${params.toString()}`, "_blank");
  };

  const runBulkAction = async (
    action: "approve" | "reject" | "withdraw" | "cancel",
    fallbackComment: string,
  ) => {
    if (selectedIds.length === 0) {
      toast.error("请先选择要处理的报名记录");
      return;
    }

    const input = promptI18n("请输入批量处理备注", fallbackComment);
    if (!input || !input.trim()) {
      return;
    }

    try {
      const response = await fetchWithCsrf("/api/admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: selectedIds,
          action,
          comment: input.trim(),
          competitionId: competitionId === "all" ? undefined : competitionId,
        }),
      });

      const payload = (await response.json()) as { updated?: number; message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "批量处理失败");
      }

      toast.success(`批量处理完成：${payload.updated ?? 0} 条`);
      setSelectedIds([]);
      setLoading(true);
      setRefreshKey((value) => value + 1);
    } catch (error) {
      const message = error instanceof Error ? error.message : "批量处理失败";
      toast.error(message);
    }
  };

  const columns = useMemo<ColumnDef<ApplicationRecord>[]>(
    () => [
      {
        id: "select",
        header: () => (
          <Checkbox
            checked={allChecked}
            onCheckedChange={(checked) => {
              const next = Boolean(checked);
              setSelectedIds(next ? applications.map((item) => item.id) : []);
            }}
            aria-label="全选当前列表"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={(checked) =>
              toggleSelected(row.original.id, Boolean(checked))
            }
            aria-label={`选择 ${row.original.id}`}
          />
        ),
      },
      {
        accessorKey: "competitionTitle",
        header: "比赛 / 申请人",
        cell: ({ row }) => (
          <div className="space-y-1">
            <div className="font-medium">{row.original.competitionTitle}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.applicantName} · {row.original.college}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "status",
        header: "审核状态",
        cell: ({ row }) => (
          <Badge variant="outline" className={statusColorClass[row.original.status]}>
            {statusText[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "submittedAt",
        header: "提交时间",
      },
      {
        accessorKey: "reviewer",
        header: "审核人",
      },
      {
        id: "actions",
        header: "操作",
        cell: ({ row }) => (
          <ApplicationReviewDialog
            application={row.original}
            onUpdated={() => {
              setLoading(true);
              setRefreshKey((value) => value + 1);
            }}
          />
        ),
      },
    ],
    [allChecked, applications, selectedIds],
  );

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="报名审核"
          title="报名审核"
          description="该页面已接入真实数据层，支持筛选、批量审核、CSV/XLSX 导出与单条审核。"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => openExport("csv")}
              >
                导出 CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => openExport("xlsx")}
              >
                导出 XLSX
              </Button>
            </div>
          }
        />

        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr_1fr_auto]">
            <Input
              value={keyword}
              onChange={(event) => {
                setLoading(true);
                setKeyword(event.target.value);
              }}
              placeholder={tt("按比赛、申请人、学院筛选")}
            />
            <Select
              value={status}
              onValueChange={(value) => {
                setLoading(true);
                setStatus(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={tt("状态筛选")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="draft">草稿</SelectItem>
                <SelectItem value="submitted">待审核</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已驳回</SelectItem>
                <SelectItem value="withdrawn">已撤回</SelectItem>
                <SelectItem value="cancelled">已取消</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={competitionId}
              onValueChange={(value) => {
                setLoading(true);
                setCompetitionId(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={tt("比赛筛选")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部比赛</SelectItem>
                {competitionOptions.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                setLoading(true);
                setRefreshKey((value) => value + 1);
              }}
              disabled={loading}
            >
              刷新数据
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{tt(`已选 ${selectedIds.length} 条`)}</Badge>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void runBulkAction("approve", "批量审核通过")}
            >
              批量通过
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runBulkAction("reject", "批量驳回，请补充材料")}
            >
              批量驳回
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runBulkAction("cancel", "批量取消报名")}
            >
              批量取消
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-xl border border-dashed border-border/60 p-8 text-sm text-muted-foreground">
            加载报名数据中...
          </div>
        ) : (
          <AdminDataTable
            data={applications}
            columns={columns}
            searchPlaceholder={tt("搜索比赛、申请人或学院")}
            emptyLabel={tt("暂无报名申请")}
          />
        )}
      </div>
    </div>
  );
}
