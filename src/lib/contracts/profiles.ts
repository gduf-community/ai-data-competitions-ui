import { z } from "zod";
import {
  HALL_OF_FAME_YEAR_MAX,
  HALL_OF_FAME_YEAR_MIN,
} from "@/lib/hall-of-fame";

export type AwardStatus = "pending" | "approved" | "rejected";

// 奖状公开展示契约：memberNames 仅包含随奖状审核核验（verified）的成员。
export const awardShowcaseRowSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  userName: z.string(),
  memberNames: z.array(z.string()),
  competitionId: z.string().min(1), // 历史比赛编号非 UUID（后端 varchar(64)），仅要求非空。
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
  competitionId: z.string().min(1), // 历史比赛编号非 UUID（后端 varchar(64)），仅要求非空。
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
export type HallOfFameMemberStatus = "serving" | "honorary";
export type HallOfFamePhotoStatus = "unsubmitted" | "pending" | "published";
export type HallOfFamePhotoRequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "withdrawn";
export type HallOfFameMilestoneEventType = "inducted" | "promoted";

export const hallOfFameStatusSchema = z.enum([
  "invited",
  "candidate",
  "active",
  "hidden",
]);
export const hallOfFameLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export const hallOfFameMemberStatusSchema = z.enum(["serving", "honorary"]);
export const hallOfFamePhotoStatusSchema = z.enum([
  "unsubmitted",
  "pending",
  "published",
]);
export const hallOfFamePhotoRequestStatusSchema = z.enum([
  "pending",
  "approved",
  "rejected",
  "withdrawn",
]);
export const hallOfFameMilestoneEventTypeSchema = z.enum([
  "inducted",
  "promoted",
]);
export const hallOfFameYearSchema = z
  .number()
  .int()
  .min(HALL_OF_FAME_YEAR_MIN)
  .max(HALL_OF_FAME_YEAR_MAX);
export const hallOfFameRevisionSchema = z.number().int().min(0);

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

export const hallOfFameCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  grade: z.string().nullable(),
  college: z.string().nullable(),
  major: z.string().nullable(),
  alreadyInvited: z.boolean(),
  maskedHint: z.string().nullable().optional(),
});
export type HallOfFameCandidate = z.infer<typeof hallOfFameCandidateSchema>;

export const hallOfFameCandidatesResponseSchema = z.object({
  users: z.array(hallOfFameCandidateSchema),
});

export const hallOfFameInviteRequestSchema = z
  .object({
    userId: z.string().trim().min(1, "请先选择受邀成员"),
    level: hallOfFameLevelSchema,
    memberStatus: hallOfFameMemberStatusSchema,
    achievementYear: hallOfFameYearSchema,
    eventYear: hallOfFameYearSchema,
    inductionReason: z
      .string()
      .trim()
      .min(1, "请填写入选理由")
      .max(500, "入选理由最多 500 字"),
    tag: z.string().trim().max(120, "标签最多 120 字").optional(),
  })
  .refine((value) => value.achievementYear <= value.eventYear, {
    message: "入选年份不能早于成绩年份",
    path: ["eventYear"],
  });
export type HallOfFameInviteRequest = z.infer<
  typeof hallOfFameInviteRequestSchema
>;

export const adminHallOfFameMilestoneSchema = z.object({
  id: z.string(),
  eventType: hallOfFameMilestoneEventTypeSchema,
  fromLevel: hallOfFameLevelSchema.nullable(),
  toLevel: hallOfFameLevelSchema,
  achievementYear: hallOfFameYearSchema,
  eventYear: hallOfFameYearSchema,
  reason: z.string(),
  createdAt: z.string().optional(),
});
export type AdminHallOfFameMilestone = z.infer<
  typeof adminHallOfFameMilestoneSchema
>;

