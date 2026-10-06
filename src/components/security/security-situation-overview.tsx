"use client";

import {
  Activity,
  AlertTriangle,
  Ban,
  Globe2,
  ShieldAlert,
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

import type {
  SituationAccessLogView,
  SituationMapView,
  SituationOverviewView,
} from "@/lib/security/types";

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

import { getSituationRiskLevelLabel } from "@/lib/security/security-display";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  trendLabels,
  riskLabelMap,
  formatDateTime,
  formatRegion,
  formatPercent,
  riskVariant,
} from "./security-situation-presentation";
import type { TrendWindow } from "./security-situation-presentation";
import { calculateSituationMetrics } from "./security-situation-presentation";
export function SecuritySituationOverview({
  overview,
  mapData,
  metrics,
  trendWindow,
  setTrendWindow,
  trendData,
  highRiskTimeline,
  reasonDistribution,
  showMapSection,
}: {
  overview: SituationOverviewView | null;
  mapData: SituationMapView | null;
  metrics: ReturnType<typeof calculateSituationMetrics>;
  trendWindow: TrendWindow;
  setTrendWindow: (value: TrendWindow) => void;
  trendData: SituationOverviewView["trends"][TrendWindow];
  highRiskTimeline: SituationAccessLogView[];
  reasonDistribution: Array<{ reason: string; count: number }>;
  showMapSection: boolean;
}) {
  return (
    <>
      {" "}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">24 小时总访问</CardTitle>
              <Globe2 className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold">{metrics.total24h}</p>
            <p className="text-xs text-muted-foreground">
              近 1 小时：{overview?.windows.oneHour.total ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">今日访问</CardTitle>
              <Activity className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold">{metrics.todayTotal}</p>
            <p className="text-xs text-muted-foreground">
              今日拦截：{metrics.todayBlocked}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">24 小时拦截率</CardTitle>
              <Ban className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold">
              {formatPercent(metrics.blockedRate24h)}
            </p>
            <p className="text-xs text-muted-foreground">
              24 小时拦截次数：{metrics.blocked24h}
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">高危事件</CardTitle>
              <AlertTriangle className="size-4 text-destructive" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold">{metrics.highRiskCount}</p>
            <p className="text-xs text-muted-foreground">
              高风险 + 严重风险总和
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">广东访问占比</CardTitle>
              <ShieldAlert className="size-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold">
              {formatPercent(metrics.guangdongRatio)}
            </p>
            <p className="text-xs text-muted-foreground">
              广东 {mapData?.stats.guangdong ?? 0} / 总访问{" "}
              {mapData?.stats.total ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>
      {showMapSection ? (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card className="border-border/60 xl:col-span-2">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>访问趋势</CardTitle>
                <CardDescription>访问量与拦截量双轴观察</CardDescription>
              </div>
              <div className="flex gap-2">
                {(Object.keys(trendLabels) as TrendWindow[]).map((key) => (
                  <Button
                    key={key}
                    size="sm"
                    variant={trendWindow === key ? "default" : "outline"}
                    onClick={() => setTrendWindow(key)}
                  >
                    {trendLabels[key]}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="slot" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#0ea5e9"
                    fill="#bae6fd"
                    name="访问数"
                  />
                  <Area
                    type="monotone"
                    dataKey="blocked"
                    stroke="#ef4444"
                    fill="#fecaca"
                    name="拦截数"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>风险等级分布</CardTitle>
              <CardDescription>近 24 小时风险事件计数</CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview?.riskDistribution ?? []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="riskLevel"
                    tick={{ fontSize: 12 }}
                    tickFormatter={getSituationRiskLevelLabel}
                  />
                  <YAxis allowDecimals={false} />
                  <Tooltip labelFormatter={getSituationRiskLevelLabel} />
                  <Bar dataKey="count" fill="#f97316" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/60 xl:col-span-2">
          <CardHeader>
            <CardTitle>访问来源地图（近 24 小时）</CardTitle>
            <CardDescription>
              支持广东 / 中国 / 世界三档切换，其中世界视角使用本地离线地图。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <SecurityAttackMap points={mapData?.points ?? []} />
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
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
            <div className="max-h-60 overflow-auto rounded-xl border border-border/60">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>地区</TableHead>
                    <TableHead>坐标</TableHead>
                    <TableHead>访问</TableHead>
                    <TableHead>风险</TableHead>
                    <TableHead>最近时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mapData?.points.slice(0, 10).map((point) => (
                    <TableRow
                      key={`${point.lng}-${point.lat}-${point.country}-${point.province}-${point.city}`}
                    >
                      <TableCell>{formatRegion(point)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {point.lng.toFixed(3)}, {point.lat.toFixed(3)}
                      </TableCell>
                      <TableCell>{point.count}</TableCell>
                      <TableCell>
                        <Badge variant={riskVariant(point.riskLevel)}>
                          {riskLabelMap[point.riskLevel]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatDateTime(point.lastSeen)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!mapData?.points.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="h-20 text-center text-muted-foreground"
                      >
                        暂无地域点位数据
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>高危告警时间线</CardTitle>
            <CardDescription>实时日志中高风险与严重风险事件</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {highRiskTimeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                当前筛选条件下暂无高危事件。
              </p>
            ) : (
              highRiskTimeline.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={riskVariant(item.riskLevel)}>
                      {riskLabelMap[item.riskLevel]}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{item.path ?? "-"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.maskedIp} · {formatRegion(item)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="border-border/60 xl:col-span-2">
          <CardHeader>
            <CardTitle>风险原因分布（前 8 项）</CardTitle>
            <CardDescription>按实时日志 reason 聚合</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reasonDistribution}
                layout="vertical"
                margin={{ left: 12, right: 12 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="reason"
                  type="category"
                  width={120}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>省份排行</CardTitle>
            <CardDescription>按访问量降序展示</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={overview?.topProvinces ?? []}
                layout="vertical"
                margin={{ left: 6, right: 6 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis
                  dataKey="province"
                  type="category"
                  width={84}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Bar
                  dataKey="total"
                  fill="#3b82f6"
                  name="访问"
                  radius={[0, 8, 8, 0]}
                />
                <Bar
                  dataKey="blocked"
                  fill="#ef4444"
                  name="拦截"
                  radius={[0, 8, 8, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
