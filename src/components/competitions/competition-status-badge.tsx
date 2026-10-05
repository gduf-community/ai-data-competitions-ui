import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { CompetitionStatus } from "@/lib/types";

const statusMap: Record<
  CompetitionStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "草稿",
    className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-300",
  },
  registration_open: {
    label: "报名中",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  upcoming: {
    label: "即将开始",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  in_progress: {
    label: "进行中",
    className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  finished: {
    label: "已结束",
    className: "border-border bg-muted text-muted-foreground",
  },
  previous_recording: {
    label: "往期比赛补录中",
    className: "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
  archived: {
    label: "已归档",
    className: "border-border bg-muted text-muted-foreground",
  },
};

interface CompetitionStatusBadgeProps {
  status: CompetitionStatus;
}

export function CompetitionStatusBadge({
  status,
}: CompetitionStatusBadgeProps) {
  const config = statusMap[status];

  return (
    <Badge variant="outline" className={cn("rounded-full px-2.5 py-1", config.className)}>
      {config.label}
    </Badge>
  );
}
