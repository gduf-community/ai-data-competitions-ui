import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getClubThemeGradientClass } from "@/lib/data/club-theme";
import type { ClubRecord } from "@/lib/data/clubs";

interface ClubsOverviewProps {
  clubs: ClubRecord[];
}

export function ClubsOverview({ clubs }: ClubsOverviewProps) {
  return (
    <section id="clubs-overview" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {clubs.map((club) => (
            <article
              key={club.id}
              className={`glass-3 flex flex-col rounded-xl border border-border/50 bg-linear-to-br p-5 ${getClubThemeGradientClass(club.themeColor)}`}
            >
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="secondary" className="rounded-full">
                  {club.shortName}
                </Badge>
                <span className="text-xs text-muted-foreground">{clubs.length} 大社团</span>
              </div>
              <h3 className="mb-1 text-lg font-semibold text-foreground">{club.name}</h3>
              <p className="mb-3 text-sm text-muted-foreground">{club.slogan}</p>
              <p className="text-sm leading-6 text-muted-foreground">{club.description}</p>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="mt-4 w-fit"
              >
                <Link href={`/clubs/${club.id}`}>进入社团主页</Link>
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
