"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  buildListQuery,
  currentCursor,
  dataIdentity,
  DEFAULT_FILTERS,
  filtersToSearch,
  INITIAL_CURSORS,
  nextPage,
  parseFilters,
  prevPage,
  resetCursor,
  type AwardFilters,
  type CursorState,
} from "@/lib/official-awards/query";

const SEARCH_DEBOUNCE_MS = 300;

/**
 * 官方获奖名单的查询状态：URL 是唯一入口，cursor 只存在内存里。
 * 返回的 identity 会把「竞赛 + 筛选 + cursor」绑定在一起，供列表与导出判断数据是否过期。
 */
export function useOfficialAwardQuery(competitionId: string, limit: number) {
  const [filters, setFilters] = useState<AwardFilters>(DEFAULT_FILTERS);
  const [keyword, setKeyword] = useState("");
  const [cursorState, setCursorState] = useState<CursorState>(INITIAL_CURSORS);
  const [ready, setReady] = useState(false);

  const appliedKey = useRef(filtersToSearch(DEFAULT_FILTERS));
  const lastUrl = useRef("");

  // 初始：从 URL 恢复筛选（只在挂载时读一次）。
  useEffect(() => {
    const parsed = parseFilters(window.location.search);
    const next: AwardFilters = { year: parsed.year, level: parsed.level, subTrack: parsed.subTrack, q: parsed.q };
    appliedKey.current = filtersToSearch(next);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters(next);
    setKeyword(parsed.q);
    setReady(true);
  }, []);

  // 前进/后退：URL 变化时恢复筛选并回到第一页。
  useEffect(() => {
    if (!ready) return;
    const onPopState = () => {
      const parsed = parseFilters(window.location.search);
      appliedKey.current = filtersToSearch(parsed);
      setFilters(parsed);
      setKeyword(parsed.q);
      setCursorState(resetCursor());
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [ready]);

  // 搜索防抖：只改 q，不立刻触发分页重置。
  useEffect(() => {
    const trimmed = keyword.trim();
    const timer = setTimeout(() => {
      setFilters((prev) => (prev.q === trimmed ? prev : { ...prev, q: trimmed }));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [keyword]);

  // 竞赛切换：清空分页并回到第一页。
  const previousCompetition = useRef(competitionId);
  useEffect(() => {
    if (previousCompetition.current === competitionId) return;
    previousCompetition.current = competitionId;
    setCursorState(resetCursor());
  }, [competitionId]);

  // 筛选真正变化时才重置分页，避免初始化与防抖把用户拉回第一页。
  useEffect(() => {
    if (!ready) return;
    const key = filtersToSearch(filters);
    if (key === appliedKey.current) return;
    appliedKey.current = key;
    setCursorState(resetCursor());
  }, [filters, ready]);

  // 写回 URL（replaceState，避免每次筛选都塞一条历史记录）。
  useEffect(() => {
    if (!ready) return;
    const query = filtersToSearch(filters);
    const url = query ? `?${query}` : window.location.pathname;
    if (lastUrl.current === url) return;
    lastUrl.current = url;
    window.history.replaceState(null, "", url);
  }, [filters, ready]);

  const cursor = currentCursor(cursorState);
  const identity = useMemo(() => dataIdentity(competitionId, filters, cursor), [competitionId, cursor, filters]);
  const query = useMemo(() => buildListQuery(filters, cursor, limit), [cursor, filters, limit]);

  const setYear = useCallback((value: string) => setFilters((prev) => ({ ...prev, year: value })), []);
  const setLevel = useCallback((value: string) => setFilters((prev) => ({ ...prev, level: value })), []);
  const setSubTrack = useCallback((value: string) => setFilters((prev) => ({ ...prev, subTrack: value })), []);

  const goNext = useCallback((nextCursor: string | null) => {
    setCursorState((prev) => nextPage(prev, nextCursor));
  }, []);
  const goPrev = useCallback(() => {
    setCursorState((prev) => prevPage(prev));
  }, []);

  return {
    ready,
    filters,
    keyword,
    setKeyword,
    setYear,
    setLevel,
    setSubTrack,
    cursor,
    canGoPrev: cursorState.index > 0,
    pageNumber: cursorState.index + 1,
    goNext,
    goPrev,
    query,
    identity,
  };
}
