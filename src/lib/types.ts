import { competitionStatusValues } from "@/lib/competition-status";
import { competitionRecognitionValues } from "@/lib/competition-recognition";

export type CompetitionStatus = (typeof competitionStatusValues)[number];
export type CompetitionRecognition =
  (typeof competitionRecognitionValues)[number];

export type RegistrationMode = "individual" | "team";

export type CompetitionCtaType =
  | "official_only"
  | "official_plus_profile"
  | "internal_only";

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "withdrawn"
  | "cancelled";

export type ApplicationAccessRole = "owner" | "team_member";

export type UserRole =
  | "super_admin"
  | "business_admin"
  | "competition_admin"
  | "analytics_viewer"
  | "security_admin"
  | "temporary_admin"
  | "content_editor"
  | "supervisor"
  | "student_user"
  | "club_admin";

export interface Competition {
  id: string;
  title: string;
  category: string;
  competitionYear: number;
  recognition: CompetitionRecognition;
  status: CompetitionStatus;
  summary: string;
  department: string;
  registrationMode: RegistrationMode;
  maxTeamSize?: number;
  maxAdvisors?: number;
  advisorsRequired?: boolean;
  registrationStartAt?: string | null;
  registrationEndAt?: string | null;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  /** 仅供旧 Mock 数据兼容；API 与仓储不再生成该展示字段。 */
  registrationWindow?: string;
  /** 仅供旧 Mock 数据兼容；API 与仓储不再生成该展示字段。 */
  eventWindow?: string;
  location: string;
  coverLabel: string;
  description: string;
  highlights: string[];
  subTracks: string[];
  timeline: Array<{
    label: string;
    date: string;
    description: string;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
  }>;
  attachments: string[];
  relatedQuestions: string[];
  officialUrl: string | null;
  wechatArticleUrl: string | null;
  ctaType: CompetitionCtaType;
  ctaLabelOverride: string | null;
}

export interface ApplicationRecord {
  id: string;
  competitionId: string;
  competitionTitle: string;
  applicantName: string;
  college: string;
  major: string;
  grade: string;
  submittedAt: string;
  mode: RegistrationMode;
  status: ApplicationStatus;
  reviewer: string;
  note: string;
  accessRole?: ApplicationAccessRole;
  readOnly?: boolean;
}

export interface PlatformUser {
  id: string;
  name: string;
  role: UserRole;
  college: string;
  email: string;
  status: "active" | "pending_verification" | "disabled";
}

export type NoticePriority = "normal" | "important" | "critical";
export type NoticeDeliveryScope = "competition" | "global";

export interface NoticeRecord {
  id: string;
  title: string;
  content: string;
  competition: string;
  competitionId: string | null;
  status: "published" | "draft" | "withdrawn";
  priority: NoticePriority;
  deliveryScope: NoticeDeliveryScope;
  allowPopup: boolean;
  publishedAt: string;
  expiresAt: string | null;
  updatedAt: string;
}

export type ClubContentType =
  | "recruitment"
  | "activity"
  | "announcement"
  | "event_summary";

export type ClubContentStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "archived"
  | "offline";

export type ClubContactType =
  | "advisor"
  | "student_lead"
  | "email"
  | "wechat"
  | "qq_group";

export interface HallOfFameEntry {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  college: string;
  tag: string;
  bio: string;
  adminBio: string | null;
  status: "active" | "hidden" | "invited" | "candidate";
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ExperiencePost {
  id: string;
  userId: string;
  userName: string;
  competitionId: string | null;
  competitionTitle: string;
  title: string;
  content: string;
  awardLevel: string;
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: string;
}

export type QuestionStatus = "open" | "closed" | "hidden";

export interface QuestionRecord {
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

export interface AnswerRecord {
  id: string;
  questionId: string;
  authorId: string;
  authorName: string;
  authorImage?: string | null;
  body: string;
  isAccepted: boolean;
  createdAt: string;
}

export interface QuestionCommentRecord {
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
