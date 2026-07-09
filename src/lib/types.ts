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
  | "student_user";

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
  registrationWindow: string;
  eventWindow: string;
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
