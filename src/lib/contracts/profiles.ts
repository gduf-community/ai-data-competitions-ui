import { z } from "zod";

export type AwardStatus = "pending" | "approved" | "rejected";

// 奖状公开展示契约：memberNames 仅包含随奖状审核核验（verified）的成员。
export const awardShowcaseRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  memberNames: z.array(z.string()),
  competitionId: z.string().uuid(),
  competitionTitle: z.string(),
  awardLevel: z.string().nullable(),
  imageUrl: z.string(),
});
export type AwardShowcaseRow = z.infer<typeof awardShowcaseRowSchema>;

export const publicAwardDetailSchema = awardShowcaseRowSchema.extend({
  imageLargeUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type PublicAwardDetail = z.infer<typeof publicAwardDetailSchema>;

export const awardGalleryRowSchema = publicAwardDetailSchema.extend({
  competitionYear: z.number(),
});
export type AwardGalleryRow = z.infer<typeof awardGalleryRowSchema>;

export interface AwardForReviewRow {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  competitionId: string;
  competitionTitle: string;
  awardLevel: string | null;
  imageUrl: string;
  imageLargeUrl: string | null;
  status: string;
  showOnHomepage: boolean;
  reviewComment: string | null;
  displayOrder: number;
  createdAt: string;
  memberNames: string[];
}

export const awardMemberRowSchema = z.object({
  userId: z.string().uuid(),
  name: z.string(),
  college: z.string().nullable(),
});
export type AwardMemberRow = z.infer<typeof awardMemberRowSchema>;

export const awardMemberCandidateSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  college: z.string().nullable(),
  emailMasked: z.string().nullable(),
  studentNoMasked: z.string().nullable(),
});
export type AwardMemberCandidate = z.infer<typeof awardMemberCandidateSchema>;

export const memberSearchResponseSchema = z.object({
  users: z.array(awardMemberCandidateSchema),
});

export const awardMembersResponseSchema = z.object({
  members: z.array(awardMemberRowSchema),
});

export const myAwardRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  competitionId: z.string().uuid(),
  competitionTitle: z.string(),
  awardLevel: z.string().nullable(),
  imageUrl: z.string(),
  imageLargeUrl: z.string().nullable(),
  status: z.string(),
  showOnHomepage: z.boolean(),
  reviewComment: z.string().nullable(),
  displayOrder: z.number(),
  createdAt: z.string(),
  role: z.enum(["owner", "member"]),
  members: z.array(awardMemberRowSchema),
});
export type MyAwardRow = z.infer<typeof myAwardRowSchema>;

export type HallOfFameStatus = "invited" | "candidate" | "active" | "hidden";

export interface HallOfFameRow {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  college: string | null;
  tag: string;
  bio: string;
  adminBio: string | null;
  status: HallOfFameStatus;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export type ExperiencePostStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "offline";

export interface ExperiencePostRow {
  id: string;
  userId: string;
  competitionId: string | null;
  competitionTitle: string | null;
  title: string;
  content: string;
  awardLevel: string | null;
  coverImage: string | null;
  status: ExperiencePostStatus;
  reviewComment: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperiencePostForReviewRow extends ExperiencePostRow {
  userName: string;
  userImage: string | null;
}

export interface PublishedExperiencePostByCompetitionRow {
  id: string;
  userId: string;
  userName: string;
  competitionId: string | null;
  competitionTitle: string | null;
  title: string;
  content: string;
  awardLevel: string | null;
  coverImage: string | null;
  publishedAt: string;
}

export interface MeProfileData {
  user: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    studentNo: string | null;
    college: string | null;
    major: string | null;
    grade: string | null;
    phone: string | null;
  };
  profile: {
    nickname: string | null;
    gender: "male" | "female" | "other" | null;
    birthday: string | null;
    schoolName: string | null;
    department: string | null;
    enrollmentYear: number | null;
    educationLevel: string | null;
    inSchoolStatus: "yes" | "no" | "graduated" | null;
    publicBio: string | null;
    skillTags: string[];
    publicShowAvatar: boolean;
    publicShowCollegeMajor: boolean;
    publicShowTitles: boolean;
  } | null;
}

export interface PublicExperiencePost {
  id: string;
  userId: string;
  userName: string;
  competitionTitle: string;
  title: string;
  content: string;
  awardLevel: string;
  coverImage: string | null;
  publishedAt: string;
}

export interface PublicHallOfFameEntry {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  college: string | null;
  tag: string;
  bio: string;
  displayOrder: number;
}

export interface PublicProfile {
  id: string;
  name: string;
  college: string | null;
  image: string | null;
  hallOfFame: PublicHallOfFameEntry;
  experiencePosts: PublicExperiencePost[];
}

export interface TitleInfo {
  key: string;
  name: string;
  priority: number;
  description: string;
}
