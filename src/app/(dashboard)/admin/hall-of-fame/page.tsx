"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import {
  HallOfFameEditDialog,
  type HallOfFameFormData,
} from "@/components/admin/hall-of-fame-edit-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/lib/i18n/toast";

interface HallOfFameEntry {
  id: string;
  userId: string;
  userName: string;
  college: string | null;
  tag: string;
  bio: string;
  adminBio: string | null;
  status: "invited" | "candidate" | "active" | "hidden";
  displayOrder: number;
}

interface HallOfFamePayload {
  data?: HallOfFameEntry[];
  permissions?: {
    canManage?: boolean;
  };
  message?: string;
}

const statusLabels: Record<HallOfFameEntry["status"], string> = {
  invited: "已邀请",
  candidate: "待审核",
  active: "展示中",
  hidden: "已隐藏",
};

const statusVariants: Record<
  HallOfFameEntry["status"],
  "default" | "secondary" | "destructive"
> = {
  invited: "secondary",
  candidate: "secondary",
  active: "default",
  hidden: "destructive",
};

export default function AdminHallOfFamePage() {
  const [entries, setEntries] = useState<HallOfFameEntry[]>([]);
  const [canManage, setCanManage] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HallOfFameEntry | null>(null);

  async function fetchEntriesData(): Promise<HallOfFameEntry[]> {
    const res = await fetch("/api/admin/hall-of-fame");
    const payload = (await res.json()) as HallOfFamePayload;
    if (!res.ok) {
      throw new Error(payload.message ?? "获取名人堂列表失败");
    }

    setCanManage(payload.permissions?.canManage === true);
    return payload.data ?? [];
  }

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await fetchEntriesData();
        if (!cancelled) {
          setEntries(data);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "获取名人堂列表失败");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function reloadEntries() {
    setLoading(true);
    try {
      const nextData = await fetchEntriesData();
      setEntries(nextData);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "获取名人堂列表失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(data: HallOfFameFormData) {
    try {
      const url = editing
        ? `/api/admin/hall-of-fame/${editing.id}`
        : "/api/admin/hall-of-fame";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(payload.message ?? "操作失败");
      }

      toast.success(editing ? "已更新名人堂条目" : "已发送名人堂邀请");
      setDialogOpen(false);
      setEditing(null);
      await reloadEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除该名人堂条目吗？")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/hall-of-fame/${id}`, {
        method: "DELETE",
      });
      const payload = (await res.json().catch(() => ({}))) as {
        message?: string;
      };
      if (!res.ok) {
        throw new Error(payload.message ?? "操作失败");
      }

      toast.success("已删除名人堂条目");
      await reloadEntries();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    }
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="名人堂邀请与审核"
          title="名人堂管理"
          description="查看名人堂候选与展示条目；高权限账号可发起邀请、编辑资料并维护展示状态。"
          actions={
            canManage ? (
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
              当前账号为只读后台权限，可查看名人堂管理数据，但不可发起邀请、编辑或删除条目。
            </CardContent>
          </Card>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground">加载中...</p>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-sm text-muted-foreground">
              暂无名人堂条目
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{entry.userName}</span>
                      <Badge variant={statusVariants[entry.status]}>
                        {statusLabels[entry.status]}
                      </Badge>
                      {entry.tag ? <Badge variant="outline">{entry.tag}</Badge> : null}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {entry.college ?? "未填写学院"} | 排序：{entry.displayOrder}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="whitespace-pre-wrap text-slate-700">
                        学生简介：{entry.bio || "未填写"}
                      </p>
                      <p className="whitespace-pre-wrap text-slate-500">
                        管理员备注：{entry.adminBio || "未填写"}
                      </p>
                    </div>
                  </div>

                  {canManage ? (
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditing(entry);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="mr-1 size-3.5" />
                        编辑
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void handleDelete(entry.id)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        删除
                      </Button>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">只读模式</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <HallOfFameEditDialog
          key={`${editing?.id ?? "new"}-${dialogOpen ? "open" : "closed"}`}
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) {
              setEditing(null);
            }
          }}
          defaultValues={
            editing
              ? {
                  email: "",
                  tag: editing.tag,
                  bio: editing.bio,
                  adminBio: editing.adminBio ?? "",
                  status: editing.status,
                  displayOrder: editing.displayOrder,
                }
              : undefined
          }
          onSave={handleSave}
          isEdit={Boolean(editing)}
        />
      </div>
    </div>
  );
}
