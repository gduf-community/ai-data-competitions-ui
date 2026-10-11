"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  ListChecks,
  Megaphone,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { PageHeader } from "@/components/shared/page-header";
import { StatsCard } from "@/components/shared/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getFriendlyUiMessage, reportSecurityUiIssue } from "@/lib/security/security-ui-monitor";

interface DashboardPayload {
  stats: {
    competitions: number;
    applications: number;
    notices: number;
    users: number;
    activeCompetitions: number;
    pendingReviews: number;
    thisWeekSubmissions: number;
    approvalRate: number;
  };
  reviewTrend: Array<{ week: string; total: number }>;
  statusDistribution: Array<{
    status: "draft" | "submitted" | "approved" | "rejected" | "withdrawn" | "cancelled";
    total: number;
  }>;
}

const defaultPayload: DashboardPayload = {
  stats: {
    competitions: 0,
    applications: 0,
    notices: 0,
    users: 0,
    activeCompetitions: 0,
    pendingReviews: 0,
    thisWeekSubmissions: 0,
    approvalRate: 0,
  },
  reviewTrend: [],
  statusDistribution: [],
};

const statusLabelMap: Record<
  DashboardPayload["statusDistribution"][number]["status"],
  string
> = {
  draft: "草稿",
  submitted: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  withdrawn: "已撤回",
  cancelled: "已取消",
};

const statusColorMap: Record<
  DashboardPayload["statusDistribution"][number]["status"],
  string
> = {
  draft: "var(--color-chart-4)",
  submitted: "var(--color-chart-1)",
  approved: "var(--color-chart-2)",
  rejected: "var(--color-chart-5)",
  withdrawn: "var(--color-chart-3)",
  cancelled: "var(--color-chart-4)",
};

export default function AdminHomePage() {
  const [payload, setPayload] = useState<DashboardPayload>(defaultPayload);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
        const data = (await response.json()) as DashboardPayload & { message?: string };
        if (!response.ok) {
          throw new Error(data.message ?? "加载管理看板失败");
        }

        if (!cancelled) {
          setPayload(data);
        }
      } catch (error) {
        if (!cancelled) {
          const detail = error instanceof Error ? error.message : "unknown";
          toast.error(getFriendlyUiMessage("读取管理工作台"));
          void reportSecurityUiIssue({
            eventType: "security.ui.load_failed",
            summary: "读取管理工作台失败",
            metadata: {
              module: "admin_home",
              detail,
            },
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="后台总览"
          title="竞赛运营看板"
          description="面向正式运行期的业务驾驶舱，汇总赛事、报名、通知与审核负载。"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm">
                <Link href="/admin/applications">去审核报名</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/competitions">管理赛事</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/notices">发布通知</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/admin/security/situation">查看安全态势</Link>
              </Button>
            </div>
          }
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatsCard
            label="比赛总数"
            value={loading ? "--" : String(payload.stats.competitions)}
            description="当前已纳入平台运营的赛事总数"
            icon={<Trophy className="size-5 text-primary" />}
          />
          <StatsCard
            label="报名总数"
            value={loading ? "--" : String(payload.stats.applications)}
            description="平台累计收到的报名记录"
            icon={<ClipboardCheck className="size-5 text-primary" />}
          />
          <StatsCard
            label="通知总数"
            value={loading ? "--" : String(payload.stats.notices)}
            description="已发布与待发布通知总计"
            icon={<Megaphone className="size-5 text-primary" />}
          />
          <StatsCard
            label="用户总数"
            value={loading ? "--" : String(payload.stats.users)}
            description="已开通平台账号的师生用户"
            icon={<Users className="size-5 text-primary" />}
          />
          <StatsCard
            label="活跃比赛"
            value={loading ? "--" : String(payload.stats.activeCompetitions)}
            description="即将开始、报名中或进行中的赛事"
            icon={<Activity className="size-5 text-primary" />}
          />
          <StatsCard
            label="待审核报名"
            value={loading ? "--" : String(payload.stats.pendingReviews)}
            description="仍需管理员处理的报名记录"
            icon={<ListChecks className="size-5 text-primary" />}
          />
          <StatsCard
            label="本周新增"
            value={loading ? "--" : String(payload.stats.thisWeekSubmissions)}
            description="近 7 天新增报名量"
            icon={<ClipboardCheck className="size-5 text-primary" />}
          />
          <StatsCard
            label="通过率"
            value={loading ? "--" : `${payload.stats.approvalRate}%`}
            description="已通过报名占已完成审核报名的比例"
            icon={<ShieldCheck className="size-5 text-primary" />}
          />
        </div>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle>今日业务动作</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Button asChild variant="outline" className="justify-between">
              <Link href="/admin/applications">
                报名审核台
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/admin/analytics/competitions">
                查看赛事热度
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/admin/analytics/risk">
                查看风险预警
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="justify-between">
              <Link href="/admin/security/actions">
                进入处置执行台
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>报名趋势（近 4 周）</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  看板加载中...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={payload.reviewTrend}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="week" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="total" fill="var(--color-chart-1)" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>报名状态分布</CardTitle>
            </CardHeader>
            <CardContent className="h-[320px]">
              {loading ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  看板加载中...
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={payload.statusDistribution}
                      dataKey="total"
                      nameKey="status"
                      innerRadius={56}
                      outerRadius={96}
                      paddingAngle={2}
                    >
                      {payload.statusDistribution.map((item) => (
                        <Cell key={item.status} fill={statusColorMap[item.status]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value}`,
                        statusLabelMap[name as keyof typeof statusLabelMap],
                      ]}
                    />
                    <Legend
                      formatter={(value) =>
                        statusLabelMap[value as keyof typeof statusLabelMap]
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
