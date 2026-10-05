"use client";

import { useTransition, useRef } from "react";
import { toast } from "@/lib/i18n/toast";

import { submitQuestionCommand } from "@/lib/http-client";
import { useRouter } from "next/navigation";
import { AnswerCard } from "@/components/questions/answer-card";

import { CommentTree } from "@/components/questions/comment-tree";
import type { CommentWithAuthor } from "@/lib/contracts/questions";

interface Answer {
  id: string;
  authorName: string;
  authorImage?: string | null;
  body: string;
  isAccepted: boolean;
  createdAt: string;
}

interface QuestionDetailAnswersProps {
  answers: Answer[];
  questionId: string;
  competitionId: string;
  canAccept: boolean;
  comments: CommentWithAuthor[];
  isLoggedIn: boolean;
}

export function QuestionDetailAnswers({
  answers,
  questionId,
  competitionId,
  canAccept,
  comments,
  isLoggedIn,
}: QuestionDetailAnswersProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inFlight = useRef(false);

  function handleAccept(answerId: string) {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        await submitQuestionCommand({
          operation: "accept",
          answerId,
          questionId,
          competitionId,
        });
        router.refresh();
        toast.success("已采纳该回答");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "操作失败，请重试。");
      } finally { inFlight.current = false; }
    });
  }

  if (answers.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        暂无回答
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {answers.map((answer) => (
        <div key={answer.id}>
          <AnswerCard
            {...answer}
            canAccept={canAccept}
            isPending={isPending}
            onAccept={handleAccept}
          />
          <CommentTree comments={comments.filter(comment => comment.answerId === answer.id)} questionId={questionId} competitionId={competitionId} answerId={answer.id} isLoggedIn={isLoggedIn} />
        </div>
      ))}
    </div>
  );
}
