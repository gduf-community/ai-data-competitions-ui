import Link from "next/link";
import { Card } from "@/components/ui/card";
import type { AwardYearSummaries } from "@/lib/contracts/award-gallery";
import { galleryHref } from "@/lib/award-gallery";
import { GalleryAction, GalleryCompetitionCard, GalleryFrame } from "./frame";
import { AwardCount } from "./motion";

export function AwardOverview({ data }: { data: AwardYearSummaries }) {
  const counts = [
    { value: data.totals.certificateCount, unit: "份", label: "获奖证书" },
    { value: data.totals.competitionCount, unit: "项", label: "获奖比赛" },
    { value: data.totals.yearCount, unit: "年", label: "获奖年度" },
  ];
  const summary = data.totals.yearCount > 0 && (
    <aside aria-label="累计成果速览" className="max-w-full">
      <Card className="gap-4 rounded-xl bg-background p-5">
        <p className="text-sm">累计成果速览</p>
        <div className="flex flex-wrap gap-8">
          {counts.map(({ value, unit, label }) => (
            <div key={label}>
              <AwardCount value={value} unit={unit} />
              <p className="mt-2 text-sm text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      </Card>
    </aside>
  );
  return (
    <GalleryFrame stage={0} title="荣誉展示" description="按年份和比赛查看已公开的获奖证书。" summary={summary}>
      {data.years.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          暂无已通过审核的获奖证书。
        </p>
      )}
      <div className="space-y-5">
        {data.years.map(year => (
          <section key={year.year} className="rounded-xl border-2 border-primary/20 p-5 sm:p-7">
            <div className="mb-6 flex flex-wrap items-center gap-4">
              <h2 className="text-2xl font-semibold text-primary">{year.year}年</h2>
              <p className="text-sm text-muted-foreground">
                已公开{year.competitionCount}项比赛、{year.certificateCount}份获奖证书。
              </p>
              <GalleryAction href={galleryHref({ year: year.year })} className="sm:ml-auto">
                查看年度比赛
              </GalleryAction>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {year.competitions.map(entry => (
                <GalleryCompetitionCard key={entry.competitionId}>
                  <Link
                    prefetch={false}
                    href={galleryHref({ year: year.year, competition: entry.competitionId })}
                    className="flex h-full min-h-11 flex-col gap-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                  >
                    <h3 className="text-sm font-semibold leading-7 break-words">{entry.competitionTitle}</h3>
                    <p className="mt-auto whitespace-nowrap text-primary">
                      <strong className="text-2xl tabular-nums">{entry.certificateCount}</strong>
                      <span className="ml-1 text-sm text-muted-foreground">份证书</span>
                    </p>
                  </Link>
                </GalleryCompetitionCard>
              ))}
            </div>
          </section>
        ))}
      </div>
    </GalleryFrame>
  );
}
