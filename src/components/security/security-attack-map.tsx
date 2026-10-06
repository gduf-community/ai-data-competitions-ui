"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Expand, Loader2, Minimize2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getSituationRiskLevelLabel } from "@/lib/security/security-display";
import {
  getFriendlyUiMessage,
  reportSecurityUiIssue,
} from "@/lib/security/security-ui-monitor";
import type { SituationMapPointView } from "@/lib/security/types";

const SERVER_COORD: [number, number] = [113.2644, 23.1291];

const MAP_ASSETS = {
  china: {
    mapName: "china",
    scriptId: "echarts-china-map-script",
    localUrl: "/vendor/echarts-maps/china.js",
    missingMessage: "地图资源暂未准备完成，请先查看中国视角。",
  },
  world: {
    mapName: "world",
    scriptId: "echarts-world-map-script",
    localUrl: "/vendor/echarts-maps/world.js",
    missingMessage: "世界视角暂未准备完成，请先查看中国视角。",
  },
} as const;

type MapScope = "guangdong" | "china" | "world";

const scopeLabels: Record<MapScope, string> = {
  guangdong: "广东",
  china: "中国",
  world: "世界",
};

declare global {
  interface Window {
    echarts?: unknown;
  }
}

function riskColor(level: SituationMapPointView["riskLevel"]) {
  if (level === "critical") return "#ef4444";
  if (level === "high") return "#f97316";
  if (level === "medium") return "#3b82f6";
  return "#22c55e";
}

function loadMapScript(scriptId: string, src: string, onLoad: () => void, onError: () => void) {
  const script = document.createElement("script");
  script.id = scriptId;
  script.src = src;
  script.async = true;
  script.referrerPolicy = "no-referrer";
  script.onload = onLoad;
  script.onerror = onError;
  document.head.appendChild(script);
}

async function ensureMapRegistered(
  echarts: typeof import("echarts"),
  asset: (typeof MAP_ASSETS)[keyof typeof MAP_ASSETS],
) {
  if (echarts.getMap(asset.mapName)) return;

  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (!echarts.getMap(asset.mapName)) {
        reject(new Error(asset.missingMessage));
        return;
      }
      resolve();
    };

    const existing = document.getElementById(asset.scriptId) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === "true") {
        finish();
        return;
      }
      existing.addEventListener("load", finish, { once: true });
      existing.addEventListener("error", () => reject(new Error(asset.missingMessage)), {
        once: true,
      });
      return;
    }

    window.echarts = echarts;
    loadMapScript(
      asset.scriptId,
      asset.localUrl,
      () => {
        const loadedScript = document.getElementById(asset.scriptId) as HTMLScriptElement | null;
        if (loadedScript) {
          loadedScript.dataset.loaded = "true";
        }
        finish();
      },
      () => reject(new Error(asset.missingMessage)),
    );
  });
}

function isChinaPoint(point: SituationMapPointView) {
  if (point.country?.includes("中国")) return true;
  return Boolean(point.province);
}

function isGuangdongPoint(point: SituationMapPointView) {
  return point.province?.includes("广东") ?? false;
}

function formatPointLabel(point: SituationMapPointView) {
  if (point.city && point.province) {
    return `${point.province} / ${point.city}`;
  }
  if (point.province) return point.province;
  if (point.country) return point.country;
  return "未知来源";
}

function getScopePoints(points: SituationMapPointView[], scope: MapScope) {
  if (scope === "guangdong") {
    return points.filter(isGuangdongPoint);
  }
  if (scope === "china") {
    return points.filter(isChinaPoint);
  }
  return points;
}

function getGeoOption(scope: MapScope) {
  if (scope === "guangdong") {
    return {
      map: MAP_ASSETS.china.mapName,
      roam: true,
      center: [113.3, 23.2] as [number, number],
      zoom: 4.6,
      scaleLimit: { min: 3.2, max: 12 },
    };
  }

  if (scope === "world") {
    return {
      map: MAP_ASSETS.world.mapName,
      roam: true,
      center: [108, 22] as [number, number],
      zoom: 1.08,
      scaleLimit: { min: 1, max: 8 },
    };
  }

  return {
    map: MAP_ASSETS.china.mapName,
    roam: true,
    center: [104, 35] as [number, number],
    zoom: 1.12,
    scaleLimit: { min: 1, max: 5 },
  };
}

