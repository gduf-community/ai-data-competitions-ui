import { Check } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownContent } from "./markdown-content";

interface AnswerCardProps {
  id: string;
  authorName: string;
  authorImage?: string | null;
  body: string;
  isAccepted: boolean;
  createdAt: string;
  canAccept?: boolean;
  isPending?: boolean;
  onAccept?: (answerId: string) => void;
}

function getNameInitial(name: string) {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "U";
}

export function AnswerCard({
  id,
  authorName,
  authorImage,
  body,
  isAccepted,
  createdAt,
  canAccept,
  isPending,
  onAccept,
}: AnswerCardProps) {
  const timeLabel = new Date(createdAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  return (
    <div
      className={`rounded-xl border px-5 py-4 ${
        isAccepted
          ? "border-green-500/40 bg-green-50/50 dark:bg-green-950/20"
          : "border-border/70"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Avatar className="size-7 border border-border/70">
            <AvatarImage src={authorImage ?? undefined} alt={`${authorName} 头像`} />
            <AvatarFallback className="text-[10px]">
              {getNameInitial(authorName)}
            </AvatarFallback>
          </Avatar>
          <span>
            {authorName} · {timeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isAccepted && (
            <Badge variant="outline" className="border-green-500/40 text-green-600">
              <Check className="mr-1 size-3" />
              已采纳
            </Badge>
          )}
          {canAccept && !isAccepted && onAccept && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => onAccept(id)}
              className="text-xs text-muted-foreground hover:text-primary"
            >
              采纳此回答
            </button>
          )}
        </div>
      </div>
      <MarkdownContent content={body} />
    </div>
  );
}
