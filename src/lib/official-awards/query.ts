// 官方获奖名单的查询状态机（纯函数，便于单测）。
// URL 是唯一入口：筛选条件与「第几页」都由它推导，cursor 只保存在内存里。

export type AwardFilters = {
  year: string;
  level: string;
  subTrack: string;
  q: string;
};

export const DEFAULT_FILTERS: AwardFilters = { year: "all", level: "all", subTrack: "all", q: "" };

export type CursorState = {
  /** 每一页的起始 cursor，第 0 页为 null（第一页）。 */
  cursors: Array<string | null>;
  index: number;
};

export const INITIAL_CURSORS: CursorState = { cursors: [null], index: 0 };

function clean(value: string | null | undefined): string {
  return value && value !== "all" ? value.trim() : "";
}

export function parseFilters(search: string): AwardFilters {
  const params = new URLSearchParams(search);
  return {
    year: clean(params.get("year")) || "all",
    level: clean(params.get("level")) || "all",
    subTrack: clean(params.get("subTrack")) || "all",
    q: (params.get("q") ?? "").trim(),
  };
}

/** 只序列化筛选，不含 cursor（cursor 不写进 URL，避免分享后落在中间页）。 */
export function filtersToSearch(filters: AwardFilters): string {
  const params = new URLSearchParams();
  if (filters.year !== "all") params.set("year", filters.year);
  if (filters.level !== "all") params.set("level", filters.level);
  if (filters.subTrack !== "all") params.set("subTrack", filters.subTrack);
  if (filters.q.trim()) params.set("q", filters.q.trim());
  return params.toString();
}

export function buildListQuery(filters: AwardFilters, cursor: string | null, limit: number): string {
  const params = new URLSearchParams(filtersToSearch(filters));
  if (cursor) params.set("cursor", cursor);
  params.set("limit", String(limit));
  return params.toString();
}

/** 数据身份：竞赛 + 筛选 + cursor 都不同就不能复用旧数据。 */
export function dataIdentity(competitionId: string, filters: AwardFilters, cursor: string | null): string {
  return [competitionId, filtersToSearch(filters), cursor ?? "first"].join("|");
}

export function currentCursor(state: CursorState): string | null {
  return state.cursors[state.index] ?? null;
}

export function canGoPrev(state: CursorState): boolean {
  return state.index > 0;
}

/** 下一页：把 nextCursor 追加到当前页之后，并截断后续失效的页。 */
export function nextPage(state: CursorState, nextCursor: string | null): CursorState {
  if (!nextCursor) return state;
  const cursors = state.cursors.slice(0, state.index + 1);
  cursors[state.index + 1] = nextCursor;
  return { cursors, index: state.index + 1 };
}

export function prevPage(state: CursorState): CursorState {
  if (state.index === 0) return state;
  return { ...state, index: state.index - 1 };
}

export function resetCursor(): CursorState {
  return INITIAL_CURSORS;
}

/** 筛选变化时用于判断是否需要重置分页。 */
export function sameFilters(left: AwardFilters, right: AwardFilters): boolean {
  return (
    left.year === right.year &&
    left.level === right.level &&
    left.subTrack === right.subTrack &&
    left.q.trim() === right.q.trim()
  );
}
