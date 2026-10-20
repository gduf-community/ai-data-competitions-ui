// 官方获奖名单（#131 / #134 / #135 / #138）契约。
// 正式事实一奖一行；成员与指导老师是快照子项，身份核实状态与来源逐项表达。

/** #131 规定的规范等级枚举；中文文案只用于展示，不作为 code 传输。 */
export type AwardLevelCode =
  | "special"
  | "first"
  | "second"
  | "third"
  | "excellence"
  | "other"
  | "unclassified";

export const AWARD_LEVEL_LABEL: Record<AwardLevelCode, string> = {
  special: "特等奖",
  first: "一等奖",
  second: "二等奖",
  third: "三等奖",
  excellence: "优秀奖",
  other: "其他奖项",
  unclassified: "未分类",
};

export const AWARD_LEVEL_CODES = Object.keys(AWARD_LEVEL_LABEL) as AwardLevelCode[];

/** 来源枚举与 API 对齐：registration 是「报名信息」，unknown 表示无法判定。 */
export type AwardSource = "official" | "registration" | "manual" | "unknown";

export const AWARD_SOURCE_LABEL: Record<AwardSource, string> = {
  official: "官方名单",
  registration: "报名信息",
  manual: "人工补录",
  unknown: "来源未知",
};

/** 成员身份核实状态：只有 verified 且有 personId 才计入「已核实去重人数」。 */
export type MemberVerification = "verified" | "unverified" | "anonymous";

export const VERIFICATION_LABEL: Record<MemberVerification, string> = {
  verified: "已核实",
  unverified: "未核实",
  anonymous: "匿名",
};

export interface OfficialAwardMember {
  memberId: string;
  /** 已核实身份的人员 ID；未核实或匿名时为 null，不得参与去重。 */
  personId: string | null;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
  verification: MemberVerification;
  source: AwardSource;
}

export interface OfficialAwardAdvisor {
  name: string;
  college: string | null;
  source: AwardSource;
}

export interface OfficialAwardRow {
  /** UUID，BFF 白名单按 UUID 校验动态段。 */
  awardId: string;
  version: number;
  awardYear: number | null;
  /** 官方原文，可能为 null（原文缺等级）。 */
  levelRaw: string | null;
  levelCode: AwardLevelCode;
  subTrack: string | null;
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
  /** 获奖人次，包含未核实与匿名身份。 */
  memberCount: number;
  /** 已核实去重人数：COUNT(DISTINCT person_id)，仅统计 verified 且 personId 非空。 */
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
  levels: AwardLevelCode[];
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

/** 更正时提交的成员补丁：整组成员替换，字段级来源由 API 依据审计补齐。 */
export interface AwardMemberPatch {
  memberId: string;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
}

export interface AwardAdvisorPatch {
  name: string;
  college: string | null;
}

export interface AwardCorrectionPayload {
  expectedVersion: number;
  reason: string;
  levelCode: AwardLevelCode;
  subTrack: string | null;
  teamName: string | null;
  members: AwardMemberPatch[];
  advisors: AwardAdvisorPatch[];
}

export type ExportView = "award" | "member";
export type ExportFormat = "csv" | "xlsx";

export const EXPORT_VIEW_LABEL: Record<ExportView, string> = {
  award: "按奖项（一奖一行）",
  member: "按成员（一人一行）",
};

export interface AwardFilters {
  year?: string;
  level?: string;
  subTrack?: string;
  q?: string;
}

/** 列表与导出共用同一筛选串；空值与 "all" 一律省略。 */
export function buildAwardQuery(filters: AwardFilters, paging?: { cursor?: string | null; limit?: number }): string {
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

/** 导出与列表共用同一筛选指纹，避免用旧总数打开新筛选。 */
export function awardFilterKey(filters: AwardFilters): string {
  return buildAwardQuery(filters);
}

/** 已核实去重人数：只对 verified 且 personId 非空的身份去重。 */
export function countVerifiedMembers(members: Array<Pick<OfficialAwardMember, "personId" | "verification">>): number {
  const ids = new Set<string>();
  for (const member of members) {
    if (member.verification === "verified" && member.personId) ids.add(member.personId);
  }
  return ids.size;
}

/** 等级原文与规范等级的语义一致性：原文不包含规范标签即视为需要人工核对。 */
export function levelNeedsReview(row: Pick<OfficialAwardRow, "levelRaw" | "levelCode">): boolean {
  if (!row.levelRaw) return false;
  return !row.levelRaw.includes(AWARD_LEVEL_LABEL[row.levelCode]);
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

/** 成员视图导出的行（前端核对与测试用；真实文件由服务端生成）。 */
export function flattenAwardMembers(rows: OfficialAwardRow[]): Array<{
  awardId: string;
  awardYear: number | null;
  levelRaw: string | null;
  levelCode: AwardLevelCode;
  subTrack: string | null;
  teamName: string | null;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
  verification: MemberVerification;
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
      verification: member.verification,
      source: member.source,
    })),
  );
}
