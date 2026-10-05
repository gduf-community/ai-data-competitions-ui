
export type AwardStatus = "pending" | "approved" | "rejected";

export interface AwardShowcaseRow {
  id: string;
  userId: string;
  userName: string;
  competitionId: string;
  competitionTitle: string;
  awardLevel: string | null;
  imageUrl: string;
}

export interface PublicAwardDetail {
  id: string;
  userId: string;
  userName: string;
  competitionId: string;
  competitionTitle: string;
  awardLevel: string | null;
  imageUrl: string;
  imageLargeUrl: string | null;
  createdAt: string;
}

export interface AwardGalleryRow {
  id: string;
  userId: string;
  userName: string;
  competitionId: string;
  competitionTitle: string;
  competitionYear: number;
  awardLevel: string | null;
  imageUrl: string;
  imageLargeUrl: string | null;
  createdAt: string;
}

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
}

export interface MyAwardRow {
  id: string;
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
}

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
