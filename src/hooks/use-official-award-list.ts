"use client";

import { useEffect, useState } from "react";

import type { OfficialAwardListResponse } from "@/lib/contracts/official-awards";

export type AwardListKind = "ok" | "forbidden" | "notfound" | "error";

type ListResult = {
  kind: AwardListKind;
  data: OfficialAwardListResponse | null;
  message: string;
  /** 该结果对应的数据身份；与当前 identity 不一致时不得展示。 */
  identity: string;
};

const EMPTY: ListResult = { kind: "ok", data: null, message: "", identity: "" };

/**
 * 列表加载：把结果与 (competitionId, filters, cursor) 绑定。
 * 身份不匹配时调用方必须按 loading 处理，避免切换赛事/筛选时露出旧数据。
 */
export function useOfficialAwardList(
  competitionId: string,
  query: string,
  identity: string,
  refreshKey: number,
) {
  const [result, setResult] = useState<ListResult>(EMPTY);
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    if (!competitionId) return;
    let active = true;
    const controller = new AbortController();

    const run = async () => {
      setRefreshing(true);
      try {
        const response = await fetch(
          `/api/admin/official-awards/competitions/${encodeURIComponent(competitionId)}?${query}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (response.status === 403) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          if (active) {
            setResult({
              kind: "forbidden",
              data: null,
              message: payload.message ?? "你没有查看该比赛获奖名单的权限。",
              identity,
            });
          }
          return;
        }
        if (response.status === 404) {
          if (active) {
            setResult({ kind: "notfound", data: null, message: "比赛不存在，或该比赛还没有导入官方名单。", identity });
          }
          return;
        }
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message ?? `加载获奖名单失败（HTTP ${response.status}）`);
        }
        const payload = (await response.json()) as OfficialAwardListResponse;
        if (!active) return;
        setResult({ kind: "ok", data: payload, message: "", identity });
      } catch (cause) {
        if (!active || controller.signal.aborted) return;
        setResult({
          kind: "error",
          data: null,
          message: cause instanceof Error ? cause.message : "加载获奖名单失败",
          identity,
        });
      } finally {
        if (active) setRefreshing(false);
      }
    };

    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [competitionId, identity, query, refreshKey]);

  const current = result.identity === identity;
  const data = current ? result.data : null;
  const kind: AwardListKind = current ? result.kind : "ok";
  const loading = refreshing || !current;

  return {
    loading,
    kind,
    message: current ? result.message : "",
    data,
    summary: data?.summary,
    permissions: data?.permissions,
    competition: data?.competition,
    rows: data?.items ?? [],
  };
}
