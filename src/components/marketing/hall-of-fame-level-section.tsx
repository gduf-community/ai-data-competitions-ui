import Link from "next/link";
import { ArrowRight, Award, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type {
  PublicHallOfFameLevelNamesGroup,
  PublicHallOfFameNamesOverview,
} from "@/lib/contracts/profiles";
import {
  getHallOfFameLevelMeta,
  HALL_OF_FAME_LEVEL_ORDER,
  type HallOfFameLevel,
} from "@/lib/hall-of-fame";

export function HallOfFameLevelSection({
  level,
  group,
}: {
  level: HallOfFameLevel;
  group?: PublicHallOfFameLevelNamesGroup;
}) {
  const meta = getHallOfFameLevelMeta(level);
  const title = group?.name?.trim() || meta.name;
  const members = group?.members ?? [];
  const totalCount = group?.totalCount ?? members.length;

  return (
    <Card className="border-slate-200/70 bg-white/92 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge
                variant="secondary"
                className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
              >
                <Award className="mr-1 size-3.5" />
                {meta.shortName}
              </Badge>
              <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                <Users className="size-3" />
                共 {totalCount} 人
              </span>
            </div>
            <p className="text-sm leading-relaxed text-slate-500">
              {meta.description}
            </p>
          </div>

          <Link
            href={`/hall-of-fame/${level}`}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
          >
            查看本级详情
            <ArrowRight className="size-3.5" />
          </Link>
        </div>

        {members.length > 0 ? (
          <ul className="flex flex-wrap gap-2.5" aria-label={`${title}名单`}>
            {members.map((member) => (
              <li key={member.id} className="max-w-full">
                <Link
                  href={`/profile/${encodeURIComponent(member.userId)}`}
                  className="inline-block max-w-full break-words rounded-lg border border-slate-200/80 bg-slate-50/70 px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:border-amber-300 hover:bg-amber-50/70 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                >
                  {member.displayName}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
            该等级暂未公布成员
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function HallOfFameLevelsOverview({
  overview,
}: {
  overview: PublicHallOfFameNamesOverview;
}) {
  const byLevel = new Map(overview.levels.map((group) => [group.level, group]));

  return (
    <div className="space-y-6">
      {HALL_OF_FAME_LEVEL_ORDER.map((level) => (
        <HallOfFameLevelSection
          key={level}
          level={level}
          group={byLevel.get(level)}
        />
      ))}
    </div>
  );
}
