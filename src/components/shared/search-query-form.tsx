"use client";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { parseSearchQuery, serializeSearchQuery, type SearchQuery } from "@/lib/search";
import { createSearchSubmission } from "@/lib/search-input";

export function SearchQueryForm({ path, query, parameters = "", placeholder, status = "all", statuses = [] }: {
  path: string; query: SearchQuery; parameters?: string; placeholder: string;
  status?: string; statuses?: readonly { value: string; label: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(query.q);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const navigate = useCallback((value: string, history: "push" | "replace", mode = query.mode, nextStatus = status) => {
    try {
      const next = parseSearchQuery(new URLSearchParams({ q: value, mode, pageSize: String(query.pageSize) }));
      const params = serializeSearchQuery(next, new URLSearchParams(parameters));
      params.delete("status");
      if (nextStatus !== "all") params.set("status", nextStatus);
      const href = path + (params.size ? "?" + params : "") + window.location.hash;
      setError(undefined);
      if (href === window.location.pathname + window.location.search + window.location.hash) return;
      startTransition(() => router[history](href, { scroll: false }));
    } catch (error) { setError(error instanceof Error ? error.message : "无效的搜索内容。"); }
  }, [path, parameters, query.mode, query.pageSize, router, status]);
  const submission = useMemo(() => createSearchSubmission(navigate), [navigate]);
  useEffect(() => () => submission.cancel(), [submission]);
  return <form aria-busy={pending} className="flex flex-wrap gap-3 rounded-xl border p-4" onSubmit={event => { event.preventDefault(); submission.change(draft); submission.submit(); }}>
    <div className="min-w-48 flex-1"><Input ref={input} aria-label={placeholder} value={draft} maxLength={256} placeholder={placeholder}
      onChange={event => { setDraft(event.target.value); submission.change(event.target.value); }}
      onCompositionStart={() => submission.compositionStart()}
      onCompositionEnd={event => submission.compositionEnd(event.currentTarget.value)}
      onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} /></div>
    <Select value={query.mode} onValueChange={value => { submission.cancel(); navigate(draft, "push", value as SearchQuery["mode"]); }}>
      <SelectTrigger aria-label="搜索模式" className="w-32"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="fuzzy">模糊匹配</SelectItem><SelectItem value="exact">完整匹配</SelectItem></SelectContent>
    </Select>
    {statuses.length ? <Select value={status} onValueChange={value => { submission.cancel(); navigate(draft, "push", query.mode, value); }}>
      <SelectTrigger aria-label="状态筛选" className="w-40"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="all">全部状态</SelectItem>{statuses.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
      : null}
    <Button type="submit">搜索</Button>
    <Button type="button" variant="outline" onClick={() => { setDraft(""); submission.clear(); input.current?.focus(); }}>清空搜索</Button>
    <span role="status" className="basis-full text-sm">{error ?? (pending ? "正在更新搜索结果…" : "")}</span>
  </form>;
}