export const adminHallOfFameEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  displayName: z.string().nullable().optional(),
  displayGrade: z.string().nullable().optional(),
  displayCollege: z.string().nullable().optional(),
  displayMajor: z.string().nullable().optional(),
  college: z.string().nullable(),
  tag: z.string(),
  bio: z.string(),
  adminBio: z.string().nullable(),
  status: hallOfFameStatusSchema,
  level: hallOfFameLevelSchema.nullable().optional(),
  memberStatus: hallOfFameMemberStatusSchema.nullable().optional(),
  photoStatus: hallOfFamePhotoStatusSchema.optional(),
  portraitUrl: z.string().nullable().optional(),
  portraitThumbUrl: z.string().nullable().optional(),
  pendingPortraitUrl: z.string().nullable().optional(),
  publicConsentAt: z.string().nullable().optional(),
  revision: hallOfFameRevisionSchema.optional(),
  displayOrder: z.number(),
  milestones: z.array(adminHallOfFameMilestoneSchema).optional(),
  updatedAt: z.string().optional(),
});
export type AdminHallOfFameEntry = z.infer<typeof adminHallOfFameEntrySchema>;

export const adminHallOfFameListResponseSchema = z.object({
  data: z.array(adminHallOfFameEntrySchema),
  permissions: z
    .object({
      canManage: z.boolean().optional(),
    })
    .optional(),
  message: z.string().optional(),
});

export const hallOfFameAdminUpdateRequestSchema = z.object({
  expectedRevision: hallOfFameRevisionSchema,
  displayName: z.string().trim().min(1, "请填写展示姓名").max(100),
  displayGrade: z.string().trim().max(64).nullable().optional(),
  displayCollege: z.string().trim().max(120).nullable().optional(),
  displayMajor: z.string().trim().max(120).nullable().optional(),
  memberStatus: hallOfFameMemberStatusSchema,
  status: hallOfFameStatusSchema,
  displayOrder: z.number().int(),
  tag: z.string().trim().max(120),
  bio: z.string().trim().max(500),
  adminBio: z.string().trim().max(500).nullable().optional(),
});
export type HallOfFameAdminUpdateRequest = z.infer<
  typeof hallOfFameAdminUpdateRequestSchema
>;

export const hallOfFameMilestoneCreateRequestSchema = z
  .object({
    eventType: hallOfFameMilestoneEventTypeSchema,
    fromLevel: hallOfFameLevelSchema.nullable(),
    toLevel: hallOfFameLevelSchema,
    achievementYear: hallOfFameYearSchema,
    eventYear: hallOfFameYearSchema,
    reason: z
      .string()
      .trim()
      .min(1, "请填写入选或进阶理由")
      .max(500, "理由最多 500 字"),
    expectedRevision: hallOfFameRevisionSchema,
  })
  .refine((value) => value.achievementYear <= value.eventYear, {
    message: "进阶或入选年份不能早于取得成绩年份",
    path: ["eventYear"],
  });
export type HallOfFameMilestoneCreateRequest = z.infer<
  typeof hallOfFameMilestoneCreateRequestSchema
>;

export const meHallOfFameEntrySchema = z.object({
  id: z.string().optional(),
  status: hallOfFameStatusSchema,
  level: hallOfFameLevelSchema.nullable().optional(),
  memberStatus: hallOfFameMemberStatusSchema.nullable().optional(),
  achievementYear: hallOfFameYearSchema.nullable().optional(),
  eventYear: hallOfFameYearSchema.nullable().optional(),
  inductionReason: z.string().nullable().optional(),
  displayName: z.string().nullable().optional(),
  displayGrade: z.string().nullable().optional(),
  displayCollege: z.string().nullable().optional(),
  displayMajor: z.string().nullable().optional(),
  tag: z.string(),
  bio: z.string(),
  photoStatus: hallOfFamePhotoStatusSchema.optional(),
  portraitUrl: z.string().nullable().optional(),
  portraitThumbUrl: z.string().nullable().optional(),
  pendingPortraitPreviewUrl: z.string().nullable().optional(),
  hasPortrait: z.boolean().optional(),
  publicConsentAt: z.string().nullable().optional(),
  revision: hallOfFameRevisionSchema.optional(),
  requiresMigrationProfileFill: z.boolean().optional(),
});
export type MeHallOfFameEntry = z.infer<typeof meHallOfFameEntrySchema>;

