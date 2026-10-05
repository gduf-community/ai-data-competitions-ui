import type { QuestionStatus } from "@/lib/types";
import { z } from "zod";

const context = { competitionId: z.string().min(1) };
const question = { ...context, questionId: z.string().min(1) };
export const askQuestionSchema = z.object({ ...context,
  title: z.string().min(4, "标题至少 4 个字符").max(255),
  body: z.string().min(10, "正文至少 10 个字符"),
});
export const questionCommandSchema = z.discriminatedUnion("operation", [
  askQuestionSchema.extend({ operation: z.literal("ask") }),
  z.object({ ...question, operation: z.literal("answer"), body: z.string().min(1, "回答不能为空") }),
  z.object({ ...question, operation: z.literal("comment"), body: z.string().min(1, "评论不能为空"),
    answerId: z.string().min(1).nullable().optional(), parentId: z.string().min(1).nullable().optional() }),
  z.object({ ...question, operation: z.literal("accept"), answerId: z.string().min(1) }),
  z.object({ ...question, operation: z.literal("moderate"), action: z.enum(["close", "reopen", "hide", "pin", "unpin"]) }),
  z.object({ ...question, operation: z.literal("deleteQuestion") }),
  z.object({ ...question, operation: z.literal("deleteAnswer"), answerId: z.string().min(1) }),
  z.object({ ...context, operation: z.literal("deleteComment"), commentId: z.string().min(1) }),
]);
export type QuestionCommand = z.infer<typeof questionCommandSchema>;
export const questionWriteLimits = {
  ask: { namespace: "questions:ask", limit: 10, windowMs: 60_000, message: "提问过于频繁，请稍后再试。" },
  answer: { namespace: "questions:answer", limit: 20, windowMs: 60_000, message: "回答提交过于频繁，请稍后再试。" },
  comment: { namespace: "questions:comment", limit: 30, windowMs: 60_000, message: "评论提交过于频繁，请稍后再试。" },
} as const;

export interface QuestionWithAuthor {
  id: string;
  competitionId: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  title: string;
  body: string;
  status: QuestionStatus;
  isPinned: boolean;
  answerCount: number;
  createdAt: string;
}

export interface AnswerWithAuthor {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  body: string;
  isAccepted: boolean;
  createdAt: string;
}

export interface CommentWithAuthor {
  id: string;
  questionId: string;
  answerId: string | null;
  parentId: string | null;
  depth: number;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  body: string;
  createdAt: string;
}

export interface QuestionListResponse {
  questions: QuestionWithAuthor[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
export interface QuestionDetailResponse {
  question: QuestionWithAuthor;
  answers: AnswerWithAuthor[];
  comments: CommentWithAuthor[];
  canModerate: boolean;
  canAccept: boolean;
}
