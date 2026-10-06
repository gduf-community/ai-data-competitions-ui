"use client";
import { useState } from "react";

import { Loader2, ShieldAlert, Trash2 } from "lucide-react";

import { toast } from "@/lib/i18n/toast";
import type {
  SituationAccessLogView,
  SituationAccessPolicyView,
  SituationWhitelistEntryView,
} from "@/lib/security/types";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Switch } from "@/components/ui/switch";

import {
  getFriendlyUiMessage,
  reportSecurityUiIssue,
} from "@/lib/security/security-ui-monitor";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatDateTime,
  formatRegion,
} from "./security-situation-presentation";

import type { useSituationData } from "./use-situation-data";

export function useSituationControls(
  data: ReturnType<typeof useSituationData>,
) {
  const { policy, setPolicy, whitelist, setWhitelist } = data;
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [addingWhitelist, setAddingWhitelist] = useState(false);
  const [form, setForm] = useState({
    ipCidr: "",
    remark: "",
    expiresAt: "",
  });

  const savePolicy = async () => {
    if (!policy) return;
    setSavingPolicy(true);
    try {
      const response = await fetchWithCsrf(
        "/api/admin/security/access-policy",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            enabled: policy.enabled,
            config: policy.config,
          }),
        },
      );
      const data = (await response.json()) as {
        message?: string;
        policy?: SituationAccessPolicyView;
      };
      if (!response.ok || !data.policy) {
        throw new Error(data.message ?? "保存策略失败");
      }
      setPolicy(data.policy);
      toast.success("访问策略已更新");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("保存访问策略"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "保存访问策略失败",
        metadata: {
          module: "security_situation_dashboard",
          detail,
        },
      });
    } finally {
      setSavingPolicy(false);
    }
  };

  const addWhitelist = async () => {
    if (!form.ipCidr.trim()) {
      toast.error("请填写 IP 或 CIDR");
      return;
    }
    setAddingWhitelist(true);
    try {
      const response = await fetchWithCsrf("/api/admin/security/ip-whitelist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ipCidr: form.ipCidr.trim(),
          remark: form.remark.trim() || null,
          expiresAt: form.expiresAt
            ? new Date(form.expiresAt).toISOString()
            : null,
        }),
      });
      const data = (await response.json()) as {
        message?: string;
        item?: SituationWhitelistEntryView;
      };
      const createdItem = data.item;
      if (!response.ok || !createdItem) {
        throw new Error(data.message ?? "新增白名单失败");
      }
      setWhitelist((prev) => [createdItem, ...prev]);
      setForm({ ipCidr: "", remark: "", expiresAt: "" });
      toast.success("已添加白名单");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("新增白名单"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "新增白名单失败",
        metadata: {
          module: "security_situation_dashboard",
          detail,
        },
      });
    } finally {
      setAddingWhitelist(false);
    }
  };

  const removeWhitelist = async (id: number) => {
    try {
      const response = await fetchWithCsrf(
        `/api/admin/security/ip-whitelist/${id}`,
        {
          method: "DELETE",
        },
      );
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "删除失败");
      }
      setWhitelist((prev) => prev.filter((item) => item.id !== id));
      toast.success("已删除白名单");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("删除白名单"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "删除白名单失败",
        metadata: {
          module: "security_situation_dashboard",
          detail,
          whitelistId: id,
        },
      });
    }
  };

  const fillWhitelistForm = (eventItem: SituationAccessLogView) => {
    setForm((prev) => ({
      ...prev,
      ipCidr: eventItem.ip,
      remark: prev.remark || `来自 ${formatRegion(eventItem)} 的临时放行`,
    }));
    toast.success("已填入白名单表单，请确认后保存");
  };

  return {
    policy,
    setPolicy,
    whitelist,
    savingPolicy,
    addingWhitelist,
    form,
    setForm,
    savePolicy,
    addWhitelist,
    removeWhitelist,
    fillWhitelistForm,
  };
}
export function SecuritySituationControls({
  controls,
}: {
  controls: ReturnType<typeof useSituationControls>;
}) {
  const {
    policy,
    setPolicy,
    whitelist,
    savingPolicy,
    addingWhitelist,
    form,
    setForm,
    savePolicy,
    addWhitelist,
    removeWhitelist,
  } = controls;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>访问策略</CardTitle>
            <CardDescription>策略调整会影响后续访问判断</CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => void savePolicy()}
            disabled={savingPolicy || !policy}
          >
            {savingPolicy ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ShieldAlert className="mr-2 size-4" />
            )}
            保存策略
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label htmlFor="policy-enabled">策略启用</Label>
            <Switch
              id="policy-enabled"
              checked={policy?.enabled ?? false}
              onCheckedChange={(checked) =>
                setPolicy((prev) =>
                  prev ? { ...prev, enabled: checked } : prev,
                )
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label htmlFor="policy-whitelist">白名单放行</Label>
            <Switch
              id="policy-whitelist"
              checked={policy?.config.allowWhitelist ?? false}
              onCheckedChange={(checked) =>
                setPolicy((prev) =>
                  prev
                    ? {
                        ...prev,
                        config: { ...prev.config, allowWhitelist: checked },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label htmlFor="policy-unknown">未知地区拦截</Label>
            <Switch
              id="policy-unknown"
              checked={policy?.config.blockUnknownRegion ?? false}
              onCheckedChange={(checked) =>
                setPolicy((prev) =>
                  prev
                    ? {
                        ...prev,
                        config: { ...prev.config, blockUnknownRegion: checked },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <Label htmlFor="policy-admin-bypass">管理员绕过</Label>
            <Switch
              id="policy-admin-bypass"
              checked={policy?.config.adminBypass ?? false}
              onCheckedChange={(checked) =>
                setPolicy((prev) =>
                  prev
                    ? {
                        ...prev,
                        config: { ...prev.config, adminBypass: checked },
                      }
                    : prev,
                )
              }
            />
          </div>
          <div className="space-y-2 rounded-lg border border-border/60 p-3">
            <Label htmlFor="policy-provinces">允许省份（逗号分隔）</Label>
            <Input
              id="policy-provinces"
              placeholder="当前线上默认仅保留广东省"
              value={policy?.config.allowProvinces.join(",") ?? ""}
              onChange={(event) =>
                setPolicy((prev) =>
                  prev
                    ? {
                        ...prev,
                        config: {
                          ...prev.config,
                          allowProvinces: event.target.value
                            .split(",")
                            .map((item) => item.trim())
                            .filter(Boolean),
                        },
                      }
                    : prev,
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>IP 白名单</CardTitle>
          <CardDescription>快速放行可信来源，支持过期时间</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="whitelist-cidr">IP / 网段</Label>
            <Input
              id="whitelist-cidr"
              placeholder="例如 203.0.113.5 或 203.0.113.0/24"
              value={form.ipCidr}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, ipCidr: event.target.value }))
              }
            />
            <Label htmlFor="whitelist-remark">备注</Label>
            <Input
              id="whitelist-remark"
              placeholder="广东学校出口、评委 IP..."
              value={form.remark}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, remark: event.target.value }))
              }
            />
            <Label htmlFor="whitelist-expire">过期时间（可选）</Label>
            <Input
              id="whitelist-expire"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, expiresAt: event.target.value }))
              }
            />
            <Button
              onClick={() => void addWhitelist()}
              disabled={addingWhitelist}
            >
              {addingWhitelist ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              新增白名单
            </Button>
          </div>
          <div className="max-h-56 overflow-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>网段</TableHead>
                  <TableHead>备注</TableHead>
                  <TableHead>过期</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {whitelist.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      {item.ipCidr}
                    </TableCell>
                    <TableCell>{item.remark ?? "-"}</TableCell>
                    <TableCell className="text-xs">
                      {item.expiresAt ? formatDateTime(item.expiresAt) : "永久"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void removeWhitelist(item.id)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!whitelist.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="h-20 text-center text-muted-foreground"
                    >
                      暂无白名单配置
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
