import type {
  SituationAccessLogView,
  SituationMapView,
  SituationOverviewView,
} from "@/lib/security/types";

import { getSituationRiskLevelLabel } from "@/lib/security/security-display";

export type TrendWindow = "fiveMinutes" | "oneHour" | "twentyFourHours";

export type EventRiskFilter = "all" | SituationAccessLogView["riskLevel"];

export type EventStatusFilter = "all" | "blocked" | "allowed";

export const trendLabels: Record<TrendWindow, string> = {
  fiveMinutes: "近 5 分钟",
  oneHour: "近 1 小时",
  twentyFourHours: "近 24 小时",
};

export const riskLabelMap: Record<SituationAccessLogView["riskLevel"], string> =
  {
    low: getSituationRiskLevelLabel("low"),
    medium: getSituationRiskLevelLabel("medium"),
    high: getSituationRiskLevelLabel("high"),
    critical: getSituationRiskLevelLabel("critical"),
  };

export function formatDateTime(value: string) {
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

export function formatRegion(input: {
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
  if (input.country) {
    return input.country;
  }
  return "未知 / -";
}

export function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function riskVariant(
  level: string,
): "default" | "secondary" | "destructive" | "outline" {
  if (level === "critical" || level === "high") return "destructive";
  if (level === "medium") return "default";
  if (level === "low") return "secondary";
  return "outline";
}

export function statusBadgeVariant(isBlocked: boolean) {
  return isBlocked ? "destructive" : "secondary";
}

export function buildActionLink(ip: string) {
  return `/admin/security/actions?targetType=ip&targetValue=${encodeURIComponent(ip)}`;
}

export function calculateSituationMetrics(
  overview: SituationOverviewView | null,
  mapData: SituationMapView | null,
) {
  const todayTotal = overview?.today.total ?? 0;
  const todayBlocked = overview?.today.blocked ?? 0;
  const window24 = overview?.windows.twentyFourHours;
  const total24h = window24?.total ?? 0;
  const blocked24h = window24?.blocked ?? 0;
  const blockedRate24h = total24h > 0 ? (blocked24h / total24h) * 100 : 0;
  const guangdongRatio =
    (mapData?.stats.total ?? 0) > 0
      ? ((mapData?.stats.guangdong ?? 0) / (mapData?.stats.total ?? 1)) * 100
      : 0;
  const highRiskCount = (overview?.riskDistribution ?? []).reduce(
    (sum, item) => {
      const level = item.riskLevel.toLowerCase();
      if (level === "high" || level === "critical") {
        return sum + item.count;
      }
      return sum;
    },
    0,
  );

  return {
    todayTotal,
    todayBlocked,
    total24h,
    blocked24h,
    blockedRate24h,
    guangdongRatio,
    highRiskCount,
  };
}
