"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/toast";

import { submitQuestionCommand } from "@/lib/http-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AskQuestionFormProps {
  competitionId: string;
  onSuccess?: () => void;
}

export function AskQuestionForm({
  competitionId,
  onSuccess,
}: AskQuestionFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const inFlight = useRef(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        await submitQuestionCommand({operation: "ask", competitionId, title: title.trim(), body: body.trim()});

        setTitle("");
        setBody("");
        toast.success("问题已发布");
        router.refresh();
        onSuccess?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "提交失败，请重试。");
      } finally { inFlight.current = false; }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="question-title">标题</Label>
        <Input
          disabled={isPending}
          id="question-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="简明扼要地描述你的问题"
          maxLength={255}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="question-body">详细描述（支持 Markdown）</Label>
        <Textarea
        disabled={isPending}
          id="question-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="提供更多背景信息，帮助他人理解你的问题…"
          rows={6}
          className="resize-none"
          required
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={isPending}>
        {isPending ? "提交中…" : "发布问题"}
      </Button>
    </form>
  );
}
