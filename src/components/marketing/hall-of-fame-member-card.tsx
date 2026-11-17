import Link from "next/link";
import { ArrowLeft, Award, Users } from "lucide-react";

import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  PublicHallOfFameLevelDetail,
  PublicHallOfFameLevelMember,
} from "@/lib/contracts/profiles";
import {
  getHallOfFameLevelMeta,
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  sanitizePublicPortraitSrc,
} from "@/lib/hall-of-fame";

export function HallOfFameMemberCard({
  member,
}: {
  member: PublicHallOfFameLevelMember;
}) {
  const safePortraitSrc = sanitizePublicPortraitSrc(
    member.portraitThumbUrl ?? member.portraitUrl ?? null,
  );
  const initial = member.displayName.trim().charAt(0) || "榜";
  const subline = [
    member.displayGrade,
    member.displayCollege,
    member.displayMajor,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/profile/${encodeURIComponent(member.userId)}`}
      className="group block h-full rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      <Card className="h-full border-slate-200/70 bg-white/92 shadow-sm transition-shadow group-hover:shadow-md">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
          <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200/80 bg-gradient-to-br from-blue-50 to-indigo-100">
            {safePortraitSrc ? (
              <LazyFillImage
                src={safePortraitSrc}
                alt={`${member.displayName} 展示照片`}
                sizes="80px"
                fallbackText={initial}
                fallbackClassName="bg-gradient-to-br from-blue-100 to-indigo-200 text-2xl font-bold text-indigo-700"
              />
            ) : (
              <span className="text-2xl font-bold text-indigo-700">
                {initial}
              </span>
            )}
          </div>

          <div className="w-full space-y-2">
            <h3 className="break-words text-base font-semibold text-slate-950">
              {member.displayName}
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-1.5">
              <Badge
                variant="outline"
                className={
                  member.memberStatus === "serving"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-700"
                }
              >
                {HALL_OF_FAME_MEMBER_STATUS_LABELS[member.memberStatus]}
              </Badge>
              {member.tag ? (
                <Badge
                  variant="secondary"
                  className="max-w-full whitespace-normal rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
                >
                  <Award className="mr-1 size-3 shrink-0" />
                  <span className="break-words">{member.tag}</span>
                </Badge>
              ) : null}
            </div>
          </div>

          {subline ? (
            <p className="break-words text-xs leading-relaxed text-slate-500">
              {subline}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}

export function HallOfFameLevelDetailView({
  detail,
}: {
  detail: PublicHallOfFameLevelDetail;
}) {
  const meta = getHallOfFameLevelMeta(detail.level);
  const title = detail.name?.trim() || meta.name;
  const description = detail.description?.trim() || meta.description;

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Link
          href="/hall-of-fame"
          className="inline-flex items-center gap-1.5 rounded-md text-sm text-slate-600 transition-colors hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <ArrowLeft className="size-4" />
          返回名人堂总览
        </Link>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge
              variant="secondary"
              className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
            >
              {meta.shortName}
            </Badge>
            <h1 className="text-2xl font-bold text-slate-950">{title}</h1>
          </div>

          <p className="text-sm leading-relaxed text-slate-600">
            {description}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700">
              <Users className="size-3.5" />
              共 {detail.counts.total} 人
            </span>
            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
              现役成员 {detail.counts.serving} 人
            </span>
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-3 py-1 font-medium text-slate-700">
              荣誉成员 {detail.counts.honorary} 人
            </span>
          </div>
        </div>
      </div>

      {detail.members.length > 0 ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {detail.members.map((member) => (
            <HallOfFameMemberCard key={member.id} member={member} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-slate-300 bg-white/86">
          <CardContent className="space-y-2 p-10 text-center">
            <h2 className="text-base font-semibold text-slate-900">
              该等级当前暂无公开成员
            </h2>
            <p className="text-sm text-slate-500">
              待成员完成资料确认与超级管理员审核后，将在此页完整展示。
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
