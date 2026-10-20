// 官方获奖名单（#138 / #131 第 6、7 节）API 契约。
// 正式事实以「一奖一行」表达：一条 award 下挂成员与指导老师，成员与老师各自带快照来源。

export type AwardSource = "official" | "application" | "manual";

export const AWARD_SOURCE_LABEL: Record<AwardSource, string> = {
  official: "官方名单",
  application: "报名信息",
  manual: "人工补录",
};

export interface OfficialAwardMember {
  memberId: string;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
  /** 该字段来自哪份快照，用于逐字段对账。 */
  source: AwardSource;
}

export interface OfficialAwardAdvisor {
  name: string;
  college: string | null;
  source: AwardSource;
}

export interface OfficialAwardRow {
  awardId: string;
  /** 乐观锁版本号，更正/撤销时必须回传。 */
  version: number;
  awardYear: number;
  /** 原始等级文本，保真展示。 */
  levelRaw: string;
  /** 规范等级，用于筛选与统计。 */
  levelCode: string;
  subTrack: string;
  teamName: string | null;
  memberCount: number;
  members: OfficialAwardMember[];
  advisors: OfficialAwardAdvisor[];
  source: AwardSource;
  sourceRef: string | null;
  confirmedAt: string;
  voided: boolean;
  voidReason: string | null;
}

export interface OfficialAwardSummary {
  /** 奖项数（一奖一行）。 */
  awardCount: number;
  /** 获奖人次（团队成员累加）。 */
  memberCount: number;
  /** 去重后的获奖人数。 */
  verifiedMemberCount: number;
  /** 导入草稿待处理数，与正式事实分开呈现。 */
  draftPending: number;
}

export interface OfficialAwardPermissions {
  canExport: boolean;
  canCorrect: boolean;
  canVoid: boolean;
}

export interface OfficialAwardCompetition {
  id: string;
  title: string;
  edition: string;
  years: number[];
  levels: string[];
  subTracks: string[];
}

export interface OfficialAwardListResponse {
  competition: OfficialAwardCompetition;
  items: OfficialAwardRow[];
  nextCursor: string | null;
  hasMore: boolean;
  summary: OfficialAwardSummary;
  permissions: OfficialAwardPermissions;
  lastUpdatedAt: string;
}

export type ExportView = "award" | "member";
export type ExportFormat = "csv" | "xlsx";

export const EXPORT_VIEW_LABEL: Record<ExportView, string> = {
  award: "按奖项（一奖一行）",
  member: "按成员（一人一行）",
};

export interface ExportFilters {
  year?: string;
  level?: string;
  subTrack?: string;
  q?: string;
}

/** 列表与导出的查询串，空值一律省略，避免把 "all" 传给 API。 */
export function buildAwardQuery(filters: ExportFilters, paging?: { cursor?: string | null; limit?: number }): string {
  const params = new URLSearchParams();
  if (filters.year && filters.year !== "all") params.set("year", filters.year);
  if (filters.level && filters.level !== "all") params.set("level", filters.level);
  if (filters.subTrack && filters.subTrack !== "all") params.set("subTrack", filters.subTrack);
  const keyword = filters.q?.trim();
  if (keyword) params.set("q", keyword);
  if (paging) {
    if (paging.cursor) params.set("cursor", paging.cursor);
    if (paging.limit) params.set("limit", String(paging.limit));
  }
  return params.toString();
}

/** 导出的筛选指纹：只有它变化才允许重新导出，避免用旧总数打开新筛选。 */
export function awardFilterKey(filters: ExportFilters): string {
  return buildAwardQuery(filters);
}

/** 解析 Content-Disposition，优先 RFC 5987 的 filename*。 */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const utf8 = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(header);
  if (utf8) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return utf8[1].trim();
    }
  }
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (quoted) return quoted[1];
  const plain = /filename\s*=\s*([^;]+)/i.exec(header);
  return plain ? plain[1].trim() : null;
}

/** 只有真正的二进制类型才算下载成功，JSON/HTML 错误页一律拒绝保存。 */
export function isExportContentType(contentType: string | null, format: ExportFormat): boolean {
  if (!contentType) return false;
  const value = contentType.toLowerCase();
  if (value.includes("application/json") || value.includes("text/html")) return false;
  if (format === "csv") return value.includes("text/csv") || value.includes("application/csv");
  return (
    value.includes("spreadsheetml") ||
    value.includes("application/vnd.ms-excel") ||
    value.includes("application/octet-stream")
  );
}

/** 导出失败的用户可读原因，区分 401/403/409/413/429/503。 */
export function exportErrorMessage(status: number, payload?: { message?: string; code?: string } | null): string {
  const fallback = payload?.message?.trim();
  switch (status) {
    case 401:
      return "登录已失效，请重新登录后再导出。";
    case 403:
      return fallback || "你没有导出该比赛获奖名单的权限。";
    case 409:
      return fallback || "名单数据已更新，请刷新后重新导出。";
    case 413:
      return fallback || "导出超出上限（奖项 500 条 / 成员 5000 条），请缩小筛选范围。";
    case 429:
      return fallback || "导出过于频繁，请稍后再试。";
    case 503:
      return fallback || "审计或名单服务暂时不可用，请稍后重试。";
    default:
      return fallback || `导出失败（HTTP ${status}）。`;
  }
}

/** 成员视图导出的行（前端只在核对与测试中使用，真实文件由服务端生成）。 */
export function flattenAwardMembers(rows: OfficialAwardRow[]): Array<{
  awardId: string;
  awardYear: number;
  levelRaw: string;
  levelCode: string;
  subTrack: string;
  teamName: string | null;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
  source: AwardSource;
}> {
  return rows.flatMap((row) =>
    row.members.map((member) => ({
      awardId: row.awardId,
      awardYear: row.awardYear,
      levelRaw: row.levelRaw,
      levelCode: row.levelCode,
      subTrack: row.subTrack,
      teamName: row.teamName,
      name: member.name,
      grade: member.grade,
      college: member.college,
      major: member.major,
      source: member.source,
    })),
  );
}

/** 一奖一行时，等级原文与规范等级不一致要提示（保真展示 + 可核对）。 */
export function levelNeedsReview(row: Pick<OfficialAwardRow, "levelRaw" | "levelCode">): boolean {
  return Boolean(row.levelRaw) && row.levelRaw !== row.levelCode;
}
