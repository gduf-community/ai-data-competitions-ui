import Link from "next/link";
import { ArrowRight, BookOpenText, Award, UserCircle2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listPublishedPostsByCompetition } from "@/lib/web-data";

interface CompetitionExperienceSectionProps {
  competitionId: string;
}

function toPlainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function CompetitionExperienceSection({
  competitionId,
}: CompetitionExperienceSectionProps) {
  const posts = await listPublishedPostsByCompetition(competitionId, 5);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpenText className="size-5 text-primary" />
          经验文章
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {posts.length === 0 ? (
          <p className="text-muted-foreground">暂无经验文章</p>
        ) : (
          <>
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/profile/${post.userId}/experiences/${post.id}`}
                className="block rounded-lg border border-dashed border-border/70 px-4 py-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="line-clamp-1 font-medium">{post.title}</p>
                  {post.awardLevel ? (
                    <Badge
                      variant="secondary"
                      className="shrink-0 rounded-full bg-amber-50 text-amber-700 hover:bg-amber-50"
                    >
                      <Award className="mr-1 size-3" />
                      {post.awardLevel}
                    </Badge>
                  ) : null}
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">
                  {toPlainText(post.content)}
                </p>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <UserCircle2 className="size-3.5" />
                  <span>{post.userName}</span>
                  <span>·</span>
                  <span>{post.publishedAt}</span>
                </div>
              </Link>
            ))}
            <Link
              href="/hall-of-fame"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              查看更多经验文章
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
