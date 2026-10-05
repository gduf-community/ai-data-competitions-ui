import type { NoticeRecord } from "@/lib/types";
import type { PublicCompetitionSummary } from "./public-portal";
import type { HallOfFameRow, AwardShowcaseRow } from "./profiles";

export type AdminNoticeRecord = NoticeRecord;

export interface PublishedNoticeRecord {
  id: string;
  competitionId: string | null;
  competitionTitle: string | null;
  title: string;
  content: string;
  priority: NoticeRecord["priority"];
  deliveryScope: NoticeRecord["deliveryScope"];
  allowPopup: boolean;
  publishedAt: string;
  expiresAt: string | null;
  updatedAt: string;
}

export interface HomepageFaqRecord {
  id: string;
  question: string;
  answer: string;
  competitionId: string;
  competitionTitle: string;
}

export interface HomepagePortalData {
  featuredCompetitions: PublicCompetitionSummary[];
  hallOfFameEntries: HallOfFameRow[];
  awardShowcaseEntries: AwardShowcaseRow[];
}
