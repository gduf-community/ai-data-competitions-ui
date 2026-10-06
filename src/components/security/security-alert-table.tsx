"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import {
  getFriendlyUiMessage,
  reportSecurityUiIssue,
} from "@/lib/security/security-ui-monitor";
import type { SecurityAlertView, SecurityListPayload } from "@/lib/security/types";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDateTime(value: string) {
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

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "new") return "destructive";
  if (status === "ack") return "default";
  if (status === "resolved") return "secondary";
  return "outline";
}

function severityVariant(
  severity: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "medium") return "default";
  if (severity === "low") return "secondary";
  return "outline";
}

function buildCountLabel(visibleCount: number, totalCount: number, noun: string) {
  if (totalCount > visibleCount) {
    return `当前显示 ${visibleCount} / 共 ${totalCount} 条${noun}`;
  }
  return `共 ${totalCount} 条${noun}`;
}

function getResponseMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "message" in value &&
    typeof (value as { message?: unknown }).message === "string"
  ) {
    return (value as { message: string }).message;
  }

  return fallback;
}

export function SecurityAlertTable() {
  const [payload, setPayload] = useState<SecurityListPayload<SecurityAlertView>>({
    total: 0,
    page: 1,
    pageSize: 50,
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [selected, setSelected] = useState<SecurityAlertView | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/security/alerts?page_size=100", {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | SecurityListPayload<SecurityAlertView>
        | { message?: string };
      if (!response.ok) {
        throw new Error(getResponseMessage(data, "读取告警失败"));
      }
      setPayload(data as SecurityListPayload<SecurityAlertView>);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("读取告警列表"));
      void reportSecurityUiIssue({
        eventType: "security.ui.load_failed",
        summary: "读取安全告警列表失败",
        metadata: {
          module: "security_alert_table",
          detail,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAlerts();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const openDetail = async (alertId: string) => {
    try {
      const response = await fetch(`/api/admin/security/alerts/${alertId}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | { alert: SecurityAlertView }
        | { message?: string };
      if (!response.ok) {
        throw new Error(getResponseMessage(data, "读取告警详情失败"));
      }
      setSelected((data as { alert: SecurityAlertView }).alert);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("查看告警详情"));
      void reportSecurityUiIssue({
        eventType: "security.ui.load_failed",
        summary: "读取安全告警详情失败",
        metadata: {
          module: "security_alert_table",
          detail,
          alertId,
        },
      });
    }
  };

  const submitStatus = async (
    id: string,
    action: "ack" | "ignore" | "resolve",
  ) => {
    setActing(`${id}:${action}`);
    try {
      const response = await fetchWithCsrf(
        `/api/admin/security/alerts/${id}/${action}`,
        {
          method: "POST",
        },
      );
      const data = (await response.json().catch(() => ({}))) as {
        alert?: SecurityAlertView;
        message?: string;
      };
      if (!response.ok) {
        throw new Error(getResponseMessage(data, "更新告警状态失败"));
      }
      if (selected?.id === id && data.alert) {
        setSelected(data.alert);
      }
      await fetchAlerts();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("更新告警状态"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "更新安全告警状态失败",
        metadata: {
          module: "security_alert_table",
          detail,
          alertId: id,
          action,
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
    <Card className="border-border/60">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>告警中心（自动规则聚合）</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void fetchAlerts()}
          disabled={loading}
        >
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
          {buildCountLabel(payload.items.length, payload.total, "告警")}
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>更新时间</TableHead>
                <TableHead>告警类型</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>目标</TableHead>
                <TableHead>规则</TableHead>
                <TableHead>事件数</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payload.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(item.updatedAt)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.alertType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={severityVariant(item.severity)}>
                      {item.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(item.status)}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.targetType}:{item.targetValue}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {item.ruleId}
                  </TableCell>
                  <TableCell>{item.eventCount}</TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void openDetail(item.id)}
                    >
                      查看
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={acting !== null || item.status !== "new"}
                      onClick={() => void submitStatus(item.id, "ack")}
                    >
                      确认
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={acting !== null || item.status === "resolved"}
                      onClick={() => void submitStatus(item.id, "resolve")}
                    >
                      解决
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={acting !== null || item.status === "ignored"}
                      onClick={() => void submitStatus(item.id, "ignore")}
                    >
                      忽略
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {empty ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="h-24 text-center text-muted-foreground"
                  >
                    暂无告警
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>告警详情</DialogTitle>
            <DialogDescription className="font-mono text-xs">
              {selected?.id}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[420px] overflow-auto rounded-md bg-muted p-3 text-xs">
            {selected ? JSON.stringify(selected, null, 2) : ""}
          </pre>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
