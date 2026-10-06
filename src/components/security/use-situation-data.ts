"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  SituationOverviewView,
  SituationMapView,
  SituationAccessLogView,
  SituationAccessPolicyView,
  SituationWhitelistEntryView,
} from "@/lib/security/types";
import { requestJSON, isAbortError } from "@/lib/http-client";
import { toast } from "@/lib/i18n/toast";
import {
  getFriendlyUiMessage,
  reportSecurityUiIssue,
} from "@/lib/security/security-ui-monitor";

// Read lifecycle only; policy/whitelist mutations remain in the controls module.
export function useSituationData() {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<SituationOverviewView | null>(null);
  const [mapData, setMapData] = useState<SituationMapView | null>(null);
  const [events, setEvents] = useState<SituationAccessLogView[]>([]);
  const [policy, setPolicy] = useState<SituationAccessPolicyView | null>(null);
  const [whitelist, setWhitelist] = useState<SituationWhitelistEntryView[]>([]);

  const request = useRef({
    id: 0,
    overviewId: 0,
    active: false,
    live: [] as SituationAccessLogView[],
    controller: undefined as AbortController | undefined,
    poll: undefined as AbortController | undefined,
  });
  const loadCoreData = useCallback(async () => {
    const state = request.current;
    state.id++;
    state.overviewId++;
    state.controller?.abort();
    state.poll?.abort();
    const id = state.id;
    const controller = new AbortController();
    state.controller = controller;
    state.active = true;
    state.live = [];
    setLoading(true);
    try {
      const [nextOverview, nextMap, nextEvents, nextPolicy, nextWhitelist] =
        await Promise.all([
          requestJSON<SituationOverviewView>(
            "/api/admin/security/situation/overview",
            { cache: "no-store", signal: controller.signal },
          ),
          requestJSON<SituationMapView>("/api/admin/security/situation/map", {
            cache: "no-store",
            signal: controller.signal,
          }),
          requestJSON<{ items: SituationAccessLogView[] }>(
            "/api/admin/security/situation/events?page_size=120",
            { cache: "no-store", signal: controller.signal },
          ),
          requestJSON<{ policy: SituationAccessPolicyView }>(
            "/api/admin/security/access-policy",
            { cache: "no-store", signal: controller.signal },
          ),
          requestJSON<{ items: SituationWhitelistEntryView[] }>(
            "/api/admin/security/ip-whitelist",
            { cache: "no-store", signal: controller.signal },
          ),
        ]);
      if (id !== state.id || controller.signal.aborted) return;
      setOverview(nextOverview);
      setMapData(nextMap);
      // Preserve the existing no-deduplication live semantics without overwriting newer arrivals.
      setEvents(
        state.live.length
          ? [...state.live, ...nextEvents.items].slice(0, 200)
          : nextEvents.items,
      );
      setPolicy(nextPolicy.policy);
      setWhitelist(nextWhitelist.items);
    } finally {
      if (id === state.id && !controller.signal.aborted) {
        state.active = false;
        setLoading(false);
      }
    }
  }, []);
  const reportFailure = useCallback((error: unknown, initial: boolean) => {
    if (isAbortError(error)) return;
    toast.error(
      getFriendlyUiMessage(initial ? "读取态势感知页面" : "刷新态势数据"),
    );
    void reportSecurityUiIssue({
      eventType: initial
        ? "security.ui.load_failed"
        : "security.ui.action_failed",
      summary: initial ? "初始化态势感知页面失败" : "刷新态势感知数据失败",
      metadata: {
        module: "security_situation_dashboard",
        detail: error instanceof Error ? error.message : "unknown",
      },
    });
  }, []);
  const reload = async () => {
    try {
      await loadCoreData();
    } catch (error) {
      reportFailure(error, false);
    }
  };
  useEffect(() => {
    const state = request.current;
    const initial = setTimeout(() => { void loadCoreData().catch((error) => reportFailure(error, true)); }, 0);
    let closed = false;
    const source = new EventSource("/api/admin/security/situation/live");
    source.addEventListener("access", (event) => {
      if (closed) return;
      try {
        const parsed = JSON.parse(
          (event as MessageEvent).data,
        ) as SituationAccessLogView;
        if (state.active) state.live = [parsed, ...state.live].slice(0, 200);
        setEvents((previous) => [parsed, ...previous].slice(0, 200));
      } catch {
        /* Keep the existing malformed-event behavior. */
      }
    });
    source.onerror = () => source.close();
    const timer = setInterval(() => {
      if (state.active) return;
      state.poll?.abort();
      const controller = new AbortController();
      state.poll = controller;
      const id = ++state.overviewId;
      void requestJSON<SituationOverviewView>(
        "/api/admin/security/situation/overview",
        { cache: "no-store", signal: controller.signal },
      )
        .then((payload) => {
          if (!closed && id === state.overviewId && !controller.signal.aborted)
            setOverview(payload);
        })
        .catch(() => {});
    }, 15_000);
    return () => {
      closed = true;
      state.id++;
      state.overviewId++;
      state.controller?.abort();
      state.poll?.abort();
      source.close();
      clearTimeout(initial);
      clearInterval(timer);
    };
  }, [loadCoreData, reportFailure]);
  return {
    loading,
    overview,
    mapData,
    events,
    policy,
    setPolicy,
    whitelist,
    setWhitelist,
    reload,
  };
}
