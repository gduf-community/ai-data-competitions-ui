export const AWARD_SCOPE_OPTIONS = [
  "亚洲级",
  "世界级",
  "国家级",
  "省级",
  "校级",
  "其他",
] as const;

export const AWARD_LEVEL_OPTIONS = [
  "一等奖",
  "二等奖",
  "三等奖",
  "其他",
] as const;

export type AwardScope = (typeof AWARD_SCOPE_OPTIONS)[number];
export type AwardLevel = (typeof AWARD_LEVEL_OPTIONS)[number];

/** 「其他」一律视为空值；其余保留原文（含「级」字）。 */
function normalizeAwardPart(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  if (text === "其他") return "";
  return text;
}

/** 将「范围 + 获奖等级」拼成展示文案：如「国家级」+「一等奖」→「国家级一等奖」；「国家级」+「其他」→「国家级证书」。 */
export function formatAwardLevel(
  scope: string | null | undefined,
  level: string | null | undefined,
): string {
  const scopeText = normalizeAwardPart(scope);
  const scopeIsOther = (scope ?? "").trim() === "其他";
  const levelIsOther = (level ?? "").trim() === "其他";

  // 范围非「其他」而获奖等级为「其他」时，预设展示为「范围 + 证书」。
  if (levelIsOther && !scopeIsOther) {
    return `${scopeText}证书`;
  }

  return `${scopeText}${normalizeAwardPart(level)}`;
}

/** 展示文案：优先使用自由文本 awardLevelText，留空时回退到组合结果。 */
export function displayAwardLevel(row: {
  awardLevelText?: string | null;
  awardScope?: string | null;
  awardLevel?: string | null;
}): string {
  const text = (row.awardLevelText ?? "").trim();
  if (text) return text;
  return formatAwardLevel(row.awardScope, row.awardLevel);
}
