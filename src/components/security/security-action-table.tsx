"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSensitiveDebugDetectedAt,
  hasSensitiveDebugDetected,
} from "@/lib/security/client-security-event";
import { promptI18n, useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import {
  getFriendlyUiMessage,
  reportSecurityUiIssue,
} from "@/lib/security/security-ui-monitor";
import {
  getSecurityActionStatusLabel,
  getSecurityActionTypeLabel,
  getSecuritySourceLabel,
  getSecurityTargetTypeLabel,
} from "@/lib/security/security-display";
import type {
  SecurityActionReceiptView,
  SecurityActionView,
  SecurityListPayload,
} from "@/lib/security/types";

function formatDateTime(value: string | null) {
  if (!value) return "未设置";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "failed") return "destructive";
  if (status === "success") return "secondary";
  if (status === "pending" || status === "executing") return "default";
  return "outline";
}

function buildCountLabel(visibleCount: number, totalCount: number, noun: string) {
  if (totalCount > visibleCount) {
    return `当前显示 ${visibleCount} / 共 ${totalCount} 条${noun}`;
  }
  return `共 ${totalCount} 条${noun}`;
}

interface ActionDetailPayload {
  action: SecurityActionView;
  receipts: SecurityActionReceiptView[];
}

const actionTypeOptions = [
  { value: "rate_limit_ip", label: "临时限制访问", defaultTtl: "1800" },
  { value: "block_ip", label: "立即封禁来源", defaultTtl: "86400" },
  { value: "allow_ip", label: "加入白名单", defaultTtl: "86400" },
  { value: "review_user", label: "转人工复核", defaultTtl: "" },
  { value: "observe_ip", label: "加入观察名单", defaultTtl: "7200" },
] as const;

const targetTypeOptions = [
  { value: "ip", label: "IP 地址" },
  { value: "user", label: "用户账号" },
  { value: "path", label: "访问路径" },
] as const;

const actionTemplates = [
  {
    label: "异常 IP 限制 30 分钟",
    actionType: "rate_limit_ip",
    targetType: "ip",
    ttlSeconds: "1800",
    reason: "命中访问策略或高频异常请求，先限制 30 分钟观察。",
  },
  {
    label: "高危来源封禁 24 小时",
    actionType: "block_ip",
    targetType: "ip",
    ttlSeconds: "86400",
    reason: "命中高风险策略，先封禁 24 小时并等待人工复核。",
  },
  {
    label: "可信来源加入白名单",
    actionType: "allow_ip",
    targetType: "ip",
    ttlSeconds: "86400",
    reason: "确认是可信来源，加入白名单以保障后续访问。",
  },
] as const;

const initialCreateForm = {
  sourceAlertId: "",
  actionType: "rate_limit_ip",
  targetType: "ip",
  targetValue: "",
  ttlSeconds: "1800",
  reason: "",
  confirmText: "",
};
const DEBUG_CONFIRM_TEXT = "确认执行";

