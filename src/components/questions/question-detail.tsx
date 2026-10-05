import { Pin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownContent } from "./markdown-content";

interface QuestionDetailProps {
  title: string;
  body: string;
  authorName: string;
  authorImage?: string | null;
  status: string;
  isPinned: boolean;
  createdAt: string;
}

function getNameInitial(name: string) {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "U";
}

export function QuestionDetail({
  title,
  body,
  authorName,
  authorImage,
  status,
  isPinned,
  createdAt,
}: QuestionDetailProps) {
  const timeLabel = new Date(createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {isPinned && <Pin className="size-4 text-primary" />}
          <h1 className="text-xl font-semibold">{title}</h1>
          {status === "closed" && <Badge variant="secondary">已关闭</Badge>}
          {status === "hidden" && <Badge variant="destructive">已隐藏</Badge>}
        </div>
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
      </div>
      <MarkdownContent content={body} />
    </div>
  );
}
