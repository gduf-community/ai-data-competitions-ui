import type { ClubContactType, ClubContentStatus, ClubContentType } from "@/lib/types";

export interface ClubContactRow {
  id: string;
  clubSlug: string;
  contactType: ClubContactType;
  label: string | null;
  value: string;
  displayOrder: number;
}

export interface ClubContentRow {
  id: string;
  clubSlug: string;
  authorId: string;
  contentType: ClubContentType;
  title: string;
  content: string;
  coverImage: string | null;
  coverImages: string[];
  status: ClubContentStatus;
  recruitmentStartAt: Date | null;
  recruitmentEndAt: Date | null;
  registrationUrl: string | null;
  eventStartAt: Date | null;
  eventEndAt: Date | null;
  eventLocation: string | null;
  reviewerId: string | null;
  reviewComment: string | null;
  reviewedAt: Date | null;
  publishedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubContentSummaryRow {
  id: string;
  clubSlug: string;
  contentType: ClubContentType;
  title: string;
  coverImage: string | null;
  coverImages: string[];
  status: ClubContentStatus;
  recruitmentStartAt: Date | null;
  recruitmentEndAt: Date | null;
  registrationUrl: string | null;
  eventStartAt: Date | null;
  eventEndAt: Date | null;
  eventLocation: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClubContentForReviewRow extends ClubContentRow {
  authorName: string;
  clubId: string;
  clubName: string;
}

export interface ClubAdminRow {
  id: string;
  clubSlug: string;
  userId: string;
  userName: string;
  userEmail: string;
  grantedBy: string | null;
  createdAt: Date;
}

export interface ClubAdminCandidateUser {
  id: string;
  name: string;
  email: string;
}

export type PublicClubContent = Pick<ClubContentRow, keyof ClubContentSummaryRow | "content">;
