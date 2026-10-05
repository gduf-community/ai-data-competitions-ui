"use client";

import { useState, useTransition, useRef } from "react";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitQuestionCommand } from "@/lib/http-client";
import { useRouter } from "next/navigation";

interface CommentFormProps {
  questionId: string;
  competitionId: string;
  answerId?: string | null;
  parentId?: string | null;
  onSuccess?: () => void;
  compact?: boolean;
}

export function CommentForm({
  questionId,
  competitionId,
  answerId,
  parentId,
  onSuccess,
  compact,
}: CommentFormProps) {
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inFlight = useRef(false);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        await submitQuestionCommand({
          operation: "comment",
          questionId,
          competitionId,
          answerId: answerId ?? null,
          parentId: parentId ?? null,
          body: body.trim(),
        });
        router.refresh();
        setBody("");
        onSuccess?.();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "评论失败，请重试。");
      } finally { inFlight.current = false; }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        disabled={isPending}
        aria-label="评论内容"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={compact ? "写一条评论…" : "添加评论（支持 Markdown）"}
        rows={compact ? 1 : 2}
        className={compact ? "min-h-8 resize-none text-sm" : "resize-none text-sm"}
      />
      <Button
        size={compact ? "sm" : "default"}
        type="submit"
        disabled={isPending || !body.trim()}
      >
        {isPending ? "发送中…" : "评论"}
      </Button>
    </form>
  );
}
