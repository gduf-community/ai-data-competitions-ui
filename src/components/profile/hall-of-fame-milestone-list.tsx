import Link from "next/link";
import { ArrowLeft, Award, BookOpen, Calendar, History } from "lucide-react";

import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  PublicHallOfFameMilestone,
  PublicProfile,
} from "@/lib/contracts/profiles";
import {
  getHallOfFameLevelMeta,
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  HALL_OF_FAME_MILESTONE_TYPE_LABELS,
  sanitizePublicPortraitSrc,
} from "@/lib/hall-of-fame";

function formatMilestoneTransition(milestone: PublicHallOfFameMilestone): string {
  const targetName = getHallOfFameLevelMeta(milestone.toLevel).name;
  if (milestone.eventType === "inducted" || milestone.fromLevel === null) {
    return `入选 ${targetName}`;
  }
  const sourceName = getHallOfFameLevelMeta(milestone.fromLevel).name;
  return `${sourceName} → ${targetName}`;
}

export function HallOfFameMilestoneList({
  milestones,
}: {
  milestones?: PublicHallOfFameMilestone[];
}) {
  return (
    <section className="space-y-4" aria-labelledby="hof-milestones-heading">
      <div className="flex items-center gap-2">
        <History className="size-5 text-slate-700" />
        <h2
          id="hof-milestones-heading"
          className="text-lg font-semibold text-slate-950"
        >
          入选与进阶经历
        </h2>
      </div>

      {!milestones || milestones.length === 0 ? (
        <Card className="border-dashed border-slate-300 bg-white/86">
          <CardContent className="p-6 text-center">
            <p className="text-sm text-slate-500">入选与进阶履历待补录</p>
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-3">
          {milestones.map((item) => {
            const eventTimeLabel =
              item.eventType === "promoted" ? "进阶年份" : "入选年份";
            return (
              <li key={item.id}>
                <Card className="border-slate-200/70 bg-white/92 shadow-sm">
                  <CardContent className="space-y-2.5 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={
                            item.eventType === "promoted"
                              ? "rounded-full bg-indigo-50 text-indigo-700 hover:bg-indigo-50"
                              : "rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
                          }
                        >
                          {HALL_OF_FAME_MILESTONE_TYPE_LABELS[item.eventType]}
                        </Badge>
                        <span className="text-sm font-semibold text-slate-950">
                          {formatMilestoneTransition(item)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          取得成绩年份：{item.achievementYear} 年
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          {eventTimeLabel}：{item.eventYear} 年
                        </span>
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                      {item.reason}
                    </p>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

export function PublicProfileContent({ profile }: { profile: PublicProfile }) {
  const displayName =
    profile.hallOfFame.displayName?.trim() || profile.name;
  const displayGrade =
    profile.hallOfFame.displayGrade ?? profile.grade ?? null;
  const displayCollege =
    profile.hallOfFame.displayCollege ?? profile.college ?? null;
  const displayMajor =
    profile.hallOfFame.displayMajor ?? profile.major ?? null;
  const academicMeta = [displayGrade, displayCollege, displayMajor]
    .filter(Boolean)
    .join(" · ");

  const safePortraitSrc = sanitizePublicPortraitSrc(
    profile.hallOfFame.portraitUrl ??
      profile.hallOfFame.portraitThumbUrl ??
      profile.image ??
      profile.hallOfFame.userImage ??
      null,
  );
  const initial = displayName.charAt(0) || "榜";

  return (
    <div className="space-y-10">
      <Link
        href="/hall-of-fame"
        className="inline-flex items-center gap-1.5 rounded-md text-sm text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      >
        <ArrowLeft className="size-4" />
        返回名人堂
      </Link>

      <Card className="border-slate-200/70 bg-white/92 shadow-sm">
        <CardContent className="flex flex-col items-center gap-6 p-6 text-center sm:flex-row sm:items-start sm:p-8 sm:text-left">
          <div className="relative aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-br from-blue-50 to-indigo-100 sm:w-32">
            {safePortraitSrc ? (
              <LazyFillImage
                src={safePortraitSrc}
                alt={`${displayName} 公开展示照片`}
                sizes="(max-width: 640px) 112px, 128px"
                priority
                fallbackText={initial}
                fallbackClassName="bg-gradient-to-br from-blue-100 to-indigo-200 text-3xl font-bold text-indigo-700"
              />
            ) : (
              <div className="flex size-full items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-200 text-3xl font-bold text-indigo-700">
                {initial}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="break-words text-2xl font-bold text-slate-950">
                {displayName}
              </h1>
              {profile.hallOfFame.level ? (
                <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">
                  {getHallOfFameLevelMeta(profile.hallOfFame.level).name}
                </Badge>
              ) : null}
              {profile.hallOfFame.memberStatus ? (
                <Badge
                  variant="outline"
                  className={
                    profile.hallOfFame.memberStatus === "serving"
                      ? "rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "rounded-full border-slate-200 bg-slate-100 text-slate-700"
                  }
                >
                  {HALL_OF_FAME_MEMBER_STATUS_LABELS[profile.hallOfFame.memberStatus]}
                </Badge>
              ) : null}
            </div>

            {academicMeta ? (
              <p className="break-words text-sm text-slate-500">
                {academicMeta}
              </p>
            ) : null}

            {profile.hallOfFame.tag ? (
              <Badge
                variant="secondary"
                className="max-w-full whitespace-normal rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
              >
                <Award className="mr-1 size-3 shrink-0" />
                <span className="break-words">{profile.hallOfFame.tag}</span>
              </Badge>
            ) : null}

            {profile.hallOfFame.bio ? (
              <p className="max-w-2xl whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                {profile.hallOfFame.bio}
              </p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <HallOfFameMilestoneList milestones={profile.hallOfFame.milestones} />

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-950">经验展示</h2>
        </div>

        {profile.experiencePosts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.experiencePosts.map((post) => (
              <Link
                key={post.id}
                href={`/profile/${encodeURIComponent(profile.id)}/experiences/${encodeURIComponent(post.id)}`}
                className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
              >
                <Card className="h-full border-slate-200/70 bg-white/92 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <h3 className="break-words text-base font-semibold text-slate-950">
                      {post.title}
                    </h3>
                    {post.awardLevel ? (
                      <Badge
                        variant="secondary"
                        className="w-fit rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50"
                      >
                        {post.awardLevel}
                      </Badge>
                    ) : null}
                    {post.competitionTitle ? (
                      <p className="text-sm text-slate-500">
                        {post.competitionTitle}
                      </p>
                    ) : null}
                    <p className="text-xs text-slate-400">
                      发布于 {post.publishedAt}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-slate-300 bg-white/86">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-slate-500">暂无经验文章</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
