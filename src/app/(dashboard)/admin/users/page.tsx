"use client";

import { useEffect, useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";

import { AdminDataTable } from "@/components/admin/admin-data-table";
import { PageHeader } from "@/components/shared/page-header";
import { confirmI18n, useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignableUserRoles,
  describeRolePermissions,
  getRoleColorClass,
  getRoleLabel,
  type AssignableUserRole,
} from "@/lib/auth/role-utils";
import type { UserRole } from "@/lib/types";

type UserStatus = "active" | "pending_verification" | "disabled";

interface CompetitionOption {
  id: string;
  title: string;
}

interface RoleCatalogItem {
  role: AssignableUserRole;
  label: string;
  colorClass: string;
  description: string;
}

interface AdminRoleAssignmentRecord {
  id: string;
  role: UserRole;
  scopeType: "global" | "competition";
  competitionId: string | null;
  competitionTitle: string | null;
  expiresAt: string | null;
}

interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  college: string;
  status: UserStatus;
  primaryRole: UserRole;
  roleAssignments: AdminRoleAssignmentRecord[];
}

interface PagePermissions {
  canManageRoles: boolean;
  canDeleteUsers: boolean;
  canSearchExactEmail: boolean;
}

interface EditFormState {
  status: UserStatus;
  roles: AssignableUserRole[];
  competitionIds: string[];
}

const statusLabel: Record<UserStatus, string> = {
  active: "正常",
  pending_verification: "待验证",
  disabled: "已禁用",
};

const defaultEditFormState: EditFormState = {
  status: "active",
  roles: ["student_user"],
  competitionIds: [],
};

const roleCatalog: RoleCatalogItem[] = assignableUserRoles.map((role) => ({
  role,
  label: getRoleLabel(role),
  colorClass: getRoleColorClass(role),
  description: describeRolePermissions(role),
}));

function formatExpiryLabel(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
}

