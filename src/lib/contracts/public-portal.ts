/** Version 1 of the data-only public portal contract. No server dependencies. */
import type { Competition } from "@/lib/types";

export const PUBLIC_PORTAL_CONTRACT_VERSION = 1 as const;

// Keep the existing /api/competitions wire fields. Detail-only fields are excluded.
export const PUBLIC_COMPETITION_SUMMARY_FIELDS = [
  "id", "title", "category", "competitionYear", "recognition", "status", "summary",
  "department", "registrationMode", "maxTeamSize", "maxAdvisors",
  "registrationStartAt", "registrationEndAt", "eventStartAt", "eventEndAt",
  "officialUrl", "wechatArticleUrl", "ctaType", "ctaLabelOverride",
] as const satisfies readonly (keyof Competition)[];

export type PublicCompetitionSummary = Pick<Competition,
  (typeof PUBLIC_COMPETITION_SUMMARY_FIELDS)[number]>;

export function toPublicCompetitionSummary(competition: PublicCompetitionSummary): PublicCompetitionSummary {
  return Object.fromEntries(PUBLIC_COMPETITION_SUMMARY_FIELDS.map(field =>
    [field, competition[field]])) as unknown as PublicCompetitionSummary;
}

/** Summary plus public reading fields; never a registration form or internal row. */
export type PublicCompetitionDetail = PublicCompetitionSummary & Pick<Competition,
  "location" | "coverLabel" | "description" | "highlights" | "timeline" |
  "faqs" | "attachments" | "relatedQuestions">;

export interface PublicPortalError {
  message: string;
  code: "INVALID_REQUEST" | "NOT_FOUND" | "RATE_LIMITED" | "UNAVAILABLE";
}
