import Link from "next/link";
import { ArrowRight, Award, UserCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCompetitionShowcase } from "@/lib/web-data";

interface CompetitionHallOfFameSectionProps {
  competitionId: string;
  limit?: number;
}

export async function CompetitionHallOfFameSection({
  competitionId,
  limit = 5,
}: CompetitionHallOfFameSectionProps) {
  const entries = (await getCompetitionShowcase(competitionId)).entries.slice(0, limit);

  if (entries.length === 0) {
    return null;
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="size-5 text-primary" />
          比赛名人堂
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <>
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={`/profile/${entry.userId}`}
              className="block rounded-lg border border-dashed border-border/70 px-4 py-3 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="size-4 text-primary" />
                  <p className="font-medium">{entry.userName}</p>
                </div>
                <Badge variant="secondary" className="rounded-full">
                  {entry.tag}
                </Badge>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                {entry.bio}
              </p>
              {entry.college ? (
                <p className="mt-2 text-xs text-muted-foreground">{entry.college}</p>
              ) : null}
            </Link>
          ))}
          <Link
            href="/hall-of-fame"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            查看完整名人堂
            <ArrowRight className="size-3.5" />
          </Link>
        </>
      </CardContent>
    </Card>
  );
}