export function SecurityActionTable() {
  const { tt } = useI18nText();
  const [payload, setPayload] = useState<SecurityListPayload<SecurityActionView>>({
    total: 0,
    page: 1,
    pageSize: 50,
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [form, setForm] = useState(initialCreateForm);
  const [selected, setSelected] = useState<ActionDetailPayload | null>(null);

  const debugDetected = hasSensitiveDebugDetected();
  const debugDetectedAt = getSensitiveDebugDetectedAt();

  const fetchActions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/security/actions?page_size=100", {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | SecurityListPayload<SecurityActionView>
        | { message?: string };
      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "读取动作失败");
      }
      setPayload(data as SecurityListPayload<SecurityActionView>);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("读取处置动作"));
      void reportSecurityUiIssue({
        eventType: "security.ui.load_failed",
        summary: "读取安全动作列表失败",
        metadata: {
          module: "security_action_table",
          detail,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchActions();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const openDetail = async (actionId: string) => {
    try {
      const response = await fetch(`/api/admin/security/actions/${actionId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as ActionDetailPayload | { message?: string };
      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "读取动作详情失败");
      }
      setSelected(data as ActionDetailPayload);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("查看动作详情"));
      void reportSecurityUiIssue({
        eventType: "security.ui.load_failed",
        summary: "读取安全动作详情失败",
        metadata: {
          module: "security_action_table",
          detail,
          actionId,
        },
      });
    }
  };

  const createAction = async () => {
    if (!form.targetValue.trim()) {
      toast.error("请填写处置目标。");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("请填写处置原因。");
      return;
    }
    if (debugDetected && form.confirmText.trim() !== DEBUG_CONFIRM_TEXT) {
      toast.error(`检测到调试环境，敏感动作前必须输入“${DEBUG_CONFIRM_TEXT}”。`);
      return;
    }

    setActing("create");
    try {
      const response = await fetchWithCsrf("/api/admin/security/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceAlertId: form.sourceAlertId.trim() || null,
          actionType: form.actionType.trim(),
          targetType: form.targetType.trim(),
          targetValue: form.targetValue.trim(),
          ttlSeconds: Number(form.ttlSeconds) || null,
          reason: form.reason.trim(),
          metadata: {
            client_debug_detected: debugDetected,
            client_debug_detected_at: debugDetectedAt
              ? new Date(debugDetectedAt).toISOString()
              : null,
          },
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "创建动作失败");
      }
      toast.success("处置动作已创建。");
      setForm(initialCreateForm);
      await fetchActions();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("创建处置动作"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "创建安全动作失败",
        metadata: {
          module: "security_action_table",
          detail,
          actionType: form.actionType,
          targetType: form.targetType,
        },
      });
    } finally {
      setActing(null);
    }
  };

  const executeAction = async (action: SecurityActionView) => {
    if (debugDetected) {
      const promptValue = promptI18n(
        `检测到当前环境存在调试行为。请输入“${DEBUG_CONFIRM_TEXT}”以继续执行动作。`,
      );
      if (promptValue !== DEBUG_CONFIRM_TEXT) {
        return;
      }
    }

    setActing(`execute:${action.id}`);
    try {
      const response = await fetchWithCsrf(`/api/admin/security/actions/${action.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detail: "管理员在处置执行台发起执行",
          metadata: {
            client_debug_detected: debugDetected,
            client_debug_detected_at: debugDetectedAt
              ? new Date(debugDetectedAt).toISOString()
              : null,
          },
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "执行失败");
      }
      toast.success("处置动作已执行。");
      await fetchActions();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("执行处置动作"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "执行安全动作失败",
        metadata: {
          module: "security_action_table",
          detail,
          actionId: action.id,
          actionType: action.actionType,
        },
      });
    } finally {
      setActing(null);
    }
  };

  const rollbackAction = async (action: SecurityActionView) => {
    setActing(`rollback:${action.id}`);
    try {
      const response = await fetchWithCsrf(`/api/admin/security/actions/${action.id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detail: "管理员在处置执行台发起回滚",
        }),
      });
      const data = (await response.json()) as { message?: string };
      if (!response.ok) {
        throw new Error(data.message ?? "回滚失败");
      }
      toast.success("处置动作已回滚。");
      await fetchActions();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("回滚处置动作"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "回滚安全动作失败",
        metadata: {
          module: "security_action_table",
          detail,
          actionId: action.id,
          actionType: action.actionType,
        },
      });
    } finally {
      setActing(null);
    }
  };

  const empty = useMemo(
    () => !loading && payload.items.length === 0,
    [loading, payload.items.length],
  );

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="space-y-4">
          <div className="space-y-1">
            <CardTitle>处置动作配置</CardTitle>
            <p className="text-sm text-muted-foreground">
              先选模板，再填写目标与原因。动作执行结果会自动写回事件列表和回执记录。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {actionTemplates.map((template) => (
              <Button
                key={template.label}
                variant="outline"
                size="sm"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    actionType: template.actionType,
                    targetType: template.targetType,
                    ttlSeconds: template.ttlSeconds,
                    reason: template.reason,
                  }))
                }
              >
                {template.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {debugDetected ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              检测到调试环境：敏感动作必须二次确认，创建或执行前请按要求输入 BLOCK。
            </div>
          ) : null}
          {debugDetected ? (
            <div className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              当前确认口令：{DEBUG_CONFIRM_TEXT}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="action-source-alert">关联告警编号（可选）</Label>
              <Input
                id="action-source-alert"
                placeholder={tt("用于回溯是哪条告警触发了本次处置")}
                value={form.sourceAlertId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sourceAlertId: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-type">处置动作</Label>
              <Select
                value={form.actionType}
                onValueChange={(value) => {
                  const matched = actionTypeOptions.find((item) => item.value === value);
                  setForm((prev) => ({
                    ...prev,
                    actionType: value,
                    ttlSeconds: matched?.defaultTtl ?? prev.ttlSeconds,
                  }));
                }}
              >
                <SelectTrigger id="action-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {actionTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-type">处置目标类型</Label>
              <Select
                value={form.targetType}
                onValueChange={(value) => setForm((prev) => ({ ...prev, targetType: value }))}
              >
                <SelectTrigger id="target-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {targetTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-value">处置目标</Label>
              <Input
                id="target-value"
                placeholder={tt("例如具体 IP、用户账号或访问路径")}
                value={form.targetValue}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, targetValue: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ttl-seconds">生效时长（秒，可选）</Label>
              <Input
                id="ttl-seconds"
                placeholder={tt("例如 1800 表示 30 分钟")}
                value={form.ttlSeconds}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, ttlSeconds: event.target.value }))
                }
              />
            </div>
            {debugDetected ? (
              <div className="space-y-2">
                <Label htmlFor="action-confirm">调试环境确认口令</Label>
                <Input
                  id="action-confirm"
                  placeholder={tt(`请输入“${DEBUG_CONFIRM_TEXT}”后再继续`)}
                  value={form.confirmText}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, confirmText: event.target.value }))
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="action-reason">处置原因</Label>
            <Textarea
              id="action-reason"
              placeholder={tt("说明为什么要执行这次处置，便于后续审计和回滚。")}
              value={form.reason}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, reason: event.target.value }))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void createAction()} disabled={acting !== null}>
              创建处置动作
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle>处置执行台（最近 100 条）</CardTitle>
            <p className="text-sm text-muted-foreground">
              每条动作都可以查看回执、立即执行或撤销回滚。
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchActions()} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            刷新
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-muted-foreground">
            {buildCountLabel(payload.items.length, payload.total, "处置动作")}
          </div>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>创建时间</TableHead>
                  <TableHead>处置动作</TableHead>
                  <TableHead>处置目标</TableHead>
                  <TableHead>执行状态</TableHead>
                  <TableHead>生效截止</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payload.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="whitespace-nowrap text-xs">
                      {formatDateTime(item.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{getSecurityActionTypeLabel(item.actionType)}</div>
                      <div className="text-xs text-muted-foreground">{item.reason}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{getSecurityTargetTypeLabel(item.targetType)}</div>
                      <div className="font-mono">{item.targetValue}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(item.status)}>
                        {getSecurityActionStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{formatDateTime(item.expiresAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => void openDetail(item.id)}>
                          查看详情
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            acting !== null ||
                            item.status === "success" ||
                            item.status === "rolled_back" ||
                            item.status === "expired"
                          }
                          onClick={() => void executeAction(item)}
                        >
                          立即执行
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            acting !== null ||
                            item.status === "rolled_back" ||
                            item.status === "pending"
                          }
                          onClick={() => void rollbackAction(item)}
                        >
                          撤销动作
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {empty ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      暂无处置动作
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>动作详情与执行回执</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              动作编号：{selected?.action.id ?? "-"}
            </DialogDescription>
          </DialogHeader>
          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm md:grid-cols-2">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">处置动作</p>
                  <p className="mt-1 font-medium">
                    {getSecurityActionTypeLabel(selected.action.actionType)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">执行状态</p>
                  <p className="mt-1 font-medium">
                    {getSecurityActionStatusLabel(selected.action.status)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">处置目标类型</p>
                  <p className="mt-1 font-medium">
                    {getSecurityTargetTypeLabel(selected.action.targetType)}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">处置目标</p>
                  <p className="mt-1 font-mono text-xs">{selected.action.targetValue}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">创建时间</p>
                  <p className="mt-1 font-medium">{formatDateTime(selected.action.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">生效截止</p>
                  <p className="mt-1 font-medium">{formatDateTime(selected.action.expiresAt)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">处置原因</p>
                  <p className="mt-1">{selected.action.reason}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">执行回执</p>
                  <Badge variant="outline">{selected.receipts.length} 条</Badge>
                </div>
                {selected.receipts.length === 0 ? (
                  <div className="rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
                    当前还没有执行回执。
                  </div>
                ) : (
                  selected.receipts.map((receipt) => (
                    <div key={receipt.id} className="rounded-lg border border-border/60 p-4 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{getSecuritySourceLabel(receipt.executor)}</p>
                        <Badge variant={statusVariant(receipt.status)}>
                          {getSecurityActionStatusLabel(receipt.status)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-muted-foreground">
                        {receipt.detail ?? "未记录执行说明"}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        记录时间：{formatDateTime(receipt.observedAt)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
