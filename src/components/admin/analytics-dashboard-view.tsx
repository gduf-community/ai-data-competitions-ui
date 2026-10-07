"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { competitionStatusLabelMap } from "@/lib/competition-status";
import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
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
import type {
  AdminAnalyticsPayload,
  AdminAnalyticsRiskItem,
  AdminAnalyticsTabKey,
} from "@/lib/admin/analytics-types";
import { getFriendlyUiMessage, reportSecurityUiIssue } from "@/lib/security/security-ui-monitor";

const piePalette = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

const analyticsTabs: Array<{
  key: AdminAnalyticsTabKey;
  label: string;
  href: string;
}> = [
  { key: "overview", label: "总览", href: "/admin/analytics" },
  { key: "competitions", label: "赛事分析", href: "/admin/analytics/competitions" },
  { key: "funnel", label: "转化漏斗", href: "/admin/analytics/funnel" },
  { key: "users", label: "用户分析", href: "/admin/analytics/users" },
  { key: "notifications", label: "通知分析", href: "/admin/analytics/notifications" },
  { key: "risk", label: "风险预警", href: "/admin/analytics/risk" },
];

const statusLabelMap: Record<string, string> = {
  ...competitionStatusLabelMap,
  submitted: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  withdrawn: "已撤回",
  cancelled: "已取消",
};

const sectionMeta: Record<
  AdminAnalyticsTabKey,
  { title: string; description: string }
> = {
  overview: {
    title: "数据看板总览",
    description: "聚合核心指标、审核负载和风险概览，快速定位今日优先事项。",
  },
  competitions: {
    title: "赛事分析",
    description: "查看赛事热度、分类结构、状态分布与报名趋势。",
  },
  funnel: {
    title: "转化漏斗",
    description: "基于埋点与报名数据统计从曝光到提交、审核的链路转化情况。",
  },
  users: {
    title: "用户分析",
    description: "按学院、专业、年级查看报名画像，并识别高意向用户。",
  },
  notifications: {
    title: "通知分析",
    description: "观察通知发布后 24 小时与 72 小时对报名的触达与转化效果。",
  },
  risk: {
    title: "风险预警",
    description: "识别快截止低报名、低转化或审核积压的重点比赛。",
  },
};

function statusLabel(value: string) {
  return statusLabelMap[value] ?? value;
}

