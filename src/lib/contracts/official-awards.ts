// 官方获奖名单（#131 / #134 / #135 / #138）契约。
// 正式事实一奖一行；成员与指导老师是快照子项，身份核实状态与来源逐项表达。
import { z } from "zod";

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
  advisorId: string;
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
  /** API 依据权威映射给出的「原文与规范等级需人工核对」标志；缺失时前端不擅自判定不一致。 */
  levelReviewRequired?: boolean;
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
  verifiedPersonCount: number;
  unverifiedMemberCount: number;
}

export interface OfficialAwardPermissions {
  canExport: boolean;
  canCorrect: boolean;
  canVoid: boolean;
}

export interface OfficialAwardListResponse {
  competitionId: string;
  items: OfficialAwardRow[];
  nextCursor: string | null;
  hasMore: boolean;
  summary: OfficialAwardSummary;
  permissions: OfficialAwardPermissions;
}

/** Public HTTP DTO validation and the single conversion to this page's display model. */
export function parseOfficialAwardList(raw: unknown): OfficialAwardListResponse {
  const source = z.enum(["official", "registration", "manual", "unknown"]);
  const nullableText = z.string().nullable();
  const payload = z.object({
    competitionId: z.uuid(), rowCount: z.number().int().nonnegative(), hasMore: z.boolean(), nextCursor: nullableText,
    permissions: z.object({ canExport: z.boolean(), canCorrect: z.boolean(), canVoid: z.boolean() }),
    summary: z.object({ awardCount: z.number().int().nonnegative(), memberCount: z.number().int().nonnegative(), verifiedPersonCount: z.number().int().nonnegative(), unverifiedMemberCount: z.number().int().nonnegative() }),
    items: z.array(z.object({ awardId: z.uuid(), competitionId: z.uuid(), originBatchId: z.uuid(), version: z.number().int().positive(),
      awardYear: z.number().int().nullable(), levelRaw: nullableText, levelCode: z.enum(["special", "first", "second", "third", "excellence", "other", "unclassified"]),
      subTrack: nullableText, teamName: nullableText, confirmedAt: z.iso.datetime(), status: z.enum(["confirmed", "voided"]),
      members: z.array(z.object({ memberId: z.uuid(), personId: z.uuid().nullable(), displayName: z.string(), grade: nullableText, college: nullableText, major: nullableText, identityState: z.enum(["verified", "unverified"]), snapshotSource: source })),
      advisors: z.array(z.object({ advisorId: z.uuid(), displayName: z.string(), college: nullableText, snapshotSource: source })),
    })),
  }).parse(raw);
  if (payload.rowCount !== payload.items.length || payload.items.some(row => row.competitionId !== payload.competitionId)) throw new Error("获奖名单响应范围不一致。");
  return { ...payload, items: payload.items.map(row => ({ ...row, memberCount: row.members.length,
    members: row.members.map(member => ({ ...member, name: member.displayName, verification: member.identityState, source: member.snapshotSource })),
    advisors: row.advisors.map(advisor => ({ ...advisor, name: advisor.displayName, source: advisor.snapshotSource })),
    source: "official", sourceRef: row.originBatchId, voided: row.status === "voided", voidReason: null,
  })) };
}

/** 页面内的成员草稿；HTTP 更正通过 buildAwardCorrection 转为严格命令。 */
export interface AwardMemberInput {
  /** 已有成员必须回传稳定 ID；新增成员不发送该字段（不发假 ID）。 */
  memberId?: string;
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
}

/** 兼容旧命名。 */
export type AwardMemberPatch = AwardMemberInput;

export interface AwardAdvisorPatch {
  advisorId?: string;
  decision: "manual";
  displayName: string;
  college?: string | null;
}

export interface AwardCorrectionPayload {
  expectedVersion: number;
  reason: string;
  fields: { levelCode?: AwardLevelCode; subTrack?: string | null; teamName?: string | null };
  members: Array<{ operation: "create"; fields: { officialName: string; grade: string | null; college: string | null; major: string | null } } | { operation: "update"; memberId: string; fields: { displayName?: string; grade?: string | null; college?: string | null; major?: string | null } } | { operation: "remove"; memberId: string }>;
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

/** 等级核对：由 API 的 levelReviewRequired 决定，前端不再用文本启发式判断。 */

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

/** 严格 MIME 校验：只接受确切类型，octet-stream / 旧 XLS / JSON / HTML 一律拒绝。 */
export function isExportContentType(contentType: string | null, format: ExportFormat): boolean {
  if (!contentType) return false;
  const value = contentType.split(";")[0].trim().toLowerCase();
  if (format === "csv") return value === "text/csv" || value === "application/csv";
  return value === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
}

/** 必须是 attachment 且带文件名，否则视为错误响应。 */
export function isAttachmentDisposition(header: string | null): boolean {
  return Boolean(header && /^\s*attachment\b/i.test(header));
}

/** 文件名扩展名必须与请求格式一致。 */
export function filenameMatchesFormat(filename: string | null, format: ExportFormat): boolean {
  return Boolean(filename && filename.toLowerCase().endsWith(`.${format}`));
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
