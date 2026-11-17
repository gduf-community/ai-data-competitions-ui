"use client";

import { useEffect, useState } from "react";

import type { OfficialAwardListResponse } from "@/lib/contracts/official-awards";
import { parseOfficialAwardList } from "@/lib/contracts/official-awards";

export type AwardListKind = "ok" | "forbidden" | "notfound" | "error";

type ListResult = {
  kind: AwardListKind;
  data: OfficialAwardListResponse | null;
  message: string;
  /** 该结果对应的数据身份；与当前 identity 不一致时不得展示。 */
  identity: string;
  requestKey: string;
  refreshKey: number;
};

const EMPTY: ListResult = { kind: "ok", data: null, message: "", identity: "", requestKey: "", refreshKey: -1 };

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
  // Refreshes of the same URL are distinct requests, including before effects commit.
  const requestKey = JSON.stringify([competitionId, query, identity, refreshKey]);

  useEffect(() => {
    if (!competitionId) return;
    let active = true;
    const controller = new AbortController();
    const owner = { identity, requestKey, refreshKey };

    const run = async () => {
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
              ...owner,
            });
          }
          return;
        }
        if (response.status === 404) {
          if (active) {
            setResult({ kind: "notfound", data: null, message: "比赛不存在，或该比赛还没有导入官方名单。", ...owner });
          }
          return;
        }
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { message?: string };
          throw new Error(payload.message ?? `加载获奖名单失败（HTTP ${response.status}）`);
        }
        const payload = parseOfficialAwardList(await response.json());
        if (payload.competitionId !== competitionId) throw new Error("获奖名单响应不属于当前比赛。");
        if (!active) return;
        setResult({ kind: "ok", data: payload, message: "", ...owner });
      } catch (cause) {
        if (!active || controller.signal.aborted) return;
        setResult({
          kind: "error",
          data: null,
          message: cause instanceof Error ? cause.message : "加载获奖名单失败",
          ...owner,
        });
      }
    };

    void run();
    return () => {
      active = false;
      controller.abort();
    };
  }, [competitionId, identity, query, refreshKey, requestKey]);

  const current = result.identity === identity;
  const data = current ? result.data : null;
  const settled = result.requestKey === requestKey;
  const kind: AwardListKind = settled ? result.kind : "ok";
  const loading = Boolean(competitionId) && !settled;

  return {
    settledRefreshKey: settled ? result.refreshKey : null,
    loading,
    kind,
    message: current ? result.message : "",
    data,
    summary: data?.summary,
    permissions: data?.permissions,
    rows: data?.items ?? [],
  };
}
