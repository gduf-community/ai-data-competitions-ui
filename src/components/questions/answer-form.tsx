"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "@/lib/i18n/toast";

import { submitQuestionCommand } from "@/lib/http-client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface AnswerFormProps {
  questionId: string;
  competitionId: string;
  onSuccess?: () => void;
}

export function AnswerForm({
  questionId,
  competitionId,
  onSuccess,
}: AnswerFormProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inFlight = useRef(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) {
      setError("回答不能为空");
      return;
    }

    setError("");
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        await submitQuestionCommand({
          operation: "answer",
          questionId,
          competitionId,
          body: trimmed,
        });
        router.refresh();
        setBody("");
        toast.success("回答已发布");
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "提交失败，请重试。");
      } finally { inFlight.current = false; }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        disabled={isPending}
        aria-label="回答内容"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="写下你的回答（支持 Markdown）"
        rows={4}
        className="resize-none"
        required
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "提交中..." : "发布回答"}
      </Button>
    </form>
  );
}
