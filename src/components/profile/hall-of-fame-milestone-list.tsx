import Link from "next/link";
import { ArrowLeft, Award, BookOpen, Calendar, History } from "lucide-react";

import { userAwardsHref } from "@/components/marketing/award-gallery/user";
import { CertificateCard } from "@/components/marketing/certificate-card";
import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AwardUserCertificates } from "@/lib/contracts/award-gallery";
import type {
  PublicHallOfFameEntry,
  PublicHallOfFameMilestone,
  PublicProfile,
} from "@/lib/contracts/profiles";
import {
  getHallOfFameLevelMeta,
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  HALL_OF_FAME_MILESTONE_TYPE_LABELS,
  sanitizePublicPortraitSrc,
} from "@/lib/hall-of-fame";

/**
 * 判断公开人物记录是否仍属于未迁移的存量旧记录：
 * 仅当新三级与正式展示快照字段全部缺失时，才允许按旧人物开关兼容账号公开头像/学院字段；
 * 任一新体系字段存在时，绝不允许因正式照片缺失而回退消费可编辑账号头像或资料。
 */
export function isLegacyUnmigratedHallOfFameEntry(
  entry: PublicHallOfFameEntry,
): boolean {
  return (
    entry.level == null &&
    entry.memberStatus == null &&
    !entry.displayName?.trim() &&
    entry.displayGrade == null &&
    entry.displayCollege == null &&
    entry.displayMajor == null &&
    entry.portraitUrl == null &&
    entry.portraitThumbUrl == null &&
    (!entry.milestones || entry.milestones.length === 0)
  );
}

export function resolvePublicHallOfFamePortraitSrc(
  entry: PublicHallOfFameEntry,
  legacyProfileImage?: string | null,
): string | null {
  if (!isLegacyUnmigratedHallOfFameEntry(entry)) {
    return sanitizePublicPortraitSrc(
      entry.portraitUrl ?? entry.portraitThumbUrl ?? null,
    );
  }
  return sanitizePublicPortraitSrc(
    entry.userImage ?? legacyProfileImage ?? null,
  );
}

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

function ProfileAwardsSection({
  userId,
  data,
}: {
  userId: string;
  data: AwardUserCertificates | null;
}) {
  const awards = data?.awards ?? [];
  const total = data?.certificateCount ?? 0;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Award className="size-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-950">获奖证书</h2>
          {total > 0 ? (
            <span className="text-sm text-slate-500">共 {total} 份</span>
          ) : null}
        </div>
        {total > 0 ? (
          <Link
            href={userAwardsHref(userId)}
            prefetch={false}
            className="inline-flex min-h-9 items-center rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            详情
          </Link>
        ) : null}
      </div>

      {awards.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {awards.map((award) => (
            <CertificateCard
              key={award.id}
              award={award}
              level={award.level}
              nearViewport={false}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-slate-300 bg-white/86">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-slate-500">暂无公开获奖证书</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function PublicProfileContent({
  profile,
  awardsPreview,
}: {
  profile: PublicProfile;
  awardsPreview?: AwardUserCertificates | null;
}) {
  const legacyUnmigrated = isLegacyUnmigratedHallOfFameEntry(profile.hallOfFame);
  const displayName = legacyUnmigrated
    ? profile.hallOfFame.userName || profile.name
    : profile.hallOfFame.displayName?.trim() ||
      profile.hallOfFame.userName ||
      profile.name;
  const displayGrade = legacyUnmigrated
    ? (profile.grade ?? null)
    : (profile.hallOfFame.displayGrade ?? null);
  const displayCollege = legacyUnmigrated
    ? (profile.hallOfFame.college ?? profile.college ?? null)
    : (profile.hallOfFame.displayCollege ?? null);
  const displayMajor = legacyUnmigrated
    ? (profile.major ?? null)
    : (profile.hallOfFame.displayMajor ?? null);
  const academicMeta = [displayGrade, displayCollege, displayMajor]
    .filter(Boolean)
    .join(" · ");

  const safePortraitSrc = resolvePublicHallOfFamePortraitSrc(
    profile.hallOfFame,
    profile.image,
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

      <ProfileAwardsSection userId={profile.id} data={awardsPreview ?? null} />

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
