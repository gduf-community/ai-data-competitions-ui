export type HallOfFameLevel = 1 | 2 | 3;

export const HALL_OF_FAME_LEVEL_ORDER: readonly HallOfFameLevel[] = [1, 2, 3];

export interface HallOfFameLevelMeta {
  level: HallOfFameLevel;
  name: string;
  shortName: string;
  description: string;
  allowedPromotionTargets: readonly HallOfFameLevel[];
  /** 正式称号与进阶方向由维护者最终确认；未确认前使用中性等级占位。 */
  policyConfirmed: false;
}

/**
 * 名人堂三级展示与进阶方向集中配置。
 * 等级高低与可进阶目标仅由该配置表显式声明，严禁根据数字大小比较推断业务含义。
 */
export const HALL_OF_FAME_LEVEL_CONFIG: Record<
  HallOfFameLevel,
  HallOfFameLevelMeta
> = {
  1: {
    level: 1,
    name: "一级成员",
    shortName: "一级",
    description:
      "在学院竞赛训练与各类赛事中表现突出、经正式核验入选的名人堂成员（中性等级占位名称）。",
    allowedPromotionTargets: [2, 3],
    policyConfirmed: false,
  },
  2: {
    level: 2,
    name: "二级成员",
    shortName: "二级",
    description:
      "持续在高水平赛事中取得优异成绩并承担骨干引领作用的名人堂成员（中性等级占位名称）。",
    allowedPromotionTargets: [3],
    policyConfirmed: false,
  },
  3: {
    level: 3,
    name: "三级成员",
    shortName: "三级",
    description:
      "在学院竞赛历程中具有代表性与深远影响的高阶名人堂成员（中性等级占位名称）。",
    allowedPromotionTargets: [],
    policyConfirmed: false,
  },
};

export function getHallOfFameLevelMeta(
  level: HallOfFameLevel,
): HallOfFameLevelMeta {
  return HALL_OF_FAME_LEVEL_CONFIG[level];
}

export function getAllowedPromotionTargets(
  fromLevel: HallOfFameLevel | null,
  overrideMap?: Partial<Record<HallOfFameLevel, readonly HallOfFameLevel[]>>,
): readonly HallOfFameLevel[] {
  if (fromLevel === null) {
    return HALL_OF_FAME_LEVEL_ORDER;
  }
  return (
    overrideMap?.[fromLevel] ??
    HALL_OF_FAME_LEVEL_CONFIG[fromLevel].allowedPromotionTargets
  );
}

/** 仅允许精确段 "1" | "2" | "3"，其余（含 "0"、"4"、"01"、非数字）一律无效。 */
export function parseHallOfFameLevelSegment(
  segment: string,
): HallOfFameLevel | null {
  if (segment === "1") return 1;
  if (segment === "2") return 2;
  if (segment === "3") return 3;
  return null;
}

/**
 * 三级公开展示功能开关：仅在显式配置为 "1" 或 "true" 时开启。
 * 默认关闭，确保代码合入时不会在存量核验完成前自动切换公开页面。
 */
export function isHallOfFameHierarchyEnabled(
  env: Record<string, string | undefined> | undefined = typeof process !==
  "undefined"
    ? process.env
    : undefined,
): boolean {
  const raw = env?.HALL_OF_FAME_HIERARCHY_ENABLED?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

export const HALL_OF_FAME_STATUS_LABELS = {
  invited: "已邀请",
  candidate: "待审核",
  active: "展示中",
  hidden: "已隐藏",
} as const;

export const HALL_OF_FAME_MEMBER_STATUS_LABELS = {
  serving: "现役成员",
  honorary: "荣誉成员",
} as const;

export const HALL_OF_FAME_PHOTO_STATUS_LABELS = {
  unsubmitted: "未提交",
  pending: "待审核",
  published: "已发布",
} as const;

export const HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
  withdrawn: "已撤回",
} as const;

/** 成员照片审核状态；与换照申请状态共用 approved/rejected 语义。 */
export const HALL_OF_FAME_PHOTO_REVIEW_LABELS = {
  unsubmitted: "未上传",
  pending: "待审核",
  approved: "已通过",
  rejected: "已驳回",
} as const;

