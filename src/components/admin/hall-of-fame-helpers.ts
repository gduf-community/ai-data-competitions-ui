import {
  hallOfFameAdminUpdateRequestSchema,
  hallOfFameInviteRequestSchema,
  hallOfFameMilestoneCreateRequestSchema,
  hallOfFamePhotoReviewRequestSchema,
  type AdminHallOfFameEntry,
  type AdminHallOfFamePhotoRequest,
  type HallOfFameAdminUpdateRequest,
  type HallOfFameInviteRequest,
  type HallOfFameMemberStatus,
  type HallOfFameMilestoneCreateRequest,
  type HallOfFamePhotoReviewRequest,
  type HallOfFameStatus,
} from "@/lib/contracts/profiles";
import {
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  HALL_OF_FAME_PHOTO_STATUS_LABELS,
  HALL_OF_FAME_STATUS_LABELS,
  getHallOfFameLevelMeta,
  type HallOfFameLevel,
} from "@/lib/hall-of-fame";
import { HttpRequestError, isAbortError } from "@/lib/http-client";

export interface AdminHallOfFameFilters {
  level: "all" | "unset" | "1" | "2" | "3";
  memberStatus: "all" | "unset" | HallOfFameMemberStatus;
  status: "all" | HallOfFameStatus;
}

export const defaultAdminHallOfFameFilters: AdminHallOfFameFilters = {
  level: "all",
  memberStatus: "all",
  status: "all",
};

export function hasActiveAdminHallOfFameFilters(
  filters: AdminHallOfFameFilters,
): boolean {
  return (
    filters.level !== "all" ||
    filters.memberStatus !== "all" ||
    filters.status !== "all"
  );
}

export function filterAdminHallOfFameEntries(
  entries: readonly AdminHallOfFameEntry[],
  filters: AdminHallOfFameFilters,
): AdminHallOfFameEntry[] {
  return entries.filter((entry) => {
    if (filters.level !== "all") {
      if (filters.level === "unset") {
        if (entry.level != null) return false;
      } else if (String(entry.level ?? "") !== filters.level) {
        return false;
      }
    }

    if (filters.memberStatus !== "all") {
      if (filters.memberStatus === "unset") {
        if (entry.memberStatus != null) return false;
      } else if (entry.memberStatus !== filters.memberStatus) {
        return false;
      }
    }

    if (filters.status !== "all" && entry.status !== filters.status) {
      return false;
    }

    return true;
  });
}

export function formatAdminHallOfFameLevelLabel(
  level: HallOfFameLevel | null | undefined,
): string {
  if (!level) return "待定级";
  return getHallOfFameLevelMeta(level).name;
}

export function formatAdminMemberStatusLabel(
  memberStatus: HallOfFameMemberStatus | null | undefined,
): string {
  if (!memberStatus) return "待确认身份";
  return HALL_OF_FAME_MEMBER_STATUS_LABELS[memberStatus];
}

export function formatAdminInviteStatusLabel(status: HallOfFameStatus): string {
  return HALL_OF_FAME_STATUS_LABELS[status];
}

export function formatAdminPhotoStatusLabel(
  photoStatus: AdminHallOfFameEntry["photoStatus"] | undefined,
): string {
  if (!photoStatus) return HALL_OF_FAME_PHOTO_STATUS_LABELS.unsubmitted;
  return HALL_OF_FAME_PHOTO_STATUS_LABELS[photoStatus];
}

export function resolveAdminEntryDisplayName(
  entry: Pick<AdminHallOfFameEntry, "displayName" | "userName">,
): string {
  return entry.displayName?.trim() || entry.userName;
}

export function buildHallOfFameInvitePayload(input: {
  userId: string | null;
  confirmed: boolean;
  level: HallOfFameLevel;
  memberStatus: HallOfFameMemberStatus;
  achievementYear: number;
  eventYear: number;
  inductionReason: string;
  tag: string;
}):
  | { ok: true; data: HallOfFameInviteRequest }
  | { ok: false; message: string } {
  if (!input.userId || !input.confirmed) {
    return {
      ok: false,
      message: "请先通过姓名搜索选择候选成员并勾选身份确认后再发送邀请。",
    };
  }

  const parsed = hallOfFameInviteRequestSchema.safeParse({
    userId: input.userId,
    level: input.level,
    memberStatus: input.memberStatus,
    achievementYear: input.achievementYear,
    eventYear: input.eventYear,
    inductionReason: input.inductionReason,
    ...(input.tag.trim() ? { tag: input.tag.trim() } : {}),
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "请检查邀请表单填写是否正确",
    };
  }

  return { ok: true, data: parsed.data };
}

export function buildHallOfFameUpdatePayload(input: {
  expectedRevision: number;
  displayName: string;
  displayGrade: string;
  displayCollege: string;
  displayMajor: string;
  memberStatus: HallOfFameMemberStatus;
  status: HallOfFameStatus;
  displayOrder: number;
  tag: string;
  bio: string;
  adminBio: string;
}):
  | { ok: true; data: HallOfFameAdminUpdateRequest }
  | { ok: false; message: string } {
  const parsed = hallOfFameAdminUpdateRequestSchema.safeParse({
    expectedRevision: input.expectedRevision,
    displayName: input.displayName,
    displayGrade: input.displayGrade.trim() || null,
    displayCollege: input.displayCollege.trim() || null,
    displayMajor: input.displayMajor.trim() || null,
    memberStatus: input.memberStatus,
    status: input.status,
    displayOrder: Number.isFinite(input.displayOrder)
      ? Math.trunc(input.displayOrder)
      : 0,
    tag: input.tag,
    bio: input.bio,
    adminBio: input.adminBio.trim() || null,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "请检查成员资料填写是否正确",
    };
  }

  return { ok: true, data: parsed.data };
}

