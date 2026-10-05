"use client";

import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarkdownContent } from "./markdown-content";
import { CommentForm } from "./comment-form";

interface Comment {
  id: string;
  parentId: string | null;
  depth: number;
  authorName: string;
  authorImage?: string | null;
  body: string;
  createdAt: string;
}

interface CommentTreeProps {
  comments: Comment[];
  questionId: string;
  competitionId: string;
  answerId?: string | null;
  isLoggedIn?: boolean;
}

function getNameInitial(name: string) {
  const normalized = name.trim();
  return normalized ? normalized.charAt(0).toUpperCase() : "U";
}

function buildTree(comments: Comment[]) {
  const map = new Map<string | null, Comment[]>();
  for (const comment of comments) {
    const key = comment.parentId ?? null;
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key)!.push(comment);
  }
  return map;
}

function CommentNode({
  comment,
  childrenMap,
  questionId,
  competitionId,
  answerId,
  isLoggedIn,
}: {
  comment: Comment;
  childrenMap: Map<string | null, Comment[]>;
  questionId: string;
  competitionId: string;
  answerId?: string | null;
  isLoggedIn?: boolean;
}) {
  const [showReply, setShowReply] = useState(false);
  const children = childrenMap.get(comment.id) ?? [];
  const maxIndent = 4;
  const indent = Math.min(comment.depth, maxIndent);

  const timeLabel = new Date(comment.createdAt).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });

  return (
    <div style={{ marginLeft: `${indent * 24}px` }}>
      <div className="border-l-2 border-border/50 py-2 pl-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Avatar className="size-6 border border-border/70">
            <AvatarImage src={comment.authorImage ?? undefined} alt={`${comment.authorName} 头像`} />
            <AvatarFallback className="text-[10px]">
              {getNameInitial(comment.authorName)}
            </AvatarFallback>
          </Avatar>
          <span>
            {comment.authorName} · {timeLabel}
          </span>
        </div>
        <div className="mt-1 text-sm">
          <MarkdownContent content={comment.body} className="prose-xs" />
        </div>
        {isLoggedIn && (
          <button
            type="button"
            onClick={() => setShowReply((value) => !value)}
            className="mt-1 text-xs text-muted-foreground hover:text-primary"
          >
            {showReply ? "取消回复" : "回复"}
          </button>
        )}
        {showReply && (
          <div className="mt-2">
            <CommentForm
              questionId={questionId}
              competitionId={competitionId}
              answerId={answerId}
              parentId={comment.id}
              onSuccess={() => setShowReply(false)}
              compact
            />
          </div>
        )}
      </div>
      {children.map((child) => (
        <CommentNode
          key={child.id}
          comment={child}
          childrenMap={childrenMap}
          questionId={questionId}
          competitionId={competitionId}
          answerId={answerId}
          isLoggedIn={isLoggedIn}
        />
      ))}
    </div>
  );
}

export function CommentTree({
  comments,
  questionId,
  competitionId,
  answerId,
  isLoggedIn,
}: CommentTreeProps) {
  const childrenMap = buildTree(comments);
  const roots = childrenMap.get(null) ?? [];

  if (roots.length === 0 && !isLoggedIn) {
    return null;
  }

  return (
    <div className="space-y-1">
      {roots.map((root) => (
        <CommentNode
          key={root.id}
          comment={root}
          childrenMap={childrenMap}
          questionId={questionId}
          competitionId={competitionId}
          answerId={answerId}
          isLoggedIn={isLoggedIn}
        />
      ))}
      {isLoggedIn && (
        <div className="pt-2">
          <CommentForm
            questionId={questionId}
            competitionId={competitionId}
            answerId={answerId}
            compact
          />
        </div>
      )}
    </div>
  );
}
