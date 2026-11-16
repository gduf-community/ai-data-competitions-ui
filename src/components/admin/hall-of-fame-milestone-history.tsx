import { Calendar, History } from "lucide-react";

import { formatAdminHallOfFameLevelLabel } from "@/components/admin/hall-of-fame-helpers";
import { Badge } from "@/components/ui/badge";
import type { AdminHallOfFameMilestone } from "@/lib/contracts/profiles";
import { HALL_OF_FAME_MILESTONE_TYPE_LABELS } from "@/lib/hall-of-fame";

function formatAdminMilestoneTransition(
  item: AdminHallOfFameMilestone,
): string {
  const targetLabel = formatAdminHallOfFameLevelLabel(item.toLevel);
  if (item.eventType === "inducted" || item.fromLevel === null) {
    return `入选 ${targetLabel}`;
  }
  const sourceLabel = formatAdminHallOfFameLevelLabel(item.fromLevel);
  return `${sourceLabel} → ${targetLabel}`;
}

export function AdminHallOfFameMilestoneHistory({
  milestones,
  title = "入选与进阶履历明细",
}: {
  milestones?: AdminHallOfFameMilestone[];
  title?: string;
}) {
  return (
    <div className="space-y-2 rounded-md border bg-muted/20 p-3 text-xs">
      <div className="flex items-center justify-between gap-2 font-medium text-foreground">
        <span className="inline-flex items-center gap-1.5">
          <History className="size-3.5 text-muted-foreground" />
          {title}
        </span>
        <span className="text-[11px] font-normal text-muted-foreground">
          共 {milestones?.length ?? 0} 条
        </span>
      </div>

      {!milestones || milestones.length === 0 ? (
        <p className="text-muted-foreground">暂无入选与进阶履历记录。</p>
      ) : (
        <ol className="space-y-2">
          {milestones.map((item) => {
            const eventYearLabel =
              item.eventType === "promoted" ? "进阶年份" : "入选年份";
            return (
              <li
                key={item.id}
                className="space-y-1.5 rounded border border-border/70 bg-background p-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-[11px]">
                      {HALL_OF_FAME_MILESTONE_TYPE_LABELS[item.eventType]}
                    </Badge>
                    <span className="font-medium text-foreground">
                      {formatAdminMilestoneTransition(item)}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      成绩年份：{item.achievementYear} 年
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="size-3" />
                      {eventYearLabel}：{item.eventYear} 年
                    </span>
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed text-foreground/90">
                  {item.reason}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
