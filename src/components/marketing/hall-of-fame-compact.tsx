import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Marquee } from "@/components/motion/marquee";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { HallOfFameEntry } from "@/lib/mock-data";

interface HallOfFameCompactProps {
  entries: HallOfFameEntry[];
}

function PersonCardCompact({ entry }: { entry: HallOfFameEntry }) {
  return (
    <Link href={`/profile/${entry.userId}`} className="block">
      <div className="flex w-[180px] flex-col items-center gap-2 rounded-xl border border-border/40 bg-background/60 p-4 text-center backdrop-blur-sm transition hover:scale-[1.02] hover:border-border">
        <Avatar className="size-12 border border-border/60">
          <AvatarImage
            src={entry.userImage ?? undefined}
            alt={`${entry.userName} 头像`}
            className="object-cover"
          />
          <AvatarFallback className="bg-primary/10 text-lg font-bold text-primary">
            {entry.userName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-0.5">
          <h4 className="text-sm font-medium text-foreground">
            {entry.userName}
          </h4>
          <Badge
            variant="secondary"
            className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap rounded-full text-[10px]"
          >
            {entry.tag}
          </Badge>
        </div>
        <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {entry.bio}
        </p>
      </div>
    </Link>
  );
}

export function HallOfFameCompact({ entries }: HallOfFameCompactProps) {
  if (entries.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">
          竞赛达人风采
        </h3>
        <Link
          href="/hall-of-fame"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          更多
          <ArrowRight className="size-3.5" />
        </Link>
      </div>
      <div className="relative overflow-hidden py-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-background to-transparent" />
        <Marquee speed={25} pauseOnHover>
          {entries.map((entry) => (
            <PersonCardCompact key={entry.id} entry={entry} />
          ))}
        </Marquee>
      </div>
    </div>
  );
}
