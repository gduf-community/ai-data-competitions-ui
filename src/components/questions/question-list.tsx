import { QuestionCard } from "./question-card";

interface QuestionListProps {
  emptyLabel?: string;
  questions: Array<{
    id: string;
    competitionId: string;
    title: string;
    authorName: string;
    authorImage?: string | null;
    answerCount: number;
    isPinned: boolean;
    status: string;
    createdAt: string;
  }>;
}

export function QuestionList({ questions, emptyLabel = "暂无问答，成为第一个提问的人吧" }: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border/70 px-6 py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {questions.map((q) => (
        <QuestionCard key={q.id} {...q} />
      ))}
    </div>
  );
}
