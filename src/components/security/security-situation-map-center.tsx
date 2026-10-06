"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Clock3,
  Loader2,
  RadioTower,
  RefreshCw,
  Shield,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "@/lib/i18n/toast";

import { SecurityAttackMap } from "@/components/security/security-attack-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getSituationReasonLabel,
  getSituationRiskLevelLabel,
} from "@/lib/security/security-display";
import {
  getFriendlyUiMessage,
  reportSecurityUiIssue,
} from "@/lib/security/security-ui-monitor";
import type {
  SituationAccessLogView,
  SituationMapView,
  SituationOverviewView,
} from "@/lib/security/types";

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

function formatRegion(input: {
  country?: string | null;
  province?: string | null;
  city?: string | null;
}) {
  const parts = [
    input.country && input.country !== "中国" ? input.country : null,
    input.province,
    input.city && input.city !== "本地调试" ? input.city : null,
  ].filter((item): item is string => Boolean(item));

  if (parts.length > 0) {
    return parts.join(" / ");
  }

  return input.country ?? "未知来源";
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function riskVariant(level: string): "default" | "secondary" | "destructive" | "outline" {
  if (level === "critical" || level === "high") return "destructive";
  if (level === "medium") return "default";
  if (level === "low") return "secondary";
  return "outline";
}

function SituationMetricCard({
  title,
  value,
  note,
  icon,
}: {
  title: string;
  value: string;
  note: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-cyan-200/10 bg-slate-950/75 p-4 text-slate-100 shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs tracking-[0.18em] text-slate-400 uppercase">{title}</p>
        <div className="text-cyan-300">{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-slate-400">{note}</p>
    </div>
  );
}

export function SecuritySituationMapCenter() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<SituationOverviewView | null>(null);
  const [mapData, setMapData] = useState<SituationMapView | null>(null);
  const [events, setEvents] = useState<SituationAccessLogView[]>([]);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const loadMapCenterData = async (options?: { silent?: boolean }) => {
    const silent = options?.silent ?? false;

    if (!silent) {
      setRefreshing(true);
    }

    try {
      const [overviewRes, mapRes, eventsRes] = await Promise.all([
        fetch("/api/admin/security/situation/overview", { cache: "no-store" }),
        fetch("/api/admin/security/situation/map", { cache: "no-store" }),
        fetch("/api/admin/security/situation/events?page_size=80", { cache: "no-store" }),
      ]);

      if (!overviewRes.ok || !mapRes.ok || !eventsRes.ok) {
        throw new Error("读取地图态势数据失败");
      }

      const overviewJson = (await overviewRes.json()) as SituationOverviewView;
      const mapJson = (await mapRes.json()) as SituationMapView;
      const eventsJson = (await eventsRes.json()) as { items: SituationAccessLogView[] };

      setOverview(overviewJson);
      setMapData(mapJson);
      setEvents(eventsJson.items);
      setRefreshedAt(new Date().toISOString());
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      if (!silent) {
        toast.error(getFriendlyUiMessage("读取地图指挥页"));
      }
      void reportSecurityUiIssue({
        eventType: silent ? "security.ui.action_failed" : "security.ui.load_failed",
        summary: silent ? "刷新地图指挥页失败" : "初始化地图指挥页失败",
        metadata: {
          module: "security_situation_map_center",
          detail,
          silent,
        },
      });
    } finally {
      if (!silent) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await loadMapCenterData();
      if (cancelled) return;
    };

    void bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void loadMapCenterData({ silent: true });
    }, 15_000);

    return () => clearInterval(timer);
  }, []);

  const metrics = useMemo(() => {
    const total24h = overview?.windows.twentyFourHours.total ?? 0;
    const blocked24h = overview?.windows.twentyFourHours.blocked ?? 0;
    const blockedRate = total24h > 0 ? (blocked24h / total24h) * 100 : 0;
    const guangdong = mapData?.stats.guangdong ?? 0;
    const totalMap = mapData?.stats.total ?? 0;
    const guangdongRatio = totalMap > 0 ? (guangdong / totalMap) * 100 : 0;
    const highRiskCount = (overview?.riskDistribution ?? []).reduce((sum, item) => {
      const level = item.riskLevel.toLowerCase();
      return level === "high" || level === "critical" ? sum + item.count : sum;
    }, 0);

    return {
      total24h,
      blocked24h,
      blockedRate,
      guangdongRatio,
      highRiskCount,
      mapPoints: mapData?.points.length ?? 0,
    };
  }, [mapData, overview]);

  const timelineEvents = useMemo(() => {
    const highRiskEvents = events.filter(
      (item) => item.riskLevel === "high" || item.riskLevel === "critical",
    );

    if (highRiskEvents.length > 0) {
      return {
        title: "高危处置时间线",
        description: "优先展示高风险与严重风险来源",
        items: highRiskEvents.slice(0, 8),
      };
    }

    return {
      title: "最近访问动态",
      description: "当前没有高危事件，回退显示最近访问记录",
      items: events.slice(0, 5),
    };
  }, [events]);

  const topHotspots = useMemo(() => (mapData?.points ?? []).slice(0, 8), [mapData]);

  const trendData = useMemo(() => overview?.trends.oneHour ?? [], [overview]);

  return (
    <div className="space-y-6 rounded-[28px] border border-border/60 bg-[radial-gradient(circle_at_20%_0%,rgba(59,130,246,0.10),transparent_32%),radial-gradient(circle_at_85%_12%,rgba(20,184,166,0.08),transparent_28%),linear-gradient(180deg,#f7f9fc_0%,#eef2f7_100%)] p-4 md:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">地图指挥</Badge>
            <Badge variant="secondary">东八区时间</Badge>
            <Badge variant="secondary">本地离线地图</Badge>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-950">访问态势地图指挥台</h2>
            <p className="mt-1 text-sm text-slate-600">
              独立展示访问来源地图、热点省份、处置时间线和近一小时波动，用于值守和联动处置。
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/security/events">查看事件列表</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/security/actions">进入处置执行台</Link>
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => void loadMapCenterData()}
            disabled={refreshing || loading}
          >
            {refreshing ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            刷新地图
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SituationMetricCard
          title="24小时访问"
          value={String(metrics.total24h)}
          note={`近24小时拦截 ${metrics.blocked24h} 次`}
          icon={<RadioTower className="size-4" />}
        />
        <SituationMetricCard
          title="拦截比例"
          value={formatPercent(metrics.blockedRate)}
          note="仅允许白名单和广东省境内流量访问"
          icon={<Shield className="size-4" />}
        />
        <SituationMetricCard
          title="广东占比"
          value={formatPercent(metrics.guangdongRatio)}
          note="按地图近24小时点位统计"
          icon={<Clock3 className="size-4" />}
        />
        <SituationMetricCard
          title="高危事件"
          value={String(metrics.highRiskCount)}
          note={`地图热点 ${metrics.mapPoints} 个`}
          icon={<AlertTriangle className="size-4" />}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_360px]">
        <Card className="relative overflow-hidden border-slate-700/40 bg-[linear-gradient(180deg,rgba(8,20,38,0.98),rgba(5,12,24,0.98))] text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.25))]" />
          <CardHeader className="relative z-10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-slate-50">访问来源地图</CardTitle>
                <CardDescription className="text-slate-300">
                  广东、中国、世界三档视角切换，统一使用本地真实地图资源，不再使用手绘或示意底图。
                </CardDescription>
              </div>
              <div className="text-right text-xs text-slate-400">
                <div>数据更新时间：{refreshedAt ? formatDateTime(refreshedAt) : "加载中"}</div>
                <div>数据口径：近 24 小时访问事件</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="relative z-10 space-y-4">
            <SecurityAttackMap points={mapData?.points ?? []} />
            <div className="flex flex-wrap gap-3 text-xs text-slate-300">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-red-500" />
                严重风险
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-orange-500" />
                高风险
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-blue-500" />
                中风险
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" />
                低风险
              </span>
            </div>
            <div className="rounded-2xl border border-slate-700/40 bg-slate-950/50 p-3 text-xs text-slate-300">
              当前策略说明：仅允许白名单 IP 与广东省境内流量访问；非符合流量进入 403 策略拦截页，并同步写入事件列表。
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-slate-700/40 bg-[linear-gradient(180deg,rgba(8,20,38,0.98),rgba(5,12,24,0.98))] text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <CardHeader>
              <CardTitle className="text-slate-50">{timelineEvents.title}</CardTitle>
              <CardDescription className="text-slate-300">{timelineEvents.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timelineEvents.items.length === 0 ? (
                <div className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-4 text-sm text-slate-400">
                  当前暂无可展示的访问事件。
                </div>
              ) : (
                timelineEvents.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-700/40 bg-slate-950/45 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant={riskVariant(item.riskLevel)}>
                        {getSituationRiskLevelLabel(item.riskLevel)}
                      </Badge>
                      <span className="text-xs text-slate-400">{formatDateTime(item.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-100">{item.path ?? "-"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {item.maskedIp} / {formatRegion(item)}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      命中原因：{getSituationReasonLabel(item.reason)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-700/40 bg-[linear-gradient(180deg,rgba(8,20,38,0.98),rgba(5,12,24,0.98))] text-slate-100 shadow-[0_18px_50px_rgba(15,23,42,0.18)]">
            <CardHeader>
              <CardTitle className="text-slate-50">热点来源前 8 项</CardTitle>
              <CardDescription className="text-slate-300">按地图聚合点位访问量排序</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {topHotspots.length === 0 ? (
                <div className="rounded-xl border border-slate-700/40 bg-slate-950/50 p-4 text-sm text-slate-400">
                  暂无地图点位数据。
                </div>
              ) : (
                topHotspots.map((point) => (
                  <div
                    key={`${point.lng}-${point.lat}-${point.country}-${point.province}-${point.city}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/40 bg-slate-950/45 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-slate-100">{formatRegion(point)}</p>
                      <p className="truncate text-xs text-slate-400">{formatDateTime(point.lastSeen)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={riskVariant(point.riskLevel)}>
                        {getSituationRiskLevelLabel(point.riskLevel)}
                      </Badge>
                      <span className="text-sm font-medium text-cyan-300">{point.count}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>近一小时访问波动</CardTitle>
            <CardDescription>按东八区分钟桶统计访问与拦截变化</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="slot" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Area type="monotone" dataKey="total" stroke="#0ea5e9" fill="#bae6fd" name="访问量" />
                <Area type="monotone" dataKey="blocked" stroke="#ef4444" fill="#fecaca" name="拦截量" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90">
          <CardHeader>
            <CardTitle>热点省份排行</CardTitle>
            <CardDescription>按近 24 小时访问和拦截量排序</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={overview?.topProvinces ?? []} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="province" type="category" width={88} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="total" fill="#3b82f6" name="访问量" radius={[0, 8, 8, 0]} />
                <Bar dataKey="blocked" fill="#ef4444" name="拦截量" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-muted/30">
        <CardHeader>
          <CardTitle>地图数据说明</CardTitle>
          <CardDescription>参考态势感知地图方案，当前版本优先保证离线可用和后台接入成本</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目</TableHead>
                <TableHead>当前方案</TableHead>
                <TableHead>说明</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>中国地图</TableCell>
                <TableCell>本地离线 ECharts 地图资源</TableCell>
                <TableCell>避免外网依赖，适合后台部署</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>世界地图</TableCell>
                <TableCell>本地真实地图资源</TableCell>
                <TableCell>世界地图改为本地 world.js 资源，避免继续沿用手绘底图</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>时间口径</TableCell>
                <TableCell>东八区标准时间</TableCell>
                <TableCell>趋势分桶、地图时间线、事件明细保持一致</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>下一步可升级项</TableCell>
                <TableCell>GeoJSON / MapLibre / 更精细点位策略</TableCell>
                <TableCell>后续如需更强 GIS 能力，再切换更重的地图栈</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
