"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Copy, ListFilter, Loader2, RefreshCw } from "lucide-react";

import { toast } from "@/lib/i18n/toast";
import type { SituationAccessLogView } from "@/lib/security/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getSituationReasonLabel, getSituationRiskLevelLabel } from "@/lib/security/security-display";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { riskLabelMap, formatDateTime, formatRegion, riskVariant, statusBadgeVariant, buildActionLink } from "./security-situation-presentation";
import type { TrendWindow, EventRiskFilter, EventStatusFilter } from "./security-situation-presentation";
import { calculateSituationMetrics } from "./security-situation-presentation";
import { useSituationData } from "./use-situation-data";
import { useSituationControls, SecuritySituationControls } from "./security-situation-controls";
import { SecuritySituationOverview } from "./security-situation-overview";

export function SecuritySituationDashboard({
  showMapSection = true,
}: {
  showMapSection?: boolean;
}) {
  const data = useSituationData();
  const { loading, overview, mapData, events, reload } = data;
  const [trendWindow, setTrendWindow] = useState<TrendWindow>("oneHour");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [eventKeyword, setEventKeyword] = useState("");
  const [eventRisk, setEventRisk] = useState<EventRiskFilter>("all");
  const [eventStatus, setEventStatus] = useState<EventStatusFilter>("all");
  const controls = useSituationControls(data);
  const { fillWhitelistForm } = controls;

  const trendData = useMemo(() => {
    if (!overview) return [];
    return overview.trends[trendWindow];
  }, [overview, trendWindow]);

  const metrics = useMemo(() => calculateSituationMetrics(overview, mapData), [overview, mapData]);

  const reasonDistribution = useMemo(() => {
    const counter = new Map<string, number>();
    for (const item of events) {
      const key = getSituationReasonLabel(item.reason);
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
    return [...counter.entries()]
      .map(([reason, count]) => ({
        reason: reason.length > 14 ? `${reason.slice(0, 14)}...` : reason,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [events]);

  const filteredEvents = useMemo(() => {
    const keyword = eventKeyword.trim().toLowerCase();
    return events.filter((item) => {
      if (eventRisk !== "all" && item.riskLevel !== eventRisk) return false;
      if (eventStatus === "blocked" && !item.isBlocked) return false;
      if (eventStatus === "allowed" && item.isBlocked) return false;
      if (!keyword) return true;
      const matchesPath = item.path?.toLowerCase().includes(keyword);
      const matchesIp = item.maskedIp.toLowerCase().includes(keyword);
      const matchesReason = item.reason?.toLowerCase().includes(keyword);
      const matchesRegion = `${item.province ?? ""}${item.city ?? ""}`.toLowerCase().includes(keyword);
      return Boolean(matchesPath || matchesIp || matchesReason || matchesRegion);
    });
  }, [events, eventKeyword, eventRisk, eventStatus]);

  const selectedEvent = useMemo(
    () => filteredEvents.find((item) => item.id === selectedEventId) ?? filteredEvents[0] ?? null,
    [filteredEvents, selectedEventId],
  );

  const highRiskTimeline = useMemo(() => {
    return filteredEvents
      .filter((item) => item.riskLevel === "high" || item.riskLevel === "critical")
      .slice(0, 10);
  }, [filteredEvents]);

  const copyEventDetail = async (eventItem: SituationAccessLogView) => {
    const payload = {
      id: eventItem.id,
      time: formatDateTime(eventItem.createdAt),
      ip: eventItem.ip,
      maskedIp: eventItem.maskedIp,
      region: formatRegion(eventItem),
      path: eventItem.path ?? "-",
      method: eventItem.method ?? "-",
      risk: getSituationRiskLevelLabel(eventItem.riskLevel),
      reason: getSituationReasonLabel(eventItem.reason),
      status: eventItem.isBlocked ? "已拦截" : "已放行",
      whitelisted: eventItem.isWhitelisted ? "是" : "否",
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      toast.success("事件详情已复制");
    } catch {
      toast.error("复制失败，请检查浏览器权限");
    }
  };

  const renderEventActions = (eventItem: SituationAccessLogView, compact = false) => (
    <div
      className={
        compact
          ? "grid gap-2 sm:grid-cols-3"
          : "flex items-center justify-end gap-2 lg:min-w-[192px]"
      }
    >
      <Button
        variant="ghost"
        size="icon"
        className={compact ? "h-9 w-9" : "h-8 w-8 shrink-0"}
        onClick={(event) => {
          event.stopPropagation();
          void copyEventDetail(eventItem);
        }}
        title="复制事件详情"
      >
        <Copy className="size-4" />
      </Button>
      <div className={compact ? "contents" : "flex flex-wrap justify-end gap-2"}>
        <Button
          variant="ghost"
          size="sm"
          className={compact ? "justify-center" : "shrink-0"}
          onClick={(event) => {
            event.stopPropagation();
            fillWhitelistForm(eventItem);
          }}
        >
          加入白名单
        </Button>
        <Button
          variant={compact ? "secondary" : "outline"}
          size="sm"
          className={compact ? "justify-center" : "shrink-0"}
          asChild
        >
          <Link
            href={buildActionLink(eventItem.ip)}
            onClick={(event) => event.stopPropagation()}
          >
            去动作执行
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 rounded-2xl border border-border/60 bg-gradient-to-br from-slate-950/[0.03] via-background to-cyan-950/[0.03] p-4 md:p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          以 24 小时窗口观察访问态势，支持实时日志筛选、告警追踪和策略联动。
        </p>
        <Button variant="outline" size="sm" onClick={() => void reload()} disabled={loading}>
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
          刷新数据
        </Button>
      </div>

      <Card className="border-border/60 bg-muted/20">
        <CardContent className="flex flex-col gap-3 py-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">当前上线访问策略</p>
            <p className="text-sm text-muted-foreground">
              仅允许白名单 IP 和广东省境内流量访问，其他来源会进入 403 拦截页并同步写入事件列表。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm">
              <Link href="/admin/security/events">查看事件列表</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/security/actions">进入处置执行台</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <SecuritySituationOverview {...{overview,mapData,metrics,trendWindow,setTrendWindow,trendData,highRiskTimeline,reasonDistribution,showMapSection}}/>
      <Card className="border-border/60">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>实时日志流</CardTitle>
              <CardDescription>支持筛选、复制和事件追踪</CardDescription>
            </div>
            <Badge variant="outline">
              {filteredEvents.length} / {events.length}
            </Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="event-keyword">关键词</Label>
              <Input
                id="event-keyword"
                placeholder="IP、路径、地区、原因"
                value={eventKeyword}
                onChange={(event) => setEventKeyword(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-risk-filter">风险等级</Label>
              <Select value={eventRisk} onValueChange={(value) => setEventRisk(value as EventRiskFilter)}>
                <SelectTrigger id="event-risk-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部风险</SelectItem>
                  <SelectItem value="critical">严重风险</SelectItem>
                  <SelectItem value="high">高风险</SelectItem>
                  <SelectItem value="medium">中风险</SelectItem>
                  <SelectItem value="low">低风险</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="event-status-filter">处理状态</Label>
              <Select value={eventStatus} onValueChange={(value) => setEventStatus(value as EventStatusFilter)}>
                <SelectTrigger id="event-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="blocked">仅拦截</SelectItem>
                  <SelectItem value="allowed">仅放行</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setEventKeyword("");
                  setEventRisk("all");
                  setEventStatus("all");
                }}
              >
                <ListFilter className="mr-2 size-4" />
                重置筛选
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-xl border border-border/60">
            <div className="hidden h-[380px] overflow-auto lg:block">
              <Table className="min-w-[1024px] table-fixed">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[156px]">时间</TableHead>
                    <TableHead className="w-[120px]">IP</TableHead>
                    <TableHead className="w-[168px]">地区</TableHead>
                    <TableHead className="w-[200px]">路径</TableHead>
                    <TableHead className="w-[96px]">风险</TableHead>
                    <TableHead className="w-[180px]">原因</TableHead>
                    <TableHead className="w-[96px]">状态</TableHead>
                    <TableHead className="w-[208px] text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvents.map((item) => (
                    <TableRow
                      key={item.id}
                      className={item.id === selectedEvent?.id ? "bg-muted/60" : undefined}
                      onClick={() => setSelectedEventId(item.id)}
                    >
                      <TableCell className="whitespace-nowrap text-xs">{formatDateTime(item.createdAt)}</TableCell>
                      <TableCell className="font-mono text-xs">{item.maskedIp}</TableCell>
                      <TableCell className="truncate text-sm">{formatRegion(item)}</TableCell>
                      <TableCell className="truncate text-xs">{item.path ?? "-"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={riskVariant(item.riskLevel)}>{riskLabelMap[item.riskLevel]}</Badge>
                      </TableCell>
                      <TableCell className="truncate text-xs">
                        {getSituationReasonLabel(item.reason)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={statusBadgeVariant(item.isBlocked)}>
                          {item.isBlocked ? "拦截" : "放行"}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-middle text-right">
                        {renderEventActions(item)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredEvents.length ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                        当前筛选条件下暂无访问事件
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>

            <div className="grid gap-3 p-3 lg:hidden">
              {filteredEvents.map((item) => (
                <div
                  key={item.id}
                  className={[
                    "rounded-xl border border-border/60 bg-background p-4 transition-colors",
                    item.id === selectedEvent?.id ? "bg-muted/40 ring-1 ring-primary/20" : "",
                  ].join(" ")}
                  onClick={() => setSelectedEventId(item.id)}
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                        <p className="font-mono text-sm">{item.maskedIp}</p>
                        <p className="text-sm text-muted-foreground">{formatRegion(item)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant={riskVariant(item.riskLevel)}>{riskLabelMap[item.riskLevel]}</Badge>
                        <Badge variant={statusBadgeVariant(item.isBlocked)}>
                          {item.isBlocked ? "拦截" : "放行"}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">路径</p>
                        <p className="break-all">{item.path ?? "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">命中原因</p>
                        <p>{getSituationReasonLabel(item.reason)}</p>
                      </div>
                    </div>

                    {renderEventActions(item, true)}
                  </div>
                </div>
              ))}

              {!filteredEvents.length ? (
                <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border/60 text-sm text-muted-foreground">
                  当前筛选条件下暂无访问事件
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/30 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">事件追踪详情</p>
              {selectedEvent ? (
                <Badge variant={riskVariant(selectedEvent.riskLevel)}>{riskLabelMap[selectedEvent.riskLevel]}</Badge>
              ) : null}
            </div>
            {!selectedEvent ? (
              <p className="mt-3 text-sm text-muted-foreground">请选择一条日志查看详情。</p>
            ) : (
              <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
                <p>时间：{formatDateTime(selectedEvent.createdAt)}</p>
                <p>IP：{selectedEvent.maskedIp}</p>
                <p>地区：{formatRegion(selectedEvent)}</p>
                <p>请求方式：{selectedEvent.method ?? "-"}</p>
                <p className="md:col-span-2">路径：{selectedEvent.path ?? "-"}</p>
                <p className="md:col-span-2">命中原因：{getSituationReasonLabel(selectedEvent.reason)}</p>
                <p>状态：{selectedEvent.isBlocked ? "拦截" : "放行"}</p>
                <p>白名单命中：{selectedEvent.isWhitelisted ? "是" : "否"}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <SecuritySituationControls controls={controls}/>
    </div>
  );
}
