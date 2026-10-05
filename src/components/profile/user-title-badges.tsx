"use client";

import { Badge } from "@/components/ui/badge";
import type { TitleInfo } from "@/lib/contracts/profiles";

interface UserTitleBadgesProps {
  titles: TitleInfo[];
  compact?: boolean;
}

const colorMap: Record<string, string> = {
  founder: "bg-amber-50 text-amber-800 border-amber-200",
  admin: "bg-blue-50 text-blue-800 border-blue-200",
  battleGenius: "bg-emerald-50 text-emerald-800 border-emerald-200",
};

export function UserTitleBadges({
  titles,
  compact = false,
}: UserTitleBadgesProps) {
  if (titles.length === 0) return null;

  const displayed = compact ? titles.slice(0, 1) : titles;

  return (
    <div className="flex flex-wrap gap-1.5">
      {displayed.map((title) => (
        <Badge
          key={title.key}
          variant="outline"
          className={colorMap[title.key] ?? ""}
        >
          {title.name}
        </Badge>
      ))}
    </div>
  );
}