export const meHallOfFameFirstSubmissionSchema = z.object({
  displayName: z.string().trim().min(1, "请填写展示姓名").max(100),
  displayGrade: z.string().trim().min(1, "请填写展示年级").max(64),
  displayCollege: z.string().trim().min(1, "请填写展示学院").max(120),
  displayMajor: z.string().trim().min(1, "请填写展示专业").max(120),
  tag: z.string().trim().min(1, "请填写你的竞赛标签").max(120),
  bio: z.string().trim().max(500),
  photoKey: z.string().trim().min(1, "请先上传本人照片"),
  photoThumbKey: z.string().trim().min(1).nullable().optional(),
  publicConsent: z.literal(true, {
    message: "请勾选同意公开展示你的名人堂资料与照片",
  }),
  expectedRevision: hallOfFameRevisionSchema.optional(),
});
export type MeHallOfFameFirstSubmission = z.infer<
  typeof meHallOfFameFirstSubmissionSchema
>;

export const meHallOfFameActiveUpdateSchema = z.object({
  tag: z.string().trim().min(1, "请填写你的竞赛标签").max(120),
  bio: z.string().trim().max(500),
  expectedRevision: hallOfFameRevisionSchema.optional(),
});
export type MeHallOfFameActiveUpdate = z.infer<
  typeof meHallOfFameActiveUpdateSchema
>;

export const meHallOfFamePhotoRequestSchema = z.object({
  id: z.string(),
  status: hallOfFamePhotoRequestStatusSchema,
  createdAt: z.string(),
  reviewedAt: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  expectedRevision: hallOfFameRevisionSchema.optional(),
});
export type MeHallOfFamePhotoRequest = z.infer<
  typeof meHallOfFamePhotoRequestSchema
>;

export const meHallOfFamePhotoRequestsResponseSchema = z.object({
  requests: z.array(meHallOfFamePhotoRequestSchema),
  currentRevision: hallOfFameRevisionSchema.optional(),
  permissions: z
    .object({
      canApply: z.boolean().optional(),
    })
    .optional(),
});

export const meHallOfFamePhotoRequestCreateSchema = z.object({
  photoKey: z.string().trim().min(1, "请先上传新照片"),
  photoThumbKey: z.string().trim().min(1).nullable().optional(),
  expectedRevision: hallOfFameRevisionSchema,
});
export type MeHallOfFamePhotoRequestCreate = z.infer<
  typeof meHallOfFamePhotoRequestCreateSchema
>;

export const adminHallOfFamePhotoRequestSchema = z.object({
  id: z.string(),
  entryId: z.string(),
  userId: z.string(),
  memberName: z.string(),
  level: hallOfFameLevelSchema.nullable().optional(),
  memberStatus: hallOfFameMemberStatusSchema.nullable().optional(),
  status: hallOfFamePhotoRequestStatusSchema,
  expectedRevision: hallOfFameRevisionSchema,
  currentPortraitUrl: z.string().nullable().optional(),
  currentPortraitThumbUrl: z.string().nullable().optional(),
  previewUrl: z.string().nullable().optional(),
  rejectionReason: z.string().nullable().optional(),
  reviewerName: z.string().nullable().optional(),
  reviewedAt: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type AdminHallOfFamePhotoRequest = z.infer<
  typeof adminHallOfFamePhotoRequestSchema
>;

export const adminHallOfFamePhotoRequestsResponseSchema = z.object({
  data: z.array(adminHallOfFamePhotoRequestSchema),
  total: z.number().int().min(0).optional(),
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).optional(),
  permissions: z
    .object({
      canManage: z.boolean().optional(),
      canViewPreview: z.boolean().optional(),
    })
    .optional(),
  message: z.string().optional(),
});

export const hallOfFamePhotoReviewRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    expectedRevision: hallOfFameRevisionSchema,
  }),
  z.object({
    action: z.literal("reject"),
    expectedRevision: hallOfFameRevisionSchema,
    reason: z
      .string()
      .trim()
      .min(1, "请填写驳回原因")
      .max(300, "驳回原因最多 300 字"),
  }),
]);
export type HallOfFamePhotoReviewRequest = z.infer<
  typeof hallOfFamePhotoReviewRequestSchema
>;

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