function formatEastEightDateTime(value: string) {
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

function buildLineData(visiblePoints: SituationMapPointView[]) {
  return visiblePoints.slice(0, 20).map((point) => ({
    name: formatPointLabel(point),
    value: point.count,
    riskLevel: point.riskLevel,
    blocked: point.blocked,
    lastSeen: point.lastSeen,
    coords: [
      [point.lng, point.lat],
      SERVER_COORD,
    ],
  }));
}

function buildScatterData(visiblePoints: SituationMapPointView[]) {
  return visiblePoints.slice(0, 80).map((point) => ({
    name: formatPointLabel(point),
    value: [point.lng, point.lat, point.count],
    riskLevel: point.riskLevel,
    blocked: point.blocked,
    lastSeen: point.lastSeen,
  }));
}

function getTooltipHtml(params: { seriesType?: string; data?: Record<string, unknown> }) {
  const data = params.data ?? {};
  const riskText = getSituationRiskLevelLabel(String(data.riskLevel ?? "low"));
  const statusText = data.blocked ? "已拦截" : "已放行";
  const lastSeen = data.lastSeen ? formatEastEightDateTime(String(data.lastSeen)) : "-";

  if (params.seriesType === "lines") {
    return [
      `<div style="font-weight:600;margin-bottom:4px;">${String(data.name ?? "未知来源")}</div>`,
      `访问量：${String(data.value ?? 0)}`,
      `风险等级：${riskText}`,
      `处理状态：${statusText}`,
      `最近时间：${lastSeen}`,
    ].join("<br/>");
  }

  if (params.seriesType === "effectScatter") {
    return [
      `<div style="font-weight:600;margin-bottom:4px;">${String(data.name ?? "节点")}</div>`,
      `访问量：${String((data.value as number[] | undefined)?.[2] ?? "-")}`,
      `风险等级：${riskText}`,
      `处理状态：${statusText}`,
      `最近时间：${lastSeen}`,
    ].join("<br/>");
  }

  return "广州服务节点";
}

function AttackMapCanvas({
  points,
  scope,
  className,
  onWorldUnavailable,
}: {
  points: SituationMapPointView[];
  scope: MapScope;
  className?: string;
  onWorldUnavailable?: () => void;
}) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const visiblePoints = useMemo(() => getScopePoints(points, scope), [points, scope]);

  useEffect(() => {
    let disposed = false;
    let resizeHandler: (() => void) | null = null;
    let chart: import("echarts").ECharts | null = null;

    const run = async () => {
      try {
        setMapReady(false);
        setMapError(null);

        const echarts = await import("echarts");
        await ensureMapRegistered(echarts, MAP_ASSETS.china);
        if (scope === "world") {
          await ensureMapRegistered(echarts, MAP_ASSETS.world);
        }
        if (disposed || !chartRef.current) return;

        chart = echarts.getInstanceByDom(chartRef.current) ?? echarts.init(chartRef.current);
        chart.setOption(
          {
            backgroundColor: "transparent",
            tooltip: {
              trigger: "item",
              backgroundColor: "rgba(255,255,255,0.96)",
              borderColor: "rgba(148,163,184,0.45)",
              textStyle: { color: "#0f172a" },
              formatter: getTooltipHtml,
            },
            geo: {
              ...getGeoOption(scope),
              itemStyle: {
                areaColor: "#0f2542",
                borderColor: "#4c7aa8",
                borderWidth: 1,
              },
              emphasis: {
                itemStyle: {
                  areaColor: "#183a62",
                },
                label: {
                  color: "#f8fafc",
                },
              },
            },
            series: [
              {
                name: "访问飞线",
                type: "lines",
                coordinateSystem: "geo",
                zlevel: 2,
                effect: {
                  show: true,
                  period: 5,
                  trailLength: 0.15,
                  symbol: "arrow",
                  symbolSize: 6,
                },
                lineStyle: {
                  width: 1.2,
                  opacity: 0.52,
                  curveness: scope === "world" ? 0.18 : 0.28,
                  color: (params: { data?: { riskLevel?: SituationMapPointView["riskLevel"] } }) =>
                    riskColor(params.data?.riskLevel ?? "low"),
                },
                data: buildLineData(visiblePoints),
              },
              {
                name: "来源节点",
                type: "effectScatter",
                coordinateSystem: "geo",
                zlevel: 3,
                rippleEffect: {
                  scale: 3.2,
                  brushType: "stroke",
                },
                symbolSize: (value: number[]) => Math.max(6, Math.min(18, 4 + value[2] * 0.3)),
                itemStyle: {
                  color: (params: { data?: { riskLevel?: SituationMapPointView["riskLevel"] } }) =>
                    riskColor(params.data?.riskLevel ?? "low"),
                  shadowBlur: 10,
                  shadowColor: "rgba(56,189,248,0.45)",
                },
                data: buildScatterData(visiblePoints),
              },
              {
                name: "广州服务节点",
                type: "effectScatter",
                coordinateSystem: "geo",
                zlevel: 4,
                rippleEffect: {
                  scale: 4,
                  brushType: "stroke",
                },
                symbolSize: 14,
                itemStyle: {
                  color: "#22d3ee",
                },
                label: {
                  show: true,
                  position: "right",
                  formatter: "广州服务节点",
                  color: "#f8fafc",
                  fontWeight: 600,
                },
                data: [{ name: "广州服务节点", value: [...SERVER_COORD, 1] }],
              },
            ],
          },
          true,
        );

        setMapReady(true);
        resizeHandler = () => chart?.resize();
        window.addEventListener("resize", resizeHandler);
      } catch (error) {
        if (disposed) return;

        if (scope === "world") {
          onWorldUnavailable?.();
        }

        const detail = error instanceof Error ? error.message : "unknown";
        setMapError(getFriendlyUiMessage("加载地图"));
        setMapReady(false);
        void reportSecurityUiIssue({
          eventType: "security.ui.load_failed",
          summary: "安全地图加载失败",
          metadata: {
            module: "security_attack_map",
            scope,
            detail,
          },
        });
      }
    };

    void run();

    return () => {
      disposed = true;
      if (resizeHandler) {
        window.removeEventListener("resize", resizeHandler);
      }
      chart?.dispose();
    };
  }, [scope, visiblePoints, onWorldUnavailable]);

  return (
    <div
      className={
        className ??
        "relative h-[420px] overflow-hidden rounded-2xl border border-slate-300/70 bg-[linear-gradient(180deg,#10233d_0%,#0b1730_100%)] shadow-inner"
      }
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:48px_48px] opacity-50 [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.9),rgba(0,0,0,0.25))]" />
      <div ref={chartRef} className="h-full w-full" />

      {!mapReady && !mapError ? (
        <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-200">
          <Loader2 className="size-4 animate-spin" />
          地图加载中...
        </div>
      ) : null}

      {mapReady && visiblePoints.length === 0 ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-200">
          当前视角下暂无可展示的地理点位。
        </div>
      ) : null}

      {mapError ? (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-slate-200">
          {mapError}
        </div>
      ) : null}
    </div>
  );
}

