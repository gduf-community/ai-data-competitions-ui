import Link from "next/link";
import { parseSearchQuery, serializeSearchQuery, searchParameter, SearchQueryError } from "@/lib/search";
import { CompetitionCard } from "@/components/competitions/competition-card";
import { CompetitionFilterBar } from "@/components/competitions/competition-filter-bar";
import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { Section } from "@/components/marketing/section";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { publicCompetitionFilterStatuses } from "@/lib/competition-status";
import { readAPI, WebApiError } from "@/lib/web-api";
import type { CompetitionStatus } from "@/lib/types";
import type { PublicCompetitionSummary } from "@/lib/contracts/public-portal";

export default async function CompetitionsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const metadata = await readAPI<{ years: Array<{ year: number; total: number }>; searchCapabilities?: { regex: boolean } }>("/api/competitions?limit=1");
  const allowRegex = process.env.SEARCH_REGEX_ENABLED === "true" && metadata.searchCapabilities?.regex === true;
  const params = await searchParams;
  const urlParams = new URLSearchParams();
  for (const [key, entry] of Object.entries(params)) for (const item of Array.isArray(entry) ? entry : entry === undefined ? [] : [entry]) urlParams.append(key, item);
  let search;
  let status: CompetitionStatus | "all" = "all";
  let year: number | null = null;
  try {
    search = parseSearchQuery(urlParams, { allowRegex });
    const rawStatus = searchParameter(urlParams, "status");
    const rawYear = searchParameter(urlParams, "year");
    if (rawStatus !== null) {
      if (!publicCompetitionFilterStatuses.includes(rawStatus as CompetitionStatus)) throw new SearchQueryError("INVALID_QUERY", "无效的比赛状态。");
      status = rawStatus as CompetitionStatus;
    }
    if (rawYear !== null) {
      if (!/^[0-9]{4}$/.test(rawYear) || Number(rawYear) < 1900) throw new SearchQueryError("INVALID_QUERY", "无效的比赛年份。");
      year = Number(rawYear);
    }
  } catch (error) { return <main className="p-8" role="alert">{error instanceof SearchQueryError ? error.message : "无效搜索参数"}<Link href="/competitions">重置搜索</Link></main>; }
  if (year === null) {
    // Preserve the existing latest-year default using aggregates and one bounded probe.
    year = metadata.years[0]?.year ?? null;
  }
  const page = search.page;
  const query = new URLSearchParams({ search: "1", q: search.q, mode: search.mode, page: String(page), pageSize: String(search.pageSize) });
  if (status !== "all") query.set("status", status);
  if (year !== null) query.set("year", String(year));
  let result;
  try { result = await readAPI<{
    competitions: PublicCompetitionSummary[]; total: number; years: Array<{ year: number; total: number }>;
  }>("/api/competitions?" + query); }
  catch (error) { if (!(error instanceof WebApiError)) throw error; return <main role="alert" className="p-8"><p>{error.publicMessage}</p><Link href={"/competitions?" + urlParams}>重试搜索</Link> · <Link href="/competitions">重置搜索</Link></main>; }
  const { competitions, total, years } = result;
  const href = (nextPage: number, nextYear = year) => {
    const navigation = serializeSearchQuery({ ...search, page: nextPage }, urlParams);

    if (status !== "all") navigation.set("status", status);
    if (nextYear !== null) navigation.set("year", String(nextYear));
    if (nextPage > 1) navigation.set("page", String(nextPage));
    return "/competitions" + (navigation.size ? "?" + navigation : "");
  };
  const pages = Math.max(1, Math.ceil(total / search.pageSize));

  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar />
      <main className="pt-24">
        <Section className="pb-10 pt-6 sm:pt-10">
          <div className="mx-auto max-w-7xl space-y-8">
            <PageHeader eyebrow="Competitions" title="比赛列表" description="按年份、报名状态和关键词浏览比赛，支持模糊与完整匹配，按年份和状态筛选。" />
            <nav aria-label="比赛年份" className="flex flex-wrap gap-3 border-t border-border/70 pt-6">
              {years.map(item => (
                <Link key={item.year ?? "all"} href={href(1, item.year)} aria-current={year === item.year ? "page" : undefined}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${year === item.year ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
                  {item.year} 年<span className="ml-2 text-xs opacity-80">{item.total}</span>
                </Link>
              ))}
            </nav>
            <CompetitionFilterBar key={JSON.stringify(search) + status + year} query={search} status={status} year={year} parameters={urlParams.toString()} allowRegex={allowRegex} />
            {competitions.length ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {competitions.map(competition => <CompetitionCard key={competition.id} competition={competition} />)}
              </div>
            ) : <EmptyState title="没有匹配的比赛" description="可以尝试切换年份或状态、更换关键词，或返回上一页。" />}
            <nav aria-label="比赛分页" className="flex items-center justify-between gap-4 text-sm">
              <span>共 {total} 场 · 第 {page} 页 / {pages} 页</span>
              <div className="flex gap-4">
                {page > 1 ? <Link href={href(page - 1)}>上一页</Link> : null}
                {page < pages ? <Link href={href(page + 1)}>下一页</Link> : null}
              </div>
            </nav>
          </div>
        </Section>
      </main>
      <NewFooter />
    </div>
  );
}
