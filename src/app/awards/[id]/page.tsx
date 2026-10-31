import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Calendar, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { displayAwardLevel } from "@/lib/award-level";
import { getVisibleAwardById } from "@/lib/web-data";

interface AwardDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AwardDetailPage({
  params,
}: AwardDetailPageProps) {
  const { id } = await params;
  const award = await getVisibleAwardById(id);

  if (!award) {
    notFound();
  }


  return (
    <>
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-14">
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_360px]">
            <Card className="overflow-hidden border-slate-200/70 bg-white/92 shadow-sm">
              <CardContent className="p-0">
                <div className="relative aspect-[4/3] w-full bg-slate-100">
                  <LazyFillImage
                    src={award.imageUrl}
                    alt={`${award.competitionTitle} 奖状`}
                    sizes="(max-width: 1024px) 100vw, 60vw"
                    className="object-contain"
                    priority
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200/70 bg-white/96 shadow-sm">
              <CardContent className="flex h-full flex-col gap-5 p-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-amber-700">
                    <Trophy className="size-5" />
                    <span className="text-sm font-medium">奖状详情</span>
                  </div>
                  <div className="space-y-2">
                    <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
                      {award.competitionTitle}
                    </h1>
                    <p className="text-sm leading-6 text-slate-600">
                      荣誉展示中的获奖证书，可查看证书大图与基础获奖信息。
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {displayAwardLevel(award) ? (
                    <Badge
                      variant="secondary"
                      className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
                    >
                      <Award className="size-3" />
                      {displayAwardLevel(award)}
                    </Badge>
                  ) : null}
                  {award.awardYear != null ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 text-slate-700"
                    >
                      <Calendar className="size-3" />
                      年份：{award.awardYear}
                    </Badge>
                  ) : null}
                  {(award.memberNames.length > 0
                    ? award.memberNames
                    : [award.userName]
                  )
                    .slice(0, 6)
                    .map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="rounded-full border-slate-200 bg-slate-50 text-slate-700"
                      >
                        获奖人：{name}
                      </Badge>
                    ))}
                  {award.memberNames.length > 6 ? (
                    <Badge
                      variant="outline"
                      className="rounded-full border-slate-200 bg-slate-50 text-slate-700"
                    >
                      +{award.memberNames.length - 6} 人
                    </Badge>
                  ) : null}
                  <Badge
                    variant="outline"
                    className="rounded-full border-slate-200 bg-slate-50 text-slate-700"
                  >
                    <Calendar className="size-3" />
                    {new Date(award.createdAt).toLocaleDateString("zh-CN")}
                  </Badge>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 text-sm text-slate-600">
                  该奖状已通过审核，并展示在荣誉展示中。
                </div>

                <div className="mt-auto flex flex-wrap gap-3">
                  <Button asChild>
                    <Link
                      href={`/competitions/${award.competitionId}`}
                      className="scroll-mt-24"
                    >
                      查看相关比赛
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/hall-of-fame" className="scroll-mt-24">
                      查看名人堂
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}
