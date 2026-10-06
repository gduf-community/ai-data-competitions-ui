"use client";

import { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";

import {
  getSafeStorageItem,
  removeSafeStorageItem,
  setSafeStorageItem,
} from "@/lib/safe-storage";
import { confirmI18n, useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { formatNoticeDate } from "@/lib/notice-format";
import { requestJSON } from "@/lib/http-client";
import { useJSONResource } from "@/hooks/use-json-resource";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { RichTextEditor } from "@/components/forms/rich-text-editor";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NoticeStatus = "draft" | "published" | "withdrawn";

const GLOBAL_NOTICE_VALUE = "__global__";

interface NoticeRecord {
  id: string;
  competitionId: string | null;
  title: string;
  competition: string;
  status: NoticeStatus;
  updatedAt: string;
  content?: string;
}

interface CompetitionOption {
  id: string;
  title: string;
}

interface NoticeFormValues {
  competitionId: string;
  title: string;
  content: string;
  status: NoticeStatus;
}

const statusLabelMap: Record<NoticeStatus, string> = {
  draft: "草稿",
  published: "已发布",
  withdrawn: "已下线",
};

const defaultFormValues: NoticeFormValues = {
  competitionId: "",
  title: "",
  content: "",
  status: "draft",
};

function stripHtmlTags(value: string) {
  return value
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildExcerpt(content: string | undefined) {
  const plain = stripHtmlTags(content ?? "");
  if (!plain) return "暂无内容";
  return plain.length > 48 ? `${plain.slice(0, 48)}...` : plain;
}

function getDraftStorageKey(editingId: string | null) {
  return `admin-notice-draft:${editingId ?? "new"}`;
}

interface NoticeListResponse { notices: NoticeRecord[]; competitions: CompetitionOption[]; canManageGlobal: boolean }
function parseNotices(payload: unknown): NoticeListResponse {
  if (!payload || typeof payload !== "object" || !("notices" in payload) || !Array.isArray(payload.notices) || !("competitions" in payload) || !Array.isArray(payload.competitions) || !("canManageGlobal" in payload) || typeof payload.canManageGlobal !== "boolean") throw new Error("通知列表响应不完整，请重试");
  return payload as NoticeListResponse;
}

export default function AdminNoticesPage() {
  const { tt } = useI18nText();
  const resource = useJSONResource("/api/admin/notices", parseNotices);
  const notices = resource.data?.notices ?? [];
  const competitions = resource.data?.competitions ?? [];
  const canManageGlobal = resource.data?.canManageGlobal ?? false;
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<NoticeFormValues>(defaultFormValues);

  function openCreateForm() {
    if (saving) return;
    const competitionId = competitions[0]?.id ?? (canManageGlobal ? GLOBAL_NOTICE_VALUE : "");
    setEditingId(null);
    setFormValues({
      ...defaultFormValues,
      competitionId,
    });
    setShowForm(true);
  }

  function openEditForm(notice: NoticeRecord) {
    if (saving) return;
    setEditingId(notice.id);
    setFormValues({
      competitionId: notice.competitionId ?? GLOBAL_NOTICE_VALUE,
      title: notice.title,
      content: notice.content ?? "",
      status: notice.status,
    });
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setFormValues(defaultFormValues);
  }

  function saveDraftToLocal() {
    const draftKey = getDraftStorageKey(editingId);
    const ok = setSafeStorageItem(
      draftKey,
      JSON.stringify({
        ...formValues,
        savedAt: Date.now(),
      }),
    );
    if (!ok) {
      toast.error("当前浏览器不支持本地草稿暂存");
      return;
    }
    toast.success("草稿已暂存到本地浏览器");
  }

  function restoreDraftFromLocal() {
    const draftKey = getDraftStorageKey(editingId);
    const raw = getSafeStorageItem(draftKey);
    if (!raw) {
      toast.error("没有可恢复的草稿");
      return;
    }

    try {
      const draft = JSON.parse(raw) as Partial<NoticeFormValues>;
      setFormValues((prev) => ({
        ...prev,
        competitionId: draft.competitionId ?? prev.competitionId,
        title: draft.title ?? prev.title,
        content: draft.content ?? prev.content,
        status: draft.status ?? prev.status,
      }));
      toast.success("草稿已恢复");
    } catch {
      toast.error("草稿内容损坏，恢复失败");
    }
  }

  async function submitForm() {
    if (!formValues.competitionId) {
      toast.error("请选择归属比赛或全站通知");
      return;
    }

    if (formValues.title.trim().length < 2) {
      toast.error("通知标题至少 2 个字符");
      return;
    }

    if (stripHtmlTags(formValues.content).length < 2) {
      toast.error("通知内容至少 2 个字符");
      return;
    }

    const competitionId =
      formValues.competitionId === GLOBAL_NOTICE_VALUE ? null : formValues.competitionId;

    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/notices/${editingId}`
        : "/api/admin/notices";
      const method = editingId ? "PATCH" : "POST";
      await requestJSON(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          competitionId,
          title: formValues.title.trim(),
          content: formValues.content,
          status: formValues.status,
        }),
      });

      removeSafeStorageItem(getDraftStorageKey(editingId));
      toast.success(editingId ? "通知已更新" : "通知已创建");
      closeForm();
      resource.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "保存通知失败";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  async function removeNotice(notice: NoticeRecord) {
    if (!confirmI18n(`确认删除通知《${notice.title}》吗？`)) {
      return;
    }

    try {
      await requestJSON(`/api/admin/notices/${notice.id}`, {
        method: "DELETE", expect: "empty",
      });
      toast.success("通知已删除");
      resource.reload();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除通知失败";
      toast.error(message);
    }
  }

  const columns: ColumnDef<NoticeRecord>[] = [
    {
      accessorKey: "title",
      header: "通知标题",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.title}</div>
          <div className="text-xs text-muted-foreground">
            {buildExcerpt(row.original.content)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "competition",
      header: "归属范围",
      cell: ({ row }) => row.original.competition || "全站通知",
    },
    {
      accessorKey: "status",
      header: "状态",
      cell: ({ row }) => (
        <Badge variant="outline">{statusLabelMap[row.original.status]}</Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "更新时间",
      cell: ({ row }) => formatNoticeDate(row.original.updatedAt),
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => openEditForm(row.original)}
          >
            编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void removeNotice(row.original)}
          >
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="通知管理"
          title="通知管理"
          description="支持比赛通知与全站通知的富文本编辑、发布状态控制和草稿暂存。"
          actions={
            <Button
              onClick={openCreateForm}
              disabled={competitions.length === 0 && !canManageGlobal}
            >
              发布通知
            </Button>
          }
        />

        {showForm ? (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>{editingId ? "编辑通知" : "新建通知"}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>归属范围</Label>
                  <Select
                    value={formValues.competitionId}
                    onValueChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        competitionId: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={tt("请选择比赛或全站通知")} />
                    </SelectTrigger>
                    <SelectContent>
                      {canManageGlobal ? (
                        <SelectItem value={GLOBAL_NOTICE_VALUE}>全站通知</SelectItem>
                      ) : null}
                      {competitions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>发布状态</Label>
                  <Select
                    value={formValues.status}
                    onValueChange={(value) =>
                      setFormValues((prev) => ({
                        ...prev,
                        status: value as NoticeStatus,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">草稿</SelectItem>
                      <SelectItem value="published">发布</SelectItem>
                      <SelectItem value="withdrawn">下线</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notice-title">通知标题</Label>
                <Input
                  id="notice-title"
                  value={formValues.title}
                  onChange={(event) =>
                    setFormValues((prev) => ({
                      ...prev,
                      title: event.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>通知内容（富文本）</Label>
                <RichTextEditor
                  key={editingId ?? "new-notice"}
                  value={formValues.content}
                  onChange={(value) =>
                    setFormValues((prev) => ({
                      ...prev,
                      content: value,
                    }))
                  }
                  placeholder={tt("支持加粗、斜体、列表和链接")}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void submitForm()} disabled={saving}>
                  {saving ? "保存中..." : editingId ? "保存修改" : "创建通知"}
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={saveDraftToLocal}
                  disabled={saving}
                >
                  暂存草稿
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={restoreDraftFromLocal}
                  disabled={saving}
                >
                  恢复草稿
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={closeForm}
                  disabled={saving}
                >
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <AdminDataTable
          data={notices}
          getRowId={item => item.id}
          loading={resource.loading}
          error={resource.error}
          onRetry={resource.reload}
          columns={columns}
          searchPlaceholder={tt("搜索通知标题或归属范围")}
          emptyLabel={tt("暂无通知记录")}
        />
      </div>
    </div>
  );
}