export function buildHallOfFameMilestonePayload(input: {
  fromLevel: HallOfFameLevel | null;
  toLevel: HallOfFameLevel;
  achievementYear: number;
  eventYear: number;
  reason: string;
  expectedRevision: number;
}):
  | { ok: true; data: HallOfFameMilestoneCreateRequest }
  | { ok: false; message: string } {
  const eventType = input.fromLevel === null ? "inducted" : "promoted";
  const parsed = hallOfFameMilestoneCreateRequestSchema.safeParse({
    eventType,
    fromLevel: input.fromLevel,
    toLevel: input.toLevel,
    achievementYear: input.achievementYear,
    eventYear: input.eventYear,
    reason: input.reason,
    expectedRevision: input.expectedRevision,
  });

  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "请检查进阶信息填写是否正确",
    };
  }

  return { ok: true, data: parsed.data };
}

export function buildHallOfFamePhotoReviewPayload(input: {
  action: "approve" | "reject";
  expectedRevision: number;
  reason?: string;
}):
  | { ok: true; data: HallOfFamePhotoReviewRequest }
  | { ok: false; message: string } {
  const raw =
    input.action === "approve"
      ? { action: "approve" as const, expectedRevision: input.expectedRevision }
      : {
          action: "reject" as const,
          expectedRevision: input.expectedRevision,
          reason: input.reason ?? "",
        };

  const parsed = hallOfFamePhotoReviewRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "请检查审核填写内容",
    };
  }

  return { ok: true, data: parsed.data };
}

export function resolvePhotoRequestsPermissions(permissions?: {
  canManage?: boolean;
  canViewPreview?: boolean;
}): { canManage: boolean; canViewPreview: boolean } {
  return {
    canManage: permissions?.canManage === true,
    canViewPreview: permissions?.canViewPreview === true,
  };
}

export type PhotoReviewConflictResult =
  | {
      kind: "missing";
      nextRequest: AdminHallOfFamePhotoRequest;
      lockActions: true;
    }
  | {
      kind: "terminal";
      nextRequest: AdminHallOfFamePhotoRequest;
      lockActions: true;
    }
  | {
      kind: "revision_changed";
      nextRequest: AdminHallOfFamePhotoRequest;
      pendingLatest: AdminHallOfFamePhotoRequest;
      lockActions: true;
    };

export function reconcilePhotoReviewConflict(
  current: AdminHallOfFamePhotoRequest,
  latest: AdminHallOfFamePhotoRequest | null,
): PhotoReviewConflictResult {
  if (!latest) {
    return {
      kind: "missing",
      nextRequest: current,
      lockActions: true,
    };
  }

  if (latest.status !== "pending") {
    return {
      kind: "terminal",
      nextRequest: latest,
      lockActions: true,
    };
  }

  return {
    kind: "revision_changed",
    nextRequest: current,
    pendingLatest: latest,
    lockActions: true,
  };
}

export function canApprovePhotoPreview(options: {
  canManage: boolean;
  status: AdminHallOfFameEntry["photoStatus"] | "pending" | "approved" | "rejected" | "withdrawn";
  previewStatus: "idle" | "loading" | "loaded" | "error" | "forbidden";
  submitting: boolean;
  lockedByConflict?: boolean;
}): boolean {
  return (
    options.canManage &&
    options.status === "pending" &&
    options.previewStatus === "loaded" &&
    !options.submitting &&
    options.lockedByConflict !== true
  );
}

export interface ParsedAdminError {
  status: number | null;
  message: string;
  isConflict: boolean;
  isForbidden: boolean;
  isRateLimited: boolean;
  isUnavailable: boolean;
}

export function parseAdminRequestError(
  error: unknown,
  fallback: string,
): ParsedAdminError {
  if (isAbortError(error)) {
    return {
      status: null,
      message: "请求已取消",
      isConflict: false,
      isForbidden: false,
      isRateLimited: false,
      isUnavailable: false,
    };
  }

  if (error instanceof HttpRequestError) {
    const serverMessage = error.message;
    let message = serverMessage || fallback;
    if (error.status === 403 && !serverMessage) {
      message = "当前账号无权执行该操作或权限已变更。";
    } else if (error.status === 409 && !serverMessage) {
      message = "目标记录状态或版本已发生变化，请先刷新最新状态后再核对提交。";
    } else if (error.status === 429 && !serverMessage) {
      message = "操作或搜索过于频繁，请稍后再试。";
    } else if (error.status >= 500 && !serverMessage) {
      message = "服务暂不可用，请稍后重试。";
    }
    return {
      status: error.status,
      message,
      isConflict: error.status === 409,
      isForbidden: error.status === 403,
      isRateLimited: error.status === 429,
      isUnavailable: error.status >= 500,
    };
  }

  return {
    status: null,
    message: error instanceof Error && error.message ? error.message : fallback,
    isConflict: false,
    isForbidden: false,
    isRateLimited: false,
    isUnavailable: false,
  };
}