export const publicExperiencePostSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  competitionTitle: z.string(),
  title: z.string(),
  content: z.string(),
  awardLevel: z.string(),
  coverImage: z.string().nullable(),
  publishedAt: z.string(),
});
export type PublicExperiencePost = z.infer<typeof publicExperiencePostSchema>;

export const publicHallOfFameMilestoneSchema = z.object({
  id: z.string(),
  eventType: hallOfFameMilestoneEventTypeSchema,
  fromLevel: hallOfFameLevelSchema.nullable(),
  toLevel: hallOfFameLevelSchema,
  achievementYear: hallOfFameYearSchema,
  eventYear: hallOfFameYearSchema,
  reason: z.string(),
});
export type PublicHallOfFameMilestone = z.infer<
  typeof publicHallOfFameMilestoneSchema
>;

export const publicHallOfFameNameItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
});
export type PublicHallOfFameNameItem = z.infer<
  typeof publicHallOfFameNameItemSchema
>;

export const publicHallOfFameLevelNamesGroupSchema = z.object({
  level: hallOfFameLevelSchema,
  name: z.string().optional(),
  totalCount: z.number().int().min(0),
  members: z.array(publicHallOfFameNameItemSchema),
});
export type PublicHallOfFameLevelNamesGroup = z.infer<
  typeof publicHallOfFameLevelNamesGroupSchema
>;

export const publicHallOfFameNamesOverviewSchema = z.object({
  levels: z
    .array(publicHallOfFameLevelNamesGroupSchema)
    .length(3, "名人堂总览必须包含全部三个等级分组")
    .refine((groups) => new Set(groups.map((group) => group.level)).size === 3, {
      message: "名人堂总览的等级分组不得重复",
    }),
});
export type PublicHallOfFameNamesOverview = z.infer<
  typeof publicHallOfFameNamesOverviewSchema
>;

export const publicHallOfFameLevelMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  displayName: z.string(),
  memberStatus: hallOfFameMemberStatusSchema,
  tag: z.string().optional(),
  displayGrade: z.string().nullable().optional(),
  displayCollege: z.string().nullable().optional(),
  displayMajor: z.string().nullable().optional(),
  portraitUrl: z.string().nullable().optional(),
  portraitThumbUrl: z.string().nullable().optional(),
  displayOrder: z.number().optional(),
});
export type PublicHallOfFameLevelMember = z.infer<
  typeof publicHallOfFameLevelMemberSchema
>;

export const publicHallOfFameLevelDetailSchema = z.object({
  level: hallOfFameLevelSchema,
  name: z.string().optional(),
  description: z.string().optional(),
  counts: z.object({
    total: z.number().int().min(0),
    serving: z.number().int().min(0),
    honorary: z.number().int().min(0),
  }),
  members: z.array(publicHallOfFameLevelMemberSchema),
});
export type PublicHallOfFameLevelDetail = z.infer<
  typeof publicHallOfFameLevelDetailSchema
>;

export const publicHallOfFameDetailSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userImage: z.string().nullable(),
  college: z.string().nullable(),
  tag: z.string(),
  bio: z.string(),
  displayOrder: z.number(),
  level: hallOfFameLevelSchema.nullable().optional(),
  memberStatus: hallOfFameMemberStatusSchema.nullable().optional(),
  displayName: z.string().nullable().optional(),
  displayGrade: z.string().nullable().optional(),
  displayCollege: z.string().nullable().optional(),
  displayMajor: z.string().nullable().optional(),
  portraitUrl: z.string().nullable().optional(),
  portraitThumbUrl: z.string().nullable().optional(),
  milestones: z.array(publicHallOfFameMilestoneSchema).optional(),
});
export type PublicHallOfFameEntry = z.infer<typeof publicHallOfFameDetailSchema>;

export const publicProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  college: z.string().nullable(),
  grade: z.string().nullable().optional(),
  major: z.string().nullable().optional(),
  image: z.string().nullable(),
  hallOfFame: publicHallOfFameDetailSchema,
  experiencePosts: z.array(publicExperiencePostSchema),
});
export type PublicProfile = z.infer<typeof publicProfileSchema>;

export interface TitleInfo {
  key: string;
  name: string;
  priority: number;
  description: string;
}
