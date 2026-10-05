import Link from "next/link";
import { ArrowRight, MessageSquare } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getQuestionSummaryByCompetition } from "@/lib/web-data";

interface QuestionSummaryCardProps {
  competitionId: string;
}

function getNameInitial(name: string) {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "U";
}

export async function QuestionSummaryCard({
  competitionId,
}: QuestionSummaryCardProps) {
  const questions = await getQuestionSummaryByCompetition(competitionId, 5);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="size-5 text-primary" />
          问答讨论
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {questions.length === 0 ? (
          <p className="text-muted-foreground">暂无问答</p>
        ) : (
          <>
            {questions.map((question) => (
              <Link
                key={question.id}
                href={`/competitions/${competitionId}/questions/${question.id}`}
                className="block rounded-lg border border-dashed border-border/70 px-4 py-2.5 transition-colors hover:bg-muted/40"
              >
                <p className="truncate font-medium">{question.title}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <Avatar className="size-5 border border-border/70">
                    <AvatarImage
                      src={question.authorImage ?? undefined}
                      alt={`${question.authorName} 头像`}
                    />
                    <AvatarFallback className="text-[9px]">
                      {getNameInitial(question.authorName)}
                    </AvatarFallback>
                  </Avatar>
                  <span>
                    {question.authorName} · {question.answerCount} 个回答
                  </span>
                </div>
              </Link>
            ))}
            <Link
              href={`/competitions/${competitionId}/questions`}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              查看全部问答
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