function riskBadgeVariant(level: AdminAnalyticsRiskItem["riskLevel"]) {
  if (level === "high") return "destructive" as const;
  if (level === "medium") return "secondary" as const;
  return "outline" as const;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function formatScope(scope: AdminAnalyticsPayload["scope"]) {
  return scope === "global" ? "全局权限视角" : "比赛作用域视角";
}

function buildRiskReasonDistribution(items: AdminAnalyticsRiskItem[]) {
  const counter = new Map<string, number>();
  for (const item of items) {
    for (const reason of item.reasons) {
      const key = reason.trim();
      if (!key) continue;
      counter.set(key, (counter.get(key) ?? 0) + 1);
    }
  }
  return [...counter.entries()]
    .map(([reason, count]) => ({
      reason: reason.length > 16 ? `${reason.slice(0, 16)}...` : reason,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

function AnalyticsTabs({ activeKey }: { activeKey: AdminAnalyticsTabKey }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max gap-2">
        {analyticsTabs.map((tab) => (
          <Button
            key={tab.key}
            asChild
            size="sm"
            variant={tab.key === activeKey ? "default" : "outline"}
          >
            <Link href={tab.href}>{tab.label}</Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

function EmptyPanel({ title }: { title: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-sm text-muted-foreground">
        当前暂无可视化数据：{title}
      </CardContent>
    </Card>
  );
}

function BiMetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="text-xs tracking-[0.18em] text-muted-foreground uppercase">{label}</div>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground">{note}</div>
    </div>
  );
}

function MethodologyCard({
  title,
  formula,
  factors,
}: {
  title: string;
  formula: string;
  factors: string[];
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>当前看板展示口径与计算方法</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-foreground">
          {formula}
        </div>
        <div className="space-y-2">
          {factors.map((item) => (
            <p key={item}>• {item}</p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewSection({ payload }: { payload: AdminAnalyticsPayload }) {
  const riskReasonDistribution = buildRiskReasonDistribution(payload.risk.items);
  const topRiskItems = payload.risk.items.slice(0, 5);

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>报表摘要</CardTitle>
          <CardDescription>核心数据摘要与关键指标概览。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">数据范围</div>
            <div className="mt-2 text-lg font-semibold">{formatScope(payload.scope)}</div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">更新时间</div>
            <div className="mt-2 text-lg font-semibold">
              {new Date(payload.generatedAt).toLocaleString("zh-CN")}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">风险比赛</div>
            <div className="mt-2 text-lg font-semibold">
              {payload.overview.highRiskCompetitions + payload.overview.mediumRiskCompetitions}
            </div>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="text-xs text-muted-foreground">指标说明</div>
            <div className="mt-2 text-sm text-muted-foreground">
              {payload.assumptions[0] ?? "以实际业务数据与埋点统计为准"}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <BiMetricCard label="比赛总数" value={String(payload.overview.competitions)} note="当前可见比赛总数" />
        <BiMetricCard
          label="活跃比赛"
          value={String(payload.overview.activeCompetitions)}
          note="报名中 / 即将开始 / 进行中"
        />
        <BiMetricCard label="报名总量" value={String(payload.overview.applications)} note="当前作用域内报名记录" />
        <BiMetricCard label="待审核" value={String(payload.overview.pendingReviews)} note="仍需管理员处理的申请" />
        <BiMetricCard
          label="审核通过率"
          value={formatPercent(payload.overview.approvalRate)}
          note="已通过 /（已通过 + 已驳回）"
        />
        <BiMetricCard
          label="已发布通知"
          value={String(payload.overview.publishedNotices)}
          note="处于发布态的通知数量"
        />
        <BiMetricCard
          label="近 7 天新增"
          value={String(payload.overview.thisWeekSubmissions)}
          note="近一周提交的报名记录"
        />
        <BiMetricCard
          label="高风险比赛"
          value={String(payload.overview.highRiskCompetitions)}
          note="需优先干预的比赛数量"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>风险分层</CardTitle>
            <CardDescription>高风险优先处理，中风险持续跟踪。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <span className="text-sm">高风险</span>
              <Badge variant="destructive">{payload.risk.high}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <span className="text-sm">中风险</span>
              <Badge variant="secondary">{payload.risk.medium}</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
              <span className="text-sm">低风险</span>
              <Badge variant="outline">{payload.risk.low}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>数据说明</CardTitle>
            <CardDescription>{formatScope(payload.scope)}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {payload.assumptions.map((item) => (
              <p key={item}>• {item}</p>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>报名趋势（近 6 期）</CardTitle>
            <CardDescription>总览视角快速观察报名温度变化。</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payload.competitions.registrationTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="报名数"
                  stroke="var(--color-chart-1)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>风险原因聚合</CardTitle>
            <CardDescription>按风险项理由去重汇总（前 8 项）</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {riskReasonDistribution.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                暂无风险原因可分析
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riskReasonDistribution} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis dataKey="reason" type="category" width={130} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--color-chart-4)" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>风险清单前 5 项</CardTitle>
          <CardDescription>按风险分从高到低排序，便于快速派单。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topRiskItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无风险项。</p>
          ) : (
            topRiskItems.map((item) => (
              <div key={item.competitionId} className="rounded-lg border border-border/60 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{item.title}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={riskBadgeVariant(item.riskLevel)}>
                      {item.riskLevel === "high"
                        ? "高风险"
                        : item.riskLevel === "medium"
                          ? "中风险"
                          : "低风险"}
                    </Badge>
                    <Badge variant="outline">风险分 {item.riskScore}</Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  报名 {item.registrations} · 待审核 {item.pendingReviews} · 截止剩余 {item.daysToDeadline} 天
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CompetitionsSection({ payload }: { payload: AdminAnalyticsPayload }) {
  const topRanking = payload.competitions.ranking.slice(0, 8).map((item, index) => ({
    ...item,
    rank: index + 1,
    shortTitle: item.title.length > 16 ? `${item.title.slice(0, 16)}...` : item.title,
  }));

  if (topRanking.length === 0) {
    return <EmptyPanel title="赛事分析" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>赛事热度排行（前 8 项）</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topRanking}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="shortTitle" tick={{ fontSize: 12 }} interval={0} angle={-15} textAnchor="end" height={70} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="heatScore" name="热度分" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>报名趋势（近 6 期）</CardTitle>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={payload.competitions.registrationTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="value"
                  name="报名数"
                  stroke="var(--color-chart-2)"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <MethodologyCard
          title="赛事热度算法"
          formula={payload.methodology.heatScore.formula}
          factors={payload.methodology.heatScore.factors}
        />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>状态分布</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payload.competitions.statusDistribution}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickFormatter={statusLabel} />
                <YAxis allowDecimals={false} />
                <Tooltip formatter={(value, name) => [value, statusLabel(String(name))]} />
                <Bar dataKey="value" name="状态数量" fill="var(--color-chart-3)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>分类分布</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payload.competitions.categoryDistribution}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={92}
                >
                  {payload.competitions.categoryDistribution.map((item, index) => (
                    <Cell key={item.label} fill={piePalette[index % piePalette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>赛事经营明细</CardTitle>
          <CardDescription>采用运营报表视角展示明细，便于横向比较。</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>赛事</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">报名数</TableHead>
                  <TableHead className="text-right">详情访问</TableHead>
                  <TableHead className="text-right">报名点击</TableHead>
                  <TableHead className="text-right">转化率</TableHead>
                  <TableHead className="text-right">热度分</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topRanking.map((item) => (
                  <TableRow key={item.competitionId}>
                    <TableCell className="min-w-[220px] font-medium">{item.title}</TableCell>
                    <TableCell>{statusLabel(item.status)}</TableCell>
                    <TableCell className="text-right">{item.registrations}</TableCell>
                    <TableCell className="text-right">{item.detailViews}</TableCell>
                    <TableCell className="text-right">{item.registerClicks}</TableCell>
                    <TableCell className="text-right">{formatPercent(item.conversionRate)}</TableCell>
                    <TableCell className="text-right">{item.heatScore}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FunnelSection({ payload }: { payload: AdminAnalyticsPayload }) {
  if (payload.funnel.length === 0) {
    return <EmptyPanel title="转化漏斗" />;
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle>链路转化明细</CardTitle>
        <CardDescription>“相对起点转化”表示相对首页访问的累计转化率。</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {payload.funnel.map((step) => (
          <div key={step.key} className="space-y-2 rounded-lg border border-border/60 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="font-medium">{step.label}</div>
              <Badge variant="outline">{step.count}</Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              从上一环节转化 {formatPercent(step.rateFromPrev)} · 相对起点转化 {formatPercent(step.rateFromTop)}
            </div>
            <div className="h-2 rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${Math.max(2, Math.min(step.rateFromTop, 100))}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function UsersSection({ payload }: { payload: AdminAnalyticsPayload }) {
  if (
    payload.users.byCollege.length === 0 &&
    payload.users.byMajor.length === 0 &&
    payload.users.byGrade.length === 0
  ) {
    return <EmptyPanel title="用户分析" />;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          label="用户总量"
          value={String(payload.users.totalUsers)}
          description="当前权限可见用户数"
        />
        <StatsCard
          label="活跃报名人"
          value={String(payload.users.activeApplicants)}
          description="至少提交过 1 次报名的用户"
        />
        <StatsCard
          label="高意向待转化"
          value={String(payload.users.highIntentUsers.length)}
          description="有报名动作但尚未通过审核"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>学院分布</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payload.users.byCollege}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="人数" fill="var(--color-chart-1)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>年级分布</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={payload.users.byGrade}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={92}
                >
                  {payload.users.byGrade.map((item, index) => (
                    <Cell key={item.label} fill={piePalette[index % piePalette.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>专业前 8 名</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {payload.users.byMajor.slice(0, 8).map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-md border border-border/60 p-2 text-sm">
                <span>{item.label}</span>
                <Badge variant="outline">{item.value}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>高意向用户</CardTitle>
            <CardDescription>建议对以下用户做定向通知或报名辅助。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {payload.users.highIntentUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无高意向待转化用户。</p>
            ) : (
              payload.users.highIntentUsers.map((item) => (
                <div
                  key={`${item.name}-${item.college}`}
                  className="rounded-md border border-border/60 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{item.name}</p>
                    <Badge variant="secondary">{item.attempts} 次</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.college} · {item.major} · 最新状态：{statusLabel(item.latestStatus)}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NotificationsSection({ payload }: { payload: AdminAnalyticsPayload }) {
  const chartData = payload.notifications.effects.slice(0, 6);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatsCard
          label="已发布"
          value={String(payload.notifications.publishedCount)}
          description="当前发布态通知"
        />
        <StatsCard
          label="草稿"
          value={String(payload.notifications.draftCount)}
          description="待完善通知"
        />
        <StatsCard
          label="下线"
          value={String(payload.notifications.withdrawnCount)}
          description="已下线通知"
        />
        <StatsCard
          label="通知浏览次数"
          value={String(payload.notifications.estimatedReadUsers)}
          description="通知中心与弹层的浏览记录"
        />
        <StatsCard
          label="通知点击次数"
          value={String(payload.notifications.estimatedClicks)}
          description="通知内赛事入口点击记录"
        />
        <StatsCard
          label="通知点击率"
          value={formatPercent(payload.notifications.conversionRate)}
          description="点击次数 / 浏览次数"
        />
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>通知效果（前 6 条）</CardTitle>
          <CardDescription>比较单条通知发布后 24 小时与 72 小时报名增长。</CardDescription>
        </CardHeader>
        <CardContent className="h-[340px]">
          {chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              暂无可分析的通知效果数据
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="title"
                  tick={{ fontSize: 12 }}
                  interval={0}
                  angle={-12}
                  textAnchor="end"
                  height={80}
                  tickFormatter={(value) =>
                    value.length > 14 ? `${value.slice(0, 14)}...` : value
                  }
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="within24h" name="24 小时报名增长" fill="var(--color-chart-2)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="within72h" name="72 小时报名增长" fill="var(--color-chart-4)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RiskSection({ payload }: { payload: AdminAnalyticsPayload }) {
  const reasonDistribution = buildRiskReasonDistribution(payload.risk.items);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard label="高风险" value={String(payload.risk.high)} description="建议立即干预" />
        <StatsCard label="中风险" value={String(payload.risk.medium)} description="建议重点跟进" />
        <StatsCard label="低风险" value={String(payload.risk.low)} description="常规巡检" />
      </div>

      <MethodologyCard
        title="风险预警算法"
        formula={payload.methodology.riskScore.formula}
        factors={payload.methodology.riskScore.factors}
      />

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>风险原因分布</CardTitle>
          <CardDescription>统计风险项中的触发原因词频。</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {reasonDistribution.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              暂无可统计风险原因
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reasonDistribution} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="reason" type="category" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--color-chart-5)" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle>风险清单</CardTitle>
          <CardDescription>按风险分从高到低排序。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {payload.risk.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无风险项。</p>
          ) : (
            payload.risk.items.map((item) => (
              <div key={item.competitionId} className="rounded-lg border border-border/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      状态：{statusLabel(item.status)} · 截止剩余 {item.daysToDeadline} 天
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={riskBadgeVariant(item.riskLevel)}>
                      {item.riskLevel === "high"
                        ? "高风险"
                        : item.riskLevel === "medium"
                          ? "中风险"
                          : "低风险"}
                    </Badge>
                    <Badge variant="outline">风险分 {item.riskScore}</Badge>
                  </div>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  报名数 {item.registrations} · 待审核 {item.pendingReviews}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminAnalyticsDashboardView({
  activeTab,
}: {
  activeTab: AdminAnalyticsTabKey;
}) {
  const [payload, setPayload] = useState<AdminAnalyticsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalyticsPayload = async () => {
    const response = await fetch("/api/admin/analytics", {
      cache: "no-store",
    });
    const data = (await response.json()) as AdminAnalyticsPayload & {
      message?: string;
    };
    if (!response.ok) {
      throw new Error(data.message ?? "加载数据看板失败");
    }
    return data;
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const data = await fetchAnalyticsPayload();
        if (!cancelled) {
          setPayload(data);
        }
      } catch (error) {
        if (!cancelled) {
          const detail = error instanceof Error ? error.message : "unknown";
          toast.error(getFriendlyUiMessage("读取数据看板"));
          void reportSecurityUiIssue({
            eventType: "security.ui.load_failed",
            summary: "读取数据看板失败",
            metadata: {
              module: "admin_analytics",
              tab: activeTab,
              detail,
            },
          });
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
  }, [activeTab]);

  const refreshAnalytics = async () => {
    setRefreshing(true);
    try {
      const data = await fetchAnalyticsPayload();
      setPayload(data);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown";
      toast.error(getFriendlyUiMessage("刷新数据看板"));
      void reportSecurityUiIssue({
        eventType: "security.ui.action_failed",
        summary: "刷新数据看板失败",
        metadata: {
          module: "admin_analytics",
          tab: activeTab,
          detail,
        },
      });
    } finally {
      setRefreshing(false);
    }
  };

  const section = useMemo(() => sectionMeta[activeTab], [activeTab]);

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8 rounded-2xl border border-border/60 bg-muted/20 p-4 md:p-5">
        <PageHeader
          eyebrow="数据看板"
          title={section.title}
          description={section.description}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void refreshAnalytics()}
                disabled={loading || refreshing}
              >
                {refreshing ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 size-4" />
                )}
                刷新
              </Button>
              <Badge variant="outline">
                {payload ? formatScope(payload.scope) : "加载中"}
              </Badge>
              <Badge variant="secondary">
                {payload
                  ? `更新于 ${new Date(payload.generatedAt).toLocaleString("zh-CN")}`
                  : "正在获取数据"}
              </Badge>
            </div>
          }
        />

        <AnalyticsTabs activeKey={activeTab} />

        {loading || !payload ? (
          <Card>
            <CardContent className="py-10 text-sm text-muted-foreground">
              数据看板加载中...
            </CardContent>
          </Card>
        ) : activeTab === "overview" ? (
          <OverviewSection payload={payload} />
        ) : activeTab === "competitions" ? (
          <CompetitionsSection payload={payload} />
        ) : activeTab === "funnel" ? (
          <FunnelSection payload={payload} />
        ) : activeTab === "users" ? (
          <UsersSection payload={payload} />
        ) : activeTab === "notifications" ? (
          <NotificationsSection payload={payload} />
        ) : (
          <RiskSection payload={payload} />
        )}
      </div>
    </div>
  );
}
