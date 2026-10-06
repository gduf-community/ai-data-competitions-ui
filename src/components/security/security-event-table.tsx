"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Search, X } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getFriendlyUiMessage,
  reportSecurityUiIssue,
} from "@/lib/security/security-ui-monitor";
import {
  getSecurityEventTypeLabel,
  getSecuritySeverityLabel,
  getSecuritySourceLabel,
  getSituationReasonLabel,
} from "@/lib/security/security-display";
import type { SecurityEventView, SecurityListPayload } from "@/lib/security/types";

type EventFilterState = {
  eventType: string;
  severity: string;
  source: string;
  ip: string;
  path: string;
};

const initialFilters: EventFilterState = {
  eventType: "",
  severity: "",
  source: "",
  ip: "",
  path: "",
};

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

function severityVariant(severity: string): "default" | "secondary" | "destructive" | "outline" {
  if (severity === "critical" || severity === "high") return "destructive";
  if (severity === "medium") return "default";
  if (severity === "low") return "secondary";
  return "outline";
}

function asPrettyJson(value: Record<string, unknown>) {
  const keys = Object.keys(value);
  if (keys.length === 0) {
    return "暂无数据";
  }
  return JSON.stringify(value, null, 2);
}

function extractErrorDetails(event: SecurityEventView) {
  const details: Array<{ label: string; value: string }> = [];
  const candidates: Array<[string, unknown]> = [
    ["事件说明", event.ruleMessage],
    ["请求路径", event.path],
    ["请求来源", event.origin],
    ["引用来源", event.referer],
    ["请求编号", event.requestId],
    ["用户代理", event.userAgent],
    ["元数据消息", event.metadata.message],
    ["元数据详情", event.metadata.detail],
    ["元数据错误名", event.metadata.errorName],
    ["元数据错误信息", event.metadata.errorMessage],
    ["原始错误名", event.raw.errorName],
    ["原始错误信息", event.raw.errorMessage],
    ["原始消息", event.raw.message],
    ["原始详情", event.raw.detail],
    ["调用堆栈", event.raw.stack],
  ];

  for (const [label, value] of candidates) {
    if (typeof value === "string" && value.trim()) {
      details.push({ label, value: value.trim() });
    }
  }

  return details;
}

function buildCountLabel(visibleCount: number, totalCount: number, noun: string) {
  if (totalCount > visibleCount) {
    return `当前显示 ${visibleCount} / 共 ${totalCount} 条${noun}`;
  }
  return `共 ${totalCount} 条${noun}`;
}

