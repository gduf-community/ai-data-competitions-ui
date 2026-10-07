import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateSituationMetrics } from "@/components/security/security-situation-presentation";
import type { SituationMapView, SituationOverviewView } from "@/lib/security/types";

const empty: SituationOverviewView = {
  today: { total: 0, guangdong: 0, blocked: 0, whitelist: 0 },
  windows: { fiveMinutes: { total: 0, blocked: 0 }, oneHour: { total: 0, blocked: 0 }, twentyFourHours: { total: 0, blocked: 0 } },
  trends: { fiveMinutes: [], oneHour: [], twentyFourHours: [] },
  topProvinces: [], riskDistribution: [],
};
test("situation presentation retains zero denominator and missing payload behavior", () => {
  const map: SituationMapView = { points: [], stats: { total: 0, blocked: 0, whitelist: 0, guangdong: 0 } };
  const result = calculateSituationMetrics(empty, map);
  assert.deepEqual(result, calculateSituationMetrics(null, null));
  assert.ok(Object.values(result).every(value => value === 0));
});
test("situation presentation uses API event totals even when locations are merged", () => {
  const overview: SituationOverviewView = {
    ...empty, today: { total: 2, guangdong: 2, blocked: 1, whitelist: 1 },
    windows: { ...empty.windows, twentyFourHours: { total: 3, blocked: 1 } },
    riskDistribution: [{ riskLevel: "high", count: 1 }, { riskLevel: "critical", count: 1 }, { riskLevel: "low", count: 1 }],
  };
  const map: SituationMapView = { points: [], stats: { total: 3, blocked: 1, whitelist: 2, guangdong: 3 } };
  const { blockedRate24h, ...metrics } = calculateSituationMetrics(overview, map);
  assert.ok(Math.abs(blockedRate24h - 100 / 3) < 1e-12);
  assert.deepEqual(metrics, {
    todayTotal: 2, todayBlocked: 1, total24h: 3, blocked24h: 1,
    guangdongRatio: 100, highRiskCount: 2,
  });
});
