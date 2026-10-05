import Link from "next/link";
import { MessageSquare, Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface QuestionCardProps {
  id: string;
  competitionId: string;
  title: string;
  authorName: string;
  authorImage?: string | null;
  answerCount: number;
  isPinned: boolean;
  status: string;
  createdAt: string;
}

function getNameInitial(name: string) {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "U";
}

export function QuestionCard({
  id,
  competitionId,
  title,
  authorName,
  authorImage,
  answerCount,
  isPinned,
  status,
  createdAt,
}: QuestionCardProps) {
  const timeLabel = new Date(createdAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  return (
    <Link
      href={`/competitions/${competitionId}/questions/${id}`}
      className="group block rounded-xl border border-border/70 px-5 py-4 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <Avatar className="size-8 border border-border/70">
            <AvatarImage src={authorImage ?? undefined} alt={`${authorName} 头像`} />
            <AvatarFallback className="text-[11px]">
              {getNameInitial(authorName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              {isPinned && <Pin className="size-3.5 shrink-0 text-primary" />}
              <h3 className="truncate font-medium group-hover:text-primary">
                {title}
              </h3>
              {status === "closed" && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  已关闭
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {authorName} · {timeLabel}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <MessageSquare className="size-3.5" />
          <span>{answerCount}</span>
        </div>
      </div>
    </Link>
  );
}
