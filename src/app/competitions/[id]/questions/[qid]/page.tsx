import Link from "next/link";
import { ChevronRight, LogIn } from "lucide-react";
import { notFound } from "next/navigation";

import { getWebSession as auth } from "@/lib/web-session";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { Section } from "@/components/marketing/section";
import { AnswerForm } from "@/components/questions/answer-form";
import { QuestionDetail } from "@/components/questions/question-detail";
import { QuestionModerationBar } from "@/components/questions/question-moderation-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicCompetition as getCompetitionById, getQuestionDetail } from "@/lib/web-data";
import { CommentTree } from "@/components/questions/comment-tree";
import { QuestionDetailAnswers } from "./question-detail-answers";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ id: string; qid: string }>;
}) {
  const { id, qid } = await params;

  const [competition, data, session] = await Promise.all([
    getCompetitionById(id),
    getQuestionDetail(id, qid),
    auth(),
  ]);

  if (!competition || !data) {
    notFound();
  }
  const {question, answers, comments, canModerate, canAccept} = data;
  const userRole = session?.user?.role;

  const isLoggedIn = Boolean(session?.user);
  const currentUser = session?.user
    ? {
        name: session.user.name ?? "未命名用户",
        role: userRole ?? "student_user",
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <PortalNavbar currentUser={currentUser} />
      <Section className="pb-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/competitions" className="hover:text-foreground">
              比赛列表
            </Link>
            <ChevronRight className="size-3.5" />
            <Link href={`/competitions/${id}`} className="hover:text-foreground">
              {competition.title}
            </Link>
            <ChevronRight className="size-3.5" />
            <Link
              href={`/competitions/${id}/questions`}
              className="hover:text-foreground"
            >
              问答讨论
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="max-w-[200px] truncate text-foreground">
              {question.title}
            </span>
          </nav>

          {canModerate && (
            <QuestionModerationBar
              questionId={qid}
              competitionId={id}
              status={question.status}
              isPinned={question.isPinned}
            />
          )}

          <Card className="border-border/70">
            <CardContent className="pt-6">
              <QuestionDetail
                title={question.title}
                body={question.body}
                authorName={question.authorName}
                authorImage={question.authorImage ?? null}
                status={question.status}
                isPinned={question.isPinned}
                createdAt={question.createdAt}
              />
            </CardContent>
          </Card>

          <CommentTree comments={comments.filter(comment => comment.answerId === null)} questionId={qid} competitionId={id} isLoggedIn={isLoggedIn} />

          <div className="space-y-4">
            <h2 className="text-lg font-semibold">{answers.length} 个回答</h2>
            <QuestionDetailAnswers
              answers={answers}
              comments={comments}
              isLoggedIn={isLoggedIn}
              questionId={qid}
              competitionId={id}
              canAccept={canAccept}
            />
          </div>

          {isLoggedIn && question.status === "open" ? (
            <div className="rounded-xl border border-border/70 p-5">
              <h2 className="mb-4 font-medium">写下你的回答</h2>
              <AnswerForm questionId={qid} competitionId={id} />
            </div>
          ) : !isLoggedIn ? (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-border/70 px-5 py-4">
              <p className="text-sm text-muted-foreground">登录后可参与讨论</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/sign-in">
                  <LogIn className="mr-1.5 size-3.5" />
                  登录
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </Section>
      <PortalFooter />
    </div>
  );
}
