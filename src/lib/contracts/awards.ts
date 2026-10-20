// 获奖名单（#138）API 契约。字段与真实 API 保持一致，页面/总数/下载共用同一份定义。

export type AwardSource = "official" | "application" | "manual";
export type AwardConfirmStatus = "confirmed" | "pending";

export const AWARD_SOURCE_LABEL: Record<AwardSource, string> = {
  official: "官方名单",
  application: "报名信息",
  manual: "人工补录",
};

export const AWARD_STATUS_LABEL: Record<AwardConfirmStatus, string> = {
  confirmed: "已确认",
  pending: "待确认",
};

export interface AwardRosterRow {
  id: string;
  competitionId: string;
  competitionTitle: string;
  edition: string;
  awardLevel: string;
  track: string;
  teamName: string;
  studentName: string;
  grade: string | null;
  college: string;
  major: string | null;
  teachers: string[];
  source: AwardSource;
  status: AwardConfirmStatus;
  missing: string[];
}

export interface AwardRosterSummary {
  /** 已确认人数，只有这部分计入正式获奖人数。 */
  confirmed: number;
  /** 待确认记录数，不计入获奖人数。 */
  pending: number;
  /** 当前筛选命中的全部记录数。 */
  total: number;
}

export interface AwardRosterScope {
  competitionId: string | null;
  competitionTitle: string;
  edition: string;
  lastUpdated: string;
}

export interface AwardRosterResponse {
  items: AwardRosterRow[];
  total: number;
  page: number;
  pageSize: number;
  summary: AwardRosterSummary;
  scope: AwardRosterScope;
}

export interface AwardOptionsResponse {
  competitions: Array<{ id: string; title: string; edition: string }>;
  awardLevels: string[];
  tracks: string[];
}
