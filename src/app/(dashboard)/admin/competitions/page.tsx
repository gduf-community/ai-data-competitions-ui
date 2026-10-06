"use client";
import { useEffect, useRef, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { CompetitionEditor, type CompetitionFormRequest } from "@/components/admin/competition-editor";
import { CompetitionStatusBadge } from "@/components/competitions/competition-status-badge";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { confirmI18n, useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { formatRegistrationWindow } from "@/lib/competition-date";
import { isAbortError, requestJSON } from "@/lib/http-client";
import { useJSONResource } from "@/hooks/use-json-resource";
import type { Competition, CompetitionCtaType, CompetitionRecognition } from "@/lib/types";
const ctaTypeLabel: Record<CompetitionCtaType, string> = {
  internal_only: "仅校内报名", official_plus_profile: "官网 + 校内资料", official_only: "仅官网报名",
};
function parseCompetitions(payload: unknown): Competition[] {
  if (!payload || typeof payload !== "object" || !("competitions" in payload) || !Array.isArray(payload.competitions)) throw new Error("比赛列表响应不完整，请重试");
  return payload.competitions;
}
export default function AdminCompetitionsPage() {
  const { tt } = useI18nText();
  const resource = useJSONResource("/api/admin/competitions", parseCompetitions);
  const [editing, setEditing] = useState<Competition>();
  const [showForm, setShowForm] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  useEffect(() => () => detailRequest.current?.abort(), []);
  function cancelDetail() { detailRequest.current?.abort(); detailRequest.current = null; setDetailLoading(false); }
  function startCreate() {
    if (saving) return;
    cancelDetail(); setEditing(undefined); setEditorKey(key => key + 1); setShowForm(true);
  }
  async function startEdit(item: Competition) {
    if (saving) return;
    cancelDetail();
    setShowForm(false); setEditing(undefined);
    const controller = new AbortController();
    detailRequest.current = controller; setDetailLoading(true);
    try {
      const payload = await requestJSON<{ competition?: Competition }>("/api/admin/competitions/" + item.id, { cache: "no-store", signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!payload.competition || payload.competition.id !== item.id) throw new Error("比赛详情响应不完整");
      setEditing(payload.competition); setEditorKey(key => key + 1); setShowForm(true);
    } catch (error) {
      if (!controller.signal.aborted && !isAbortError(error)) toast.error(error instanceof Error ? error.message : "加载比赛详情失败");
    } finally { if (detailRequest.current === controller) setDetailLoading(false); }
  }
  function cancelForm() { cancelDetail(); setShowForm(false); setEditing(undefined); }
  async function saveCompetition(input: CompetitionFormRequest) {
    setSaving(true);
    try {
      await requestJSON(editing ? "/api/admin/competitions/" + editing.id : "/api/admin/competitions", { method: editing ? "PATCH" : "POST", json: input });
      toast.success(editing ? "比赛已更新" : "比赛已创建"); cancelForm(); resource.reload();
    } finally { setSaving(false); }
  }
  async function handleDelete(item: Competition) {
    if (saving || !confirmI18n("确认删除比赛「" + item.title + "」吗？")) return;
    setSaving(true);
    try {
      await requestJSON("/api/admin/competitions/" + item.id, { method: "DELETE", expect: "empty" });
      toast.success("比赛已删除"); resource.reload();
    } catch (error) { toast.error(error instanceof Error ? error.message : "删除比赛失败"); }
    finally { setSaving(false); }
  }
  const columns: ColumnDef<Competition>[] = [
    {
      accessorKey: "title",
      header: "比赛标题",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.title}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.competitionYear} 年 · {row.original.category}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "recognition",
      header: "认可标签",
      cell: ({ row }) => {
        const recognitionLabelMap: Record<CompetitionRecognition, string> = {
          school_listed: "校内名单",
          national_listed: "全国名单",
          school_and_national: "校内名单+全国名单",
          unlisted: "名单外",
        };
        return recognitionLabelMap[row.original.recognition];
      },
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => <CompetitionStatusBadge status={row.original.status} />,
    },
    {
      id: "registrationWindow",
      header: "报名时间",
      cell: ({ row }) => formatRegistrationWindow(row.original),
    },
    {
      id: "maxTeamSize",
      header: "队伍上限",
      cell: ({ row }) =>
        row.original.registrationMode === "team"
          ? `${row.original.maxTeamSize ?? 5} 人`
          : "-",
    },
    {
      id: "entry",
      header: "报名入口",
      cell: ({ row }) => (
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>{ctaTypeLabel[row.original.ctaType]}</div>
          {row.original.officialUrl ? <div>官网链接已配置</div> : null}
          {row.original.wechatArticleUrl ? <div>推文链接已配置</div> : null}
        </div>
      ),
    },
    {
      accessorKey: "department",
      header: "主办院系",
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={saving} onClick={() => startEdit(row.original)}>
            编辑
          </Button>
          <Button variant="outline" size="sm" disabled={saving} onClick={() => handleDelete(row.original)}>
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 lg:px-6"><div className="space-y-8">
      <PageHeader eyebrow="比赛管理" title="竞赛管理" description="创建与编辑比赛：标题、时间、赛程、FAQ、附件等全字段管理。"
        actions={<Button onClick={startCreate} disabled={saving}>新建比赛</Button>} />
      {detailLoading ? <div role="status">正在加载比赛详情… <Button variant="ghost" onClick={cancelDetail}>取消</Button></div> : null}
      {showForm ? <CompetitionEditor key={editorKey} competition={editing} submitting={saving} onSave={saveCompetition} onCancel={cancelForm} /> : null}
      <AdminDataTable data={resource.data ?? []} columns={columns} getRowId={item => item.id}
        searchPlaceholder={tt("按比赛标题、分类或院系搜索")} emptyLabel={tt("暂无比赛记录")}
        loading={resource.loading} error={resource.error} onRetry={resource.reload} />
    </div></div>
  );
}
