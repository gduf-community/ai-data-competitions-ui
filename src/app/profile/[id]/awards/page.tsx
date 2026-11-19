import { notFound } from "next/navigation";

import { UserAwardGallery } from "@/components/marketing/award-gallery/user";
import { MAX_AWARD_LEVEL_FILTERS, MAX_AWARD_PAGE_NUMBER } from "@/lib/award-gallery";
import { listAwardsForUser } from "@/lib/web-data";

function parsePageNumber(value: string | string[] | undefined): number | undefined | null {
  if (value === undefined) return undefined;
  if (Array.isArray(value) || !/^[1-9]\d{0,4}$/.test(value)) return null;
  const page = Number(value);
  return page <= MAX_AWARD_PAGE_NUMBER ? page : null;
}

function parseLevelFilters(value: string | string[] | undefined): string[] | undefined | null {
  if (value === undefined) return undefined;
  const values = Array.isArray(value) ? value : [value];
  if (values.length > MAX_AWARD_LEVEL_FILTERS) return null;
  const levels = new Set<string>();
  for (const raw of values) {
    const level = raw.trim();
    if (!level || [...level].length > 120 || level.includes("\0")) return null;
    levels.add(level);
  }
  return levels.size ? [...levels] : undefined;
}

export default async function ProfileAwardsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string | string[];
    levels?: string | string[];
    excludeLevels?: string | string[];
  }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const page = parsePageNumber(query.page);
  const levels = parseLevelFilters(query.levels);
  const excludeLevels = parseLevelFilters(query.excludeLevels);
  if (page === null || levels === null || excludeLevels === null || (levels && excludeLevels)) {
    notFound();
  }
  const data = await listAwardsForUser(id, {
    page: page ?? 1,
    levels,
    excludeLevels,
  });
  if (!data) notFound();
  if (data.page.pageNumber > data.page.pageCount) notFound();
  return (
    <UserAwardGallery
      data={data}
      selectedLevels={levels}
      excludedLevels={excludeLevels}
    />
  );
}
