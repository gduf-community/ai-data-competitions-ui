import Link from "next/link";
import { Award } from "lucide-react";

import { HallOfFameLevelsOverview } from "@/components/marketing/hall-of-fame-level-section";
import { resolvePublicHallOfFamePortraitSrc } from "@/components/profile/hall-of-fame-milestone-list";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getHallOfFameLevelMeta,
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  isHallOfFameHierarchyEnabled,
} from "@/lib/hall-of-fame";
import {
  getHallOfFameEntries,
  getHallOfFameNamesOverview,
} from "@/lib/web-data";

export default async function HallOfFamePage() {
  const hierarchyEnabled = isHallOfFameHierarchyEnabled();

  if (hierarchyEnabled) {
    const overview = await getHallOfFameNamesOverview();

    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf8_38%,#f5f1e8_100%)]">
        <PortalNavbar />
        <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
          <div className="space-y-8">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-950">名人堂</h1>
              <p className="text-sm text-slate-500">
                按入选等级完整展示在各类竞赛中表现突出的同学名单，点击姓名可查看正式档案与进阶履历。
              </p>
            </div>
            <HallOfFameLevelsOverview overview={overview} />
          </div>
        </main>
        <PortalFooter />
      </div>
    );
  }

  const entries = await getHallOfFameEntries();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf8_38%,#f5f1e8_100%)]">
      <PortalNavbar />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">名人堂</h1>
            <p className="text-sm text-slate-500">
              展示在各类竞赛中表现突出的同学，分享备赛经验与获奖心得。
            </p>
          </div>

          {entries.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const initial = entry.userName.charAt(0);
                const safeSrc =
                  resolvePublicHallOfFamePortraitSrc(entry) ?? undefined;
                return (
                  <Link
                    key={entry.id}
                    href={`/profile/${encodeURIComponent(entry.userId)}`}
                    className="block rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    <Card className="h-full border-slate-200/70 bg-white/92 shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                        <Avatar className="size-20 border border-slate-200/70">
                          <AvatarImage
                            src={safeSrc}
                            alt={`${entry.userName} 头像`}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-200 text-2xl font-bold text-indigo-700">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1.5">
                          <h3 className="text-base font-semibold text-slate-950">
                            {entry.userName}
                          </h3>
                          <div className="flex flex-wrap items-center justify-center gap-1.5">
                            {entry.level ? (
                              <Badge className="rounded-full bg-slate-900 text-white hover:bg-slate-900">
                                {getHallOfFameLevelMeta(entry.level).name}
                              </Badge>
                            ) : null}
                            {entry.memberStatus ? (
                              <Badge
                                variant="outline"
                                className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700"
                              >
                                {HALL_OF_FAME_MEMBER_STATUS_LABELS[entry.memberStatus]}
                              </Badge>
                            ) : null}
                            {entry.inductionYear ? (
                              <span className="text-xs text-slate-500">
                                入选 {entry.inductionYear} 年
                              </span>
                            ) : null}
                          </div>
                          {entry.tag ? (
                            <Badge
                              variant="secondary"
                              className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
                            >
                              <Award className="mr-1 size-3" />
                              {entry.tag}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm leading-6 text-slate-600">
                          {entry.bio}
                        </p>
                        {entry.college ? (
                          <p className="text-xs text-slate-400">
                            {entry.college}
                          </p>
                        ) : null}
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed border-slate-300 bg-white/86">
              <CardContent className="p-8 text-center">
                <p className="text-sm text-slate-500">当前暂无公开名人堂成员</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}
