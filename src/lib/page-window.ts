export type PageItem = number | "ellipsis";

interface PageWindowOptions {
  /** Pages shown on each side of the current page. Defaults to 1 (admin tables). */
  radius?: number;
  /** Admin tables keep a wider window at either end of the list. */
  edgePadding?: boolean;
}

/**
 * Pure page-window builder shared by the admin table, award review grid and
 * public certificate pagination. Callers keep their own rendering/interaction.
 */
export function buildPageWindow(
  currentPage: number,
  pageCount: number,
  { radius = 1, edgePadding = false }: PageWindowOptions = {},
): PageItem[] {
  const total = Math.max(1, Math.floor(Number.isFinite(pageCount) ? pageCount : 1));
  const current = Math.min(Math.max(1, Math.floor(currentPage)), total);
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

  const pages = new Set<number>([1, total]);
  for (let page = Math.max(1, current - radius); page <= Math.min(total, current + radius); page += 1) {
    pages.add(page);
  }
  if (edgePadding) {
    if (current <= radius + 2) {
      for (let page = 1; page <= Math.min(total, radius + 3); page += 1) pages.add(page);
    }
    if (current >= total - radius - 1) {
      for (let page = Math.max(1, total - radius - 2); page <= total; page += 1) pages.add(page);
    }
  }

  const items: PageItem[] = [];
  let previous: number | null = null;
  for (const page of [...pages].sort((left, right) => left - right)) {
    if (previous !== null && page - previous > 1) items.push("ellipsis");
    items.push(page);
    previous = page;
  }
  return items;
}
