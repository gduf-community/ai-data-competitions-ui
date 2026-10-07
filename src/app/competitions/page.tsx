import Link from "next/link";
import { CompetitionCard } from "@/components/competitions/competition-card";
import { CompetitionFilterBar } from "@/components/competitions/competition-filter-bar";
import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { Section } from "@/components/marketing/section";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { publicCompetitionFilterStatuses } from "@/lib/competition-status";
import { readAPI } from "@/lib/web-api";
import type { CompetitionStatus } from "@/lib/types";
import type { PublicCompetitionSummary } from "@/lib/contracts/public-portal";

export default async function CompetitionsPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const keyword = value("keyword").trim().slice(0, 120);
  const status = publicCompetitionFilterStatuses.includes(value("status") as CompetitionStatus) ? value("status") as CompetitionStatus : "all";
  const rawYear = Number(value("year"));
  let year = Number.isInteger(rawYear) && rawYear >= 1900 && rawYear <= 9999 ? rawYear : null;
  if (year === null) {
    // Preserve the existing latest-year default using aggregates and one bounded probe.
    const metadata = await readAPI<{ years: Array<{ year: number; total: number }> }>("/api/competitions?limit=1");
    year = metadata.years[0]?.year ?? null;
  }
  const rawPage = Number(value("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? Math.min(rawPage, 33334) : 1;
  const query = new URLSearchParams({ limit: "30", offset: String((page - 1) * 30), sort: "registration" });
  if (keyword) query.set("keyword", keyword);
  if (status !== "all") query.set("status", status);
  if (year !== null) query.set("year", String(year));
  const { competitions, total, years } = await readAPI<{
    competitions: PublicCompetitionSummary[]; total: number; years: Array<{ year: number; total: number }>;
  }>("/api/competitions?" + query);
  const href = (nextPage: number, nextYear = year) => {
    const navigation = new URLSearchParams();
    if (keyword) navigation.set("keyword", keyword);
    if (status !== "all") navigation.set("status", status);
    if (nextYear !== null) navigation.set("year", String(nextYear));
    if (nextPage > 1) navigation.set("page", String(nextPage));
    return "/competitions" + (navigation.size ? "?" + navigation : "");
  };
  const pages = Math.max(1, Math.ceil(total / 30));

  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar />
      <main className="pt-24">
        <Section className="pb-10 pt-6 sm:pt-10">
          <div className="mx-auto max-w-7xl space-y-8">
            <PageHeader eyebrow="Competitions" title="比赛列表" description="按年份、报名状态和关键词浏览比赛，每页最多展示 30 场。" />
            <nav aria-label="比赛年份" className="flex flex-wrap gap-3 border-t border-border/70 pt-6">
              {years.map(item => (
                <Link key={item.year ?? "all"} href={href(1, item.year)} aria-current={year === item.year ? "page" : undefined}
                  className={`rounded-full border px-4 py-2 text-sm transition-colors ${year === item.year ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:border-primary/40"}`}>
                  {item.year} 年<span className="ml-2 text-xs opacity-80">{item.total}</span>
                </Link>
              ))}
            </nav>
            <CompetitionFilterBar key={keyword + status + year} keyword={keyword} status={status} year={year} />
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
