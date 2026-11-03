/** Public, read-only contracts shared with the Web consumer. No identity or review fields. */
export interface AwardCompetitionSummary {
  competitionId: string;
  competitionTitle: string;
  certificateCount: number;
}
export interface AwardLevelSummary { level: string; certificateCount: number }
export interface AwardYearSummary {
  year: number;
  competitionCount: number;
  certificateCount: number;
  competitions: AwardCompetitionSummary[];
}
export interface AwardYearSummaries {
  totals: { yearCount: number; competitionCount: number; certificateCount: number };
  years: AwardYearSummary[];
}
export interface AwardYearCompetitions extends Omit<AwardYearSummary, "competitions"> {
  competitions: (AwardCompetitionSummary & { levels: AwardLevelSummary[] })[];
}
export interface PublicGalleryCertificate {
  id: string;
  userName: string;
  memberNames: string[];
  competitionTitle: string;
  awardLevel: string | null;
  level: string;
  imageUrl: string;
}
export interface AwardCompetitionCertificates extends AwardCompetitionSummary {
  year: number;
  levels: AwardLevelSummary[];
  awards: PublicGalleryCertificate[];
  page: { limit: number; nextCursor: string | null; previousCursor: string | null };
}

export function parseAwardYear(value: string): number | null {
  return /^[1-9]\d{3}$/.test(value) ? Number(value) : null;
}
export function parseAwardCompetitionId(value: string): string | null {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : null;
}
export function compareAwardLevels(left: { level: string }, right: { level: string }) {
  const rank = (label: string, words: string[]) => {
    const index = words.findIndex(word => label.includes(word));
    return index < 0 ? 10 : index;
  };
  return rank(left.level, ["特等", "一等", "二等", "三等", "优秀", "参与"]) - rank(right.level, ["特等", "一等", "二等", "三等", "优秀", "参与"])
    || rank(left.level, ["国家级", "省级", "市级", "校级", "院级"]) - rank(right.level, ["国家级", "省级", "市级", "校级", "院级"])
    || left.level.localeCompare(right.level, "zh-CN");
}
