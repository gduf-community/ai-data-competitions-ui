/**
 * 社团主题渐变色允许名单。
 *
 * `ClubRecord.themeColor` 会被直接拼入组件的 `className`（见
 * `club-detail-hero.tsx` / `clubs-overview.tsx`）。虽然目前该值仅来自
 * `src/lib/data/clubs.ts` 静态配置、并非用户输入，不构成 XSS，
 * 但直接拼接仍会带来两个问题：
 *   1. 任意 Tailwind 工具类都可能被写入，从而影响布局、尺寸、层级等，
 *      不仅仅是背景渐变；
 *   2. 若未来该字段改为后台可配置，运行时新增的动态类名可能未被
 *      Tailwind 静态扫描收录，导致样式不生效。
 *
 * 因此这里维护一份固定的渐变类允许名单，前端只输出映射表中已收录、
 * 在构建期可被 Tailwind 扫描到的类名；未收录的值一律回退到默认渐变。
 */

export const CLUB_THEME_GRADIENT_CLASSES = [
  "from-cyan-500/20 to-blue-500/10",
  "from-orange-500/20 to-red-500/10",
  "from-violet-500/20 to-purple-500/10",
  "from-rose-500/20 to-red-500/10",
  "from-emerald-500/20 to-green-500/10",
] as const;

export type ClubThemeGradientClass =
  (typeof CLUB_THEME_GRADIENT_CLASSES)[number];

const DEFAULT_GRADIENT_CLASS: ClubThemeGradientClass =
  "from-cyan-500/20 to-blue-500/10";

const ALLOWED_GRADIENT_SET = new Set<string>(CLUB_THEME_GRADIENT_CLASSES);

/**
 * 校验并返回受控的渐变类名。
 * 未命中允许名单的值一律回退到默认渐变，绝不直接拼接原始字符串。
 */
export function getClubThemeGradientClass(themeColor: string | null | undefined) {
  if (themeColor && ALLOWED_GRADIENT_SET.has(themeColor)) {
    return themeColor;
  }
  return DEFAULT_GRADIENT_CLASS;
}