export function SecurityEventTable() {
  const [payload, setPayload] = useState<SecurityListPayload<SecurityEventView>>({
    total: 0,
    page: 1,
    pageSize: 50,
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<SecurityEventView | null>(null);
  const [filters, setFilters] = useState<EventFilterState>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<EventFilterState>(initialFilters);

  const fetchEvents = async (nextFilters: EventFilterState) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page_size: "100" });
      if (nextFilters.eventType) params.set("event_type", nextFilters.eventType);
      if (nextFilters.severity) params.set("severity", nextFilters.severity);
      if (nextFilters.source) params.set("source", nextFilters.source);
      if (nextFilters.ip) params.set("ip", nextFilters.ip);
      if (nextFilters.path) params.set("path", nextFilters.path);

      const response = await fetch(`/api/admin/security/events?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await response.json()) as
        | SecurityListPayload<SecurityEventView>
        | { message?: string };
      if (!response.ok) {
        throw new Error((data as { message?: string }).message ?? "读取事件失败");
      }
      setPayload(data as SecurityListPayload<SecurityEventView>);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("读取事件列表"));
      void reportSecurityUiIssue({
        eventType: "security.ui.load_failed",
        summary: "读取安全事件列表失败",
        metadata: {
          module: "security_event_table",
          detail,
          filters: nextFilters,
        },
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchEvents(appliedFilters);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [appliedFilters]);

  const empty = useMemo(
    () => !loading && payload.items.length === 0,
    [loading, payload.items.length],
  );

  const eventTypeOptions = useMemo(
    () =>
      [...new Set(payload.items.map((item) => item.eventType))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "zh-CN")),
    [payload.items],
  );

  const sourceOptions = useMemo(
    () =>
      [...new Set(payload.items.map((item) => item.source))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "zh-CN")),
    [payload.items],
  );

  const selectedErrorDetails = useMemo(
    () => (selected ? extractErrorDetails(selected) : []),
    [selected],
  );

  return (
    <Card className="border-border/60">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <CardTitle>事件列表（最近 24 小时）</CardTitle>
            <p className="text-sm text-muted-foreground">
              已汇总策略拦截、后端异常、登录风险、上传拒绝和前端加载失败事件，支持按事件类型、来源、风险级别和路径筛选。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchEvents(appliedFilters)}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            刷新
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="space-y-1">
            <Label htmlFor="security-event-type">事件类型</Label>
            <Select
              value={filters.eventType || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, eventType: value === "all" ? "" : value }))
              }
            >
              <SelectTrigger id="security-event-type">
                <SelectValue placeholder="全部事件" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部事件</SelectItem>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getSecurityEventTypeLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="security-severity">事件级别</Label>
            <Select
              value={filters.severity || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, severity: value === "all" ? "" : value }))
              }
            >
              <SelectTrigger id="security-severity">
                <SelectValue placeholder="全部级别" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部级别</SelectItem>
                {["critical", "high", "medium", "low", "info"].map((option) => (
                  <SelectItem key={option} value={option}>
                    {getSecuritySeverityLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="security-source">事件来源</Label>
            <Select
              value={filters.source || "all"}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, source: value === "all" ? "" : value }))
              }
            >
              <SelectTrigger id="security-source">
                <SelectValue placeholder="全部来源" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部来源</SelectItem>
                {sourceOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {getSecuritySourceLabel(option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="security-ip">访问 IP</Label>
            <Input
              id="security-ip"
              placeholder="按 IP 精确筛选"
              value={filters.ip}
              onChange={(event) => setFilters((prev) => ({ ...prev, ip: event.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="security-path">路径关键词</Label>
            <Input
              id="security-path"
              placeholder="按路径模糊筛选"
              value={filters.path}
              onChange={(event) => setFilters((prev) => ({ ...prev, path: event.target.value }))}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => {
              setAppliedFilters(filters);
            }}
            disabled={loading}
          >
            <Search className="mr-2 size-4" />
            应用筛选
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters(initialFilters);
              setAppliedFilters(initialFilters);
            }}
            disabled={loading}
          >
            <X className="mr-2 size-4" />
            清空筛选
          </Button>
          <span className="text-sm text-muted-foreground">
            {buildCountLabel(payload.items.length, payload.total, "事件")}
          </span>
          <span className="hidden text-sm text-muted-foreground">
            共 {payload.total} 条事件
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>时间</TableHead>
                <TableHead>事件名称</TableHead>
                <TableHead>事件级别</TableHead>
                <TableHead>事件来源</TableHead>
                <TableHead>访问 IP</TableHead>
                <TableHead>命中路径</TableHead>
                <TableHead>处理结果</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payload.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="whitespace-nowrap text-xs">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="font-medium">{getSecurityEventTypeLabel(item.eventType)}</div>
                    <div className="text-xs text-muted-foreground">
                      {item.ruleMessage
                        ? getSituationReasonLabel(item.ruleMessage)
                        : item.path
                          ? `关联路径：${item.path}`
                          : "已写入安全事件记录"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={severityVariant(item.severity)}>
                      {getSecuritySeverityLabel(item.severity)}
                    </Badge>
                  </TableCell>
                  <TableCell>{getSecuritySourceLabel(item.source)}</TableCell>
                  <TableCell className="font-mono text-xs">{item.ip ?? "-"}</TableCell>
                  <TableCell className="max-w-[240px] truncate text-xs">{item.path ?? "-"}</TableCell>
                  <TableCell className="text-xs">
                    {item.status ? `${item.status}` : "未返回状态码"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(item)}>
                      查看详情
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {empty ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                    当前筛选条件下暂无安全事件
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>事件详情</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              事件编号：{selected?.id ?? "-"}
            </DialogDescription>
          </DialogHeader>

          {selected ? (
            <div className="space-y-4">
              <div className="grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">事件名称</p>
                  <p className="mt-1 font-medium">{getSecurityEventTypeLabel(selected.eventType)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">事件级别</p>
                  <p className="mt-1 font-medium">{getSecuritySeverityLabel(selected.severity)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">事件来源</p>
                  <p className="mt-1 font-medium">{getSecuritySourceLabel(selected.source)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">发生时间</p>
                  <p className="mt-1 font-medium">{formatDateTime(selected.createdAt)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">访问 IP</p>
                  <p className="mt-1 font-mono text-xs">{selected.ip ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">关联用户</p>
                  <p className="mt-1 font-mono text-xs">{selected.userId ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">请求方式</p>
                  <p className="mt-1 font-medium">{selected.method ?? "未记录"}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3">
                  <p className="text-xs text-muted-foreground">状态码</p>
                  <p className="mt-1 font-medium">{selected.status ?? "未返回"}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">命中路径</p>
                  <p className="mt-1 break-all">{selected.path ?? "未记录"}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">命中原因</p>
                  <p className="mt-1">
                    {selected.ruleMessage
                      ? getSituationReasonLabel(selected.ruleMessage)
                      : "未记录补充说明"}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-lg border border-border/60 p-4">
                  <p className="text-sm font-medium">详细报错与上下文</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {selectedErrorDetails.length > 0 ? (
                      selectedErrorDetails.map((item) => (
                        <div key={`${item.label}-${item.value}`} className="rounded-md bg-muted/40 p-3">
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="mt-1 break-all text-sm">{item.value}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">当前事件未记录更多报错明细。</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-3 xl:grid-cols-2">
                  <div className="rounded-lg border border-border/60 p-4">
                    <p className="text-sm font-medium">元数据</p>
                    <pre className="mt-3 max-h-[260px] overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap break-all">
                      {asPrettyJson(selected.metadata)}
                    </pre>
                  </div>
                  <div className="rounded-lg border border-border/60 p-4">
                    <p className="text-sm font-medium">原始报错</p>
                    <pre className="mt-3 max-h-[260px] overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap break-all">
                      {asPrettyJson(selected.raw)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
