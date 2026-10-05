"use client";

import { useTransition, useRef } from "react";
import { Pin, PinOff, Lock, Unlock, EyeOff } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { submitQuestionCommand } from "@/lib/http-client";
import { useRouter } from "next/navigation";

interface QuestionModerationBarProps {
  questionId: string;
  competitionId: string;
  status: string;
  isPinned: boolean;
}

export function QuestionModerationBar({
  questionId,
  competitionId,
  status,
  isPinned,
}: QuestionModerationBarProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inFlight = useRef(false);

  function handleAction(action: "close" | "reopen" | "hide" | "pin" | "unpin") {
    if (inFlight.current) return;
    inFlight.current = true;
    startTransition(async () => {
      try {
        await submitQuestionCommand({
          operation: "moderate",
          questionId,
          competitionId,
          action,
        });
        router.refresh();
        toast.success("操作成功");
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "操作失败，请重试。");
      } finally { inFlight.current = false; }
    });
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-dashed border-border/70 bg-muted/30 px-4 py-2">
      <span className="self-center text-xs font-medium text-muted-foreground">
        管理操作
      </span>
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => handleAction(isPinned ? "unpin" : "pin")}
      >
        {isPinned ? (
          <>
            <PinOff className="mr-1 size-3.5" /> 取消置顶
          </>
        ) : (
          <>
            <Pin className="mr-1 size-3.5" /> 置顶
          </>
        )}
      </Button>
      {status === "open" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => handleAction("close")}
        >
          <Lock className="mr-1 size-3.5" /> 关闭
        </Button>
      ) : status === "closed" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => handleAction("reopen")}
        >
          <Unlock className="mr-1 size-3.5" /> 重新开放
        </Button>
      ) : null}
      {status !== "hidden" && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => handleAction("hide")}
        >
          <EyeOff className="mr-1 size-3.5" /> 隐藏
        </Button>
      )}
    </div>
  );
}