interface SecurityAttackMapProps {
  points: SituationMapPointView[];
}

export function SecurityAttackMap({ points }: SecurityAttackMapProps) {
  const [scope, setScope] = useState<MapScope>("china");
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const visiblePoints = useMemo(() => getScopePoints(points, scope), [points, scope]);

  const handleWorldUnavailable = () => {
    setScope((current) => (current === "world" ? "china" : current));
  };

  return (
    <>
      <div className="space-y-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 shadow-sm">
            当前视角：{scopeLabels[scope]} / 点位 {visiblePoints.length}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              {(Object.keys(scopeLabels) as MapScope[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={scope === item ? "default" : "ghost"}
                  className="h-8 rounded-full px-3 text-xs"
                  onClick={() => setScope(item)}
                >
                  {scopeLabels[item]}
                </Button>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setFullscreenOpen(true)}>
              <Expand className="mr-2 size-4" />
              全屏查看
            </Button>
          </div>
        </div>

        <AttackMapCanvas points={points} scope={scope} onWorldUnavailable={handleWorldUnavailable} />
      </div>

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogContent className="max-w-[96vw] border-slate-200 bg-slate-50 p-4 sm:max-w-[96vw]">
          <DialogHeader className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <DialogTitle>访问来源地图</DialogTitle>
                <DialogDescription>
                  支持放大查看、拖拽漫游和鼠标缩放，时间统一按东八区展示。
                </DialogDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setFullscreenOpen(false)}>
                <Minimize2 className="mr-2 size-4" />
                退出全屏
              </Button>
            </div>
          </DialogHeader>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {(Object.keys(scopeLabels) as MapScope[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={scope === item ? "default" : "outline"}
                  onClick={() => setScope(item)}
                >
                  {scopeLabels[item]}
                </Button>
              ))}
            </div>
            <AttackMapCanvas
              points={points}
              scope={scope}
              onWorldUnavailable={handleWorldUnavailable}
              className="relative h-[78vh] overflow-hidden rounded-2xl border border-slate-300/70 bg-[linear-gradient(180deg,#10233d_0%,#0b1730_100%)]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
