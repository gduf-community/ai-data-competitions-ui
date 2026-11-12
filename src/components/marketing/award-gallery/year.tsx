import type { AwardYearCompetitions } from "@/lib/contracts/award-gallery";
import { galleryHref } from "@/lib/award-gallery";
import { GalleryAction, GalleryCompetitionCard, GalleryFrame } from "./frame";

export function AwardYear({ data }: { data: AwardYearCompetitions }) {
  return (
    <GalleryFrame
      stage={1}
      year={data.year}
      title={`${data.year}年获奖比赛`}
      description={`已公开${data.competitionCount}项比赛、${data.certificateCount}份获奖证书。`}
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.competitions.map(entry => (
          <GalleryCompetitionCard key={entry.competitionId}>
            <h2 className="text-base font-semibold leading-7 break-words">{entry.competitionTitle}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {entry.levels.map(level => (
                <li key={level.level} className="flex justify-between gap-3">
                  <span className="min-w-0 break-words">{level.level}</span>
                  <span className="whitespace-nowrap">{level.certificateCount}份</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
              <span className="whitespace-nowrap text-sm text-muted-foreground">{entry.certificateCount}份证书</span>
              <GalleryAction href={galleryHref({ year: data.year, competition: entry.competitionId })}>
                查看获奖证书
              </GalleryAction>
            </div>
          </GalleryCompetitionCard>
        ))}
      </div>
    </GalleryFrame>
  );
}
