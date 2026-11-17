import Link from "next/link";
import type { AwardCompetitionSummary, AwardYearSummaries } from "@/lib/contracts/award-gallery";
import { galleryHref } from "@/lib/award-gallery";

interface CategoryEntry extends AwardCompetitionSummary {
  year: number;
}

interface CategoryGroup {
  category: string;
  entries: CategoryEntry[];
}

const collator = new Intl.Collator("zh-Hans-CN");

// Years already arrive newest first and competitions are title-sorted, so each
// category keeps a year-descending, then title-ascending order without a resort.
function groupCompetitions(data: AwardYearSummaries): CategoryGroup[] {
  const groups = new Map<string, CategoryEntry[]>();
  for (const year of data.years) {
    for (const competition of year.competitions) {
      const category = competition.category?.trim() || "未分类";
      const entries = groups.get(category) ?? [];
      entries.push({ ...competition, year: year.year });
      groups.set(category, entries);
    }
  }
  return [...groups]
    .map(([category, entries]) => ({ category, entries }))
    .sort((a, b) => collator.compare(a.category, b.category));
}

export function AwardCategoryRail({ data }: { data: AwardYearSummaries }) {
  const groups = groupCompetitions(data);
  if (!groups.length) return null;
  return (
    <nav
      aria-label="获奖比赛分类目录"
      className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-b from-primary/[0.07] via-background to-background shadow-sm"
    >
      <div className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-wide">按比赛分类浏览</h2>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          <span className="tabular-nums">{groups.length}</span> 个分类
        </span>
      </div>
      <div className="max-h-80 space-y-4 overflow-y-auto px-3 py-3 lg:max-h-[calc(100vh-11rem)]">
        {groups.map((group, index) => {
          const headingId = `award-category-${index}`;
          return (
            <section key={group.category} aria-labelledby={headingId}>
              <h3
                id={headingId}
                className="flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground"
              >
                <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />
                <span className="min-w-0 truncate">{group.category}</span>
                <span className="ml-auto whitespace-nowrap tabular-nums">{group.entries.length}项</span>
              </h3>
              <ul className="mt-1 space-y-0.5">
                {group.entries.map(entry => (
                  <li key={`${entry.year}-${entry.competitionId}`}>
                    <Link
                      prefetch={false}
                      href={galleryHref({ year: entry.year, competition: entry.competitionId })}
                      className="flex min-h-9 items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-primary/10 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
                    >
                      <span className="min-w-0 flex-1 break-words leading-6">{entry.competitionTitle}</span>
                      <span className="shrink-0 rounded-full bg-muted px-1.5 text-xs tabular-nums text-muted-foreground">
                        {entry.year}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </nav>
  );
}