export default function AdminUsersPage() {
  const { tt } = useI18nText();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [permissions, setPermissions] = useState<PagePermissions>({
    canManageRoles: false,
    canDeleteUsers: false,
    canSearchExactEmail: false,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formState, setFormState] = useState<EditFormState>(defaultEditFormState);
  const [keyword, setKeyword] = useState("");

  const roleCatalogMap = new Map(roleCatalog.map((item) => [item.role, item]));

  async function fetchUsersPayload(searchKeyword: string) {
    const params = new URLSearchParams();
    if (searchKeyword.trim()) {
      params.set("keyword", searchKeyword.trim());
    }

    const query = params.toString();
    const response = await fetch(query ? `/api/admin/users?${query}` : "/api/admin/users", {
      cache: "no-store",
    });
    const payload = (await response.json()) as {
      users?: AdminUserRecord[];
      competitions?: CompetitionOption[];
      permissions?: PagePermissions;
      message?: string;
    };
    if (!response.ok) {
      throw new Error(payload.message ?? "加载用户数据失败");
    }
    return payload;
  }

  async function loadUsers(searchKeyword = keyword) {
    try {
      const payload = await fetchUsersPayload(searchKeyword);
      setUsers(payload.users ?? []);
      setCompetitions(payload.competitions ?? []);
      setPermissions(
        payload.permissions ?? {
          canManageRoles: false,
          canDeleteUsers: false,
          canSearchExactEmail: false,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "加载用户数据失败";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const payload = await fetchUsersPayload(keyword);
          if (cancelled) {
            return;
          }

          setUsers(payload.users ?? []);
          setCompetitions(payload.competitions ?? []);
          setPermissions(
            payload.permissions ?? {
              canManageRoles: false,
              canDeleteUsers: false,
              canSearchExactEmail: false,
            },
          );
        } catch (error) {
          if (cancelled) {
            return;
          }
          const message = error instanceof Error ? error.message : "加载用户数据失败";
          toast.error(message);
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      })();
    }, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [keyword]);

  function startEdit(user: AdminUserRecord) {
    if (!permissions.canManageRoles) {
      return;
    }

    const competitionIds = user.roleAssignments
      .filter(
        (item) =>
          item.role === "competition_admin" &&
          item.scopeType === "competition" &&
          item.competitionId,
      )
      .map((item) => item.competitionId!)
      .filter((id, index, arr) => arr.indexOf(id) === index);

    const roles = Array.from(
      new Set(
        user.roleAssignments.map(
          (item) =>
            (item.role === "content_editor" ? "business_admin" : item.role) as AssignableUserRole,
        ),
      ),
    );

    setEditingUserId(user.id);
    setFormState({
      status: user.status,
      roles: roles.length > 0 ? roles : ["student_user"],
      competitionIds,
    });
  }

  function cancelEdit() {
    setEditingUserId(null);
    setFormState(defaultEditFormState);
  }

  function toggleRole(role: AssignableUserRole, checked: boolean) {
    setFormState((prev) => {
      const nextRoles = checked
        ? Array.from(new Set([...prev.roles, role]))
        : prev.roles.filter((item) => item !== role);

      return {
        ...prev,
        roles: nextRoles.length > 0 ? nextRoles : ["student_user"],
        competitionIds:
          checked || role !== "competition_admin" ? prev.competitionIds : [],
      };
    });
  }

  async function submitEdit() {
    if (!editingUserId || !permissions.canManageRoles) return;

    if (formState.roles.includes("competition_admin") && formState.competitionIds.length === 0) {
      toast.error("比赛管理员必须至少指定一个比赛作用域");
      return;
    }

    setSubmitting(true);
    try {
      const roleAssignments: Array<{
        role: AssignableUserRole;
        competitionId: string | null;
      }> = [];

      for (const role of formState.roles) {
        if (role === "competition_admin") {
          for (const cid of formState.competitionIds) {
            roleAssignments.push({ role, competitionId: cid });
          }
        } else {
          roleAssignments.push({ role, competitionId: null });
        }
      }

      const response = await fetch(`/api/admin/users/${editingUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: formState.status,
          roleAssignments,
        }),
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "更新用户失败");
      }

      toast.success("用户信息已更新");
      cancelEdit();
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "更新用户失败";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteUser(user: AdminUserRecord) {
    if (!permissions.canDeleteUsers) {
      return;
    }

    const confirmed = confirmI18n(
      `确定删除用户“${user.name}”吗？这会清理该用户的报名、会话、日志和个人资料数据，且不可恢复。`,
    );
    if (!confirmed) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(payload.message ?? "删除用户失败");
      }

      if (editingUserId === user.id) {
        cancelEdit();
      }

      toast.success(payload.message ?? "用户已删除");
      await loadUsers();
    } catch (error) {
      const message = error instanceof Error ? error.message : "删除用户失败";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const columns: ColumnDef<AdminUserRecord>[] = [
    {
      accessorKey: "name",
      header: "用户",
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      id: "roles",
      header: "权限组",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {row.original.roleAssignments.map((item) => {
            const roleKey =
              (item.role === "content_editor" ? "business_admin" : item.role) as AssignableUserRole;
            const catalog = roleCatalogMap.get(roleKey);
            const expiryLabel = formatExpiryLabel(item.expiresAt);

            return (
              <Badge
                key={`${row.original.id}-${item.id}`}
                variant="outline"
                className={catalog?.colorClass}
              >
                {catalog?.label ?? roleKey}
                {expiryLabel ? ` · 到期 ${expiryLabel}` : ""}
              </Badge>
            );
          })}
        </div>
      ),
    },
    {
      accessorKey: "college",
      header: "院系",
    },
    {
      accessorKey: "status",
      header: "账号状态",
      cell: ({ row }) => <Badge variant="outline">{statusLabel[row.original.status]}</Badge>,
    },
    {
      id: "scope",
      header: "比赛作用域",
      cell: ({ row }) => {
        const scoped = row.original.roleAssignments
          .filter((item) => item.scopeType === "competition")
          .map((item) => item.competitionTitle ?? item.competitionId ?? "-");
        return scoped.length > 0 ? scoped.join("、") : "全局";
      },
    },
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          {permissions.canManageRoles ? (
            <Button variant="outline" size="sm" onClick={() => startEdit(row.original)}>
              编辑
            </Button>
          ) : null}
          {permissions.canDeleteUsers ? (
            <Button
              variant="outline"
              size="sm"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
              onClick={() => void deleteUser(row.original)}
              disabled={submitting}
            >
              删除
            </Button>
          ) : null}
          {!permissions.canManageRoles && !permissions.canDeleteUsers ? (
            <span className="text-xs text-muted-foreground">只读</span>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="用户管理"
          title="用户与权限组"
          description="支持同一用户配置多项权限；安全权限可只读访问本页并执行用户删除。"
        />

        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>权限说明</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {roleCatalog.map((item) => (
              <div key={item.role} className="rounded-xl border border-border/60 p-4">
                <Badge variant="outline" className={item.colorClass}>
                  {item.label}
                </Badge>
                <p className="mt-3 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {editingUserId && permissions.canManageRoles ? (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>编辑用户权限</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>账号状态</Label>
                  <Select
                    value={formState.status}
                    onValueChange={(value) =>
                      setFormState((prev) => ({ ...prev, status: value as UserStatus }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">正常</SelectItem>
                      <SelectItem value="pending_verification">待验证</SelectItem>
                      <SelectItem value="disabled">已禁用</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>比赛作用域（可多选）</Label>
                  <div className="grid max-h-60 gap-2 overflow-y-auto rounded-xl border border-border/60 p-3 md:grid-cols-2 xl:grid-cols-3">
                    {competitions.length === 0 ? (
                      <p className="col-span-full text-sm text-muted-foreground">暂无比赛数据</p>
                    ) : (
                      competitions.map((item) => {
                        const checked = formState.competitionIds.includes(item.id);
                        return (
                          <label
                            key={item.id}
                            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2 text-sm transition-colors hover:bg-accent/50 ${
                              checked ? "border-primary bg-primary/5" : "border-border/60"
                            }`}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={!formState.roles.includes("competition_admin")}
                              onCheckedChange={(value) => {
                                setFormState((prev) => ({
                                  ...prev,
                                  competitionIds: value
                                    ? [...prev.competitionIds, item.id]
                                    : prev.competitionIds.filter((id) => id !== item.id),
                                }));
                              }}
                            />
                            <span className="leading-tight">{item.title}</span>
                          </label>
                        );
                      })
                    )}
                  </div>
                  {formState.roles.includes("competition_admin") &&
                  formState.competitionIds.length === 0 ? (
                    <p className="text-xs text-amber-600">请至少选择一个比赛</p>
                  ) : null}
                </div>
              </div>

              <div className="space-y-3">
                <Label>权限组</Label>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {roleCatalog.map((item) => {
                    const checked = formState.roles.includes(item.role);
                    return (
                      <label
                        key={item.role}
                        className="flex items-start gap-3 rounded-xl border border-border/60 p-4"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(value) => toggleRole(item.role, value === true)}
                          className="mt-1"
                        />
                        <div className="space-y-2">
                          <Badge variant="outline" className={item.colorClass}>
                            {item.label}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={submitEdit} disabled={submitting}>
                  {submitting ? "保存中..." : "保存"}
                </Button>
                <Button variant="outline" onClick={cancelEdit} disabled={submitting}>
                  取消
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <AdminDataTable
          data={users}
          columns={columns}
          searchPlaceholder={
            permissions.canSearchExactEmail
              ? tt("按姓名、完整邮箱、脱敏邮箱、院系、状态或权限搜索")
              : tt("按姓名、脱敏邮箱、院系、状态或权限搜索")
          }
          searchValue={keyword}
          onSearchChange={(value) => {
            setLoading(true);
            setKeyword(value);
          }}
          emptyLabel={loading ? tt("用户数据加载中...") : tt("暂无用户记录")}
        />
      </div>
    </div>
  );
}