export const HALL_OF_FAME_MILESTONE_TYPE_LABELS = {
  inducted: "首次入选",
  promoted: "进阶晋级",
} as const;

export const HALL_OF_FAME_PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const HALL_OF_FAME_PHOTO_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const HALL_OF_FAME_YEAR_MIN = 1990;
export const HALL_OF_FAME_YEAR_MAX = 2100;

export interface HallPortraitUploadRef {
  photoKey: string;
  photoThumbKey: string | null;
  previewUrl: string | null;
}

function readOptionalNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 解析 POST /api/uploads (scope=hall_portrait) 返回的受控照片引用。
 * 绝不根据私有 photoKey 自行拼接公开或永久 URL。
 */
export function parseHallPortraitUploadResponse(
  payload: unknown,
): HallPortraitUploadRef {
  if (!payload || typeof payload !== "object") {
    throw new Error("上传响应格式无效");
  }

  const record = payload as Record<string, unknown>;
  const candidate = Array.isArray(record.files)
    ? (record.files[0] as Record<string, unknown> | undefined)
    : record;

  if (!candidate || typeof candidate !== "object") {
    throw new Error("上传成功但未返回照片引用");
  }

  const photoKey =
    readOptionalNonEmptyString(candidate.photoKey) ??
    readOptionalNonEmptyString(candidate.key);
  if (!photoKey) {
    throw new Error("上传成功但未返回有效照片引用");
  }

  const photoThumbKey =
    readOptionalNonEmptyString(candidate.photoThumbKey) ??
    readOptionalNonEmptyString(candidate.thumbKey);
  const previewUrl =
    readOptionalNonEmptyString(candidate.previewUrl) ??
    readOptionalNonEmptyString(candidate.publicUrl);

  return {
    photoKey,
    photoThumbKey,
    previewUrl,
  };
}

function isSafePortalAssetsUrl(parsed: URL): boolean {
  if (parsed.pathname !== "/api/portal/assets") return false;
  const key = parsed.searchParams.get("key")?.trim() ?? "";
  const version = parsed.searchParams.get("version")?.trim() ?? "";
  return key.length > 0 && version.length > 0 && !key.includes("..");
}

function isSafePublicUploadsUrl(parsed: URL): boolean {
  if (parsed.pathname !== "/api/uploads") return false;
  const rawKey = parsed.searchParams.get("key") ?? "";
  const decoded = rawKey.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!decoded || decoded.includes("..")) return false;
  return /^uploads\/public\//.test(decoded);
}

/**
 * 过滤公开人物页面与卡片的图片地址：
 * - 允许经版本签发的服务端公开素材地址 (/api/portal/assets?key=...&version=...)
 * - 允许旧公开上传地址 (/api/uploads?key=uploads/public/...)
 * - 允许标准 http(s) 外链（若外链路径落入 /api/uploads 或 /api/portal/assets 则仍受同样规则约束）
 * - 拒绝裸存储 key、私有 uploads/private/...、hall_portrait 私有对象与后台待审预览地址
 */
export function sanitizePublicPortraitSrc(
  src: string | null | undefined,
): string | null {
  if (typeof src !== "string") return null;
  const trimmed = src.trim();
  if (!trimmed) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname === "/api/portal/assets") {
        return isSafePortalAssetsUrl(parsed) ? trimmed : null;
      }
      if (parsed.pathname === "/api/uploads") {
        return isSafePublicUploadsUrl(parsed) ? trimmed : null;
      }
      if (/\/photo-requests\/[^/]+\/preview$/i.test(parsed.pathname)) {
        return null;
      }
      return trimmed;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("/api/portal/assets?")) {
    try {
      const parsed = new URL(trimmed, "https://web.invalid");
      return isSafePortalAssetsUrl(parsed) ? trimmed : null;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith("/api/uploads?")) {
    try {
      const parsed = new URL(trimmed, "https://web.invalid");
      return isSafePublicUploadsUrl(parsed) ? trimmed : null;
    } catch {
      return null;
    }
  }

  return null;
}
