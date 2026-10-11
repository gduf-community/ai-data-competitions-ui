/** Search comparison copies only. Never normalize stored content or identity keys. */
export type SearchMode = "fuzzy" | "exact";
export type SearchQuery = { q: string; mode: SearchMode; page: number; pageSize: number };
export type SearchHit<T> = { item: T; score: number; matchedFields: string[] };
export type SearchResult<T> = { items: SearchHit<T>[]; total: number; query: SearchQuery };
export type SearchField<T> = { key: string; weight: number; text: (item: T) => string | readonly string[] | null | undefined };

export class SearchQueryError extends Error {
  constructor(public code: "INVALID_QUERY" | "QUERY_TOO_LONG" | "UNSUPPORTED_SEARCH_MODE", message: string) {
    super(message);
  }
}

export function normalizeSearchText(text: string, mode: SearchMode = "fuzzy") {
  const normalized = text.normalize("NFKC").trim().toLowerCase();
  return mode === "fuzzy" ? normalized.replace(/\s+/gu, " ") : normalized;
}

export function searchParameter(params: URLSearchParams, key: string) {
  if (params.getAll(key).length > 1) throw new SearchQueryError("INVALID_QUERY", "搜索参数不能重复。");
  return params.get(key);
}

export function parseSearchQuery(params: URLSearchParams, options: { maxPageSize?: number; defaultPageSize?: number; preserveText?: boolean } = {}): SearchQuery {
  const mode = searchParameter(params, "mode") ?? "fuzzy";
  if (mode === "regex") throw new SearchQueryError("UNSUPPORTED_SEARCH_MODE", "当前入口未启用正则搜索。");
  if (mode !== "fuzzy" && mode !== "exact") throw new SearchQueryError("INVALID_QUERY", "无效的搜索模式。");
  const q = searchParameter(params, "q");
  const keyword = searchParameter(params, "keyword");
  if (q !== null && keyword !== null && q !== keyword) throw new SearchQueryError("INVALID_QUERY", "q 与 keyword 不能冲突。");
  const raw = q ?? keyword ?? "";
  if (raw.length > 256) throw new SearchQueryError("QUERY_TOO_LONG", "搜索内容最多 256 个 UTF-16 单元。");
  const normalized = options.preserveText ? raw.trim() : normalizeSearchText(raw, mode);
  if (normalized.length > 256) throw new SearchQueryError("QUERY_TOO_LONG", "规范化后的搜索内容过长。");
  const integer = (key: string, fallback: number, max: number) => {
    const value = searchParameter(params, key);
    if (value === null) return fallback;
    if (!/^[0-9]+$/.test(value)) throw new SearchQueryError("INVALID_QUERY", "分页参数必须为正整数。");
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new SearchQueryError("INVALID_QUERY", "分页参数超出范围。");
    return number;
  };
  const page = integer("page", 1, 1_000_001);
  const pageSize = integer("pageSize", options.defaultPageSize ?? 20, options.maxPageSize ?? 50);
  if ((page - 1) * pageSize > 1_000_000) throw new SearchQueryError("INVALID_QUERY", "分页偏移超出范围。");
  return { q: normalized, mode, page, pageSize };
}

export function serializeSearchQuery(query: SearchQuery, existing = new URLSearchParams()) {
  const params = new URLSearchParams(existing);
  for (const key of ["q", "keyword", "mode", "page", "pageSize"]) params.delete(key);
  if (query.q) params.set("q", query.q);
  if (query.mode !== "fuzzy") params.set("mode", query.mode);
  if (query.page !== 1) params.set("page", String(query.page));
  if (query.pageSize !== 20) params.set("pageSize", String(query.pageSize));
  return params;
}

/** Only the best tier counts. All tokens must occur in this one field. */
export function matchSearchText(text: string | null | undefined, query: Pick<SearchQuery, "q" | "mode">): number {
  if (!query.q || typeof text !== "string") return 0;
  const value = normalizeSearchText(text, query.mode);
  if (!value) return 0;
  if (value === query.q) return 100;
  if (query.mode === "exact") return 0;
  if (value.startsWith(query.q)) return 80;
  if (value.includes(query.q)) return 60;
  const tokens = [...new Set(query.q.split(" ").filter(Boolean))];
  const hits = tokens.filter(token => value.includes(token)).length;
  return hits === tokens.length && hits > 0 ? 40 : hits > 0 ? 20 : 0;
}

export function compareSearchIds(left: string, right: string) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function scoreSearchItem<T>(item: T, query: SearchQuery, fields: readonly SearchField<T>[]): SearchHit<T> {
  let score = 0;
  const matchedFields: string[] = [];
  for (const field of fields) {
    if (!Number.isSafeInteger(field.weight) || field.weight < 0) throw new Error("Invalid search weight.");
    const value = field.text(item);
    const values = typeof value === "string" ? [value] : value ?? [];
    const tier = Math.max(0, ...values.map(text => matchSearchText(text, query)));
    if (tier > 0 && field.weight > 0) {
      score = Math.max(score, tier * field.weight);
      if (!matchedFields.includes(field.key)) matchedFields.push(field.key);
    }
  }
  return { item, score, matchedFields };
}

/** Requires a complete authorized set. A remote page cannot enter this adapter. */
export function searchInMemory<T>(source: { kind: "complete"; items: readonly T[] }, query: SearchQuery, config: {
  fields: readonly SearchField<T>[]; id: (item: T) => string; compare: (left: T, right: T) => number;
}): SearchResult<T> {
  if (source.kind !== "complete") throw new Error("Memory search requires a complete dataset.");
  const ids = new Set<string>();
  const hits = source.items.map(item => {
    const id = config.id(item);
    if (ids.has(id)) throw new Error("Duplicate search ID.");
    ids.add(id);
    return scoreSearchItem(item, query, config.fields);
  }).filter(hit => !query.q || hit.score > 0);
  hits.sort((left, right) => right.score - left.score || config.compare(left.item, right.item) || compareSearchIds(config.id(left.item), config.id(right.item)));
  const start = (query.page - 1) * query.pageSize;
  return { items: hits.slice(start, start + query.pageSize), total: hits.length, query };
}

export function escapeLikePattern(value: string) {
  return value.replace(/!/g, "!!").replace(/%/g, "!%").replace(/_/g, "!_");
}
