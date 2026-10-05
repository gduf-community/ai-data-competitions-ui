import Link from "next/link";
import { Award } from "lucide-react";

import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getWebSession as auth } from "@/lib/web-session";
import type { AwardGalleryRow } from "@/lib/contracts/profiles";
import { listApprovedAwardsForGallery } from "@/lib/web-data";

interface AwardLevelGroup {
  level: string;
  awards: AwardGalleryRow[];
}

interface CompetitionGroup {
  competitionId: string;
  competitionTitle: string;
  levels: AwardLevelGroup[];
}

interface YearGroup {
  year: number;
  competitions: CompetitionGroup[];
}

const LEVEL_RANK: Array<[string, number]> = [
  ["特等", 0],
  ["一等", 1],
  ["二等", 2],
  ["三等", 3],
  ["优秀", 4],
  ["参与", 5],
];

const LEVEL_CATEGORY_RANK: Array<[string, number]> = [
  ["国家级", 0],
  ["省级", 1],
  ["市级", 2],
  ["校级", 3],
  ["院级", 4],
];

function rankBy(level: string, table: Array<[string, number]>): number {
  for (const [keyword, rank] of table) {
    if (level.includes(keyword)) return rank;
  }
  return 10;
}

function groupAwards(awards: AwardGalleryRow[]): YearGroup[] {
  const years = new Map<
    number,
    Map<string, { title: string; levels: Map<string, AwardGalleryRow[]> }>
  >();

  for (const award of awards) {
    const level = award.awardLevel?.trim() || "未标注等级";
    let competitions = years.get(award.competitionYear);
    if (!competitions) {
      competitions = new Map();
      years.set(award.competitionYear, competitions);
    }
    let competition = competitions.get(award.competitionId);
    if (!competition) {
      competition = { title: award.competitionTitle, levels: new Map() };
      competitions.set(award.competitionId, competition);
    }
    const levelAwards = competition.levels.get(level) ?? [];
    levelAwards.push(award);
    competition.levels.set(level, levelAwards);
  }

  return [...years.entries()]
    .sort(([left], [right]) => right - left)
    .map(([year, competitionMap]) => ({
      year,
      competitions: [...competitionMap.entries()]
        .map(([competitionId, competition]) => ({
          competitionId,
          competitionTitle: competition.title,
          levels: [...competition.levels.entries()]
            .map(([level, awards]) => ({ level, awards }))
            .sort((left, right) => {
              const rankDiff = rankBy(left.level, LEVEL_RANK) - rankBy(right.level, LEVEL_RANK);
              if (rankDiff !== 0) return rankDiff;
              const categoryDiff =
                rankBy(left.level, LEVEL_CATEGORY_RANK) -
                rankBy(right.level, LEVEL_CATEGORY_RANK);
              if (categoryDiff !== 0) return categoryDiff;
              return left.level.localeCompare(right.level, "zh-CN");
            }),
        }))
        .sort((left, right) =>
          left.competitionTitle.localeCompare(right.competitionTitle, "zh-CN"),
        ),
    }));
}

export default async function AwardsGalleryPage() {
  const [session, awards] = await Promise.all([
    auth(),
    listApprovedAwardsForGallery(),
  ]);

  const currentUser = session?.user
    ? {
        name: session.user.name ?? "未命名用户",
        role: session.user.role,
      }
    : null;

  const years = groupAwards(awards);

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf8_38%,#f5f1e8_100%)]">
      <PortalNavbar currentUser={currentUser} />
      <main className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <div className="space-y-10">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">荣誉展示</h1>
            <p className="text-sm text-slate-500">
              按年份与获奖等级整理展示各比赛上传的获奖证书。
            </p>
          </div>

          {years.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-slate-500">
                暂无已通过审核的获奖证书。
              </CardContent>
            </Card>
          ) : (
            years.map((yearGroup) => (
              <section key={yearGroup.year} className="space-y-6">
                <h2 className="text-xl font-semibold text-slate-900">
                  {yearGroup.year} 年
                </h2>

                {yearGroup.competitions.map((competition) => (
                  <div key={competition.competitionId} className="space-y-4">
                    <h3 className="text-base font-semibold text-slate-800">
                      {competition.competitionTitle}
                    </h3>

                    {competition.levels.map((levelGroup) => (
                      <div key={levelGroup.level} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
                          >
                            <Award className="mr-1 size-3" />
                            {levelGroup.level}
                          </Badge>
                          <span className="text-xs text-slate-400">
                            {levelGroup.awards.length} 份
                          </span>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {levelGroup.awards.map((award) => (
                            <Link key={award.id} href={`/awards/${award.id}`}>
                              <Card className="h-full overflow-hidden border-slate-200/70 bg-white/92 shadow-sm transition-shadow hover:shadow-md">
                                <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
                                  <LazyFillImage
                                    src={award.imageUrl}
                                    alt={`${award.competitionTitle} 奖状`}
                                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                                    fallbackText="奖状图片暂不可用"
                                    fallbackClassName="px-4 text-center"
                                  />
                                </div>
                                <CardContent className="space-y-1 p-3">
                                  <p className="line-clamp-1 text-sm font-medium text-slate-900">
                                    {award.competitionTitle}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {award.userName}
                                  </p>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </section>
            ))
          )}
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}
