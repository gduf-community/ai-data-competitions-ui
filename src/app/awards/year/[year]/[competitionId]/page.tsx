import { notFound } from "next/navigation";
import { AwardCompetition } from "@/components/marketing/award-gallery/competition";
import { awardCursorPattern, MAX_AWARD_LEVEL_FILTERS, MAX_AWARD_PAGE_NUMBER } from "@/lib/award-gallery";
import { parseAwardYear, parseAwardCompetitionId } from "@/lib/contracts/award-gallery";
import { listAwardsByCompetition } from "@/lib/web-data";
import { WebApiError } from "@/lib/web-api";

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

export default async function AwardCompetitionPage({ params, searchParams }: {
  params: Promise<{ year: string; competitionId: string }>;
  searchParams: Promise<{ cursor?: string | string[]; page?: string | string[]; levels?: string | string[]; excludeLevels?: string | string[] }>;
}) {
  const input = await params;
  const year = parseAwardYear(input.year);
  const competitionId = parseAwardCompetitionId(input.competitionId);
  const query = await searchParams;
  const cursor = query.cursor;
  const requestedPage = parsePageNumber(query.page);
  const levels = parseLevelFilters(query.levels);
  const excludeLevels = parseLevelFilters(query.excludeLevels);
  if (year === null || competitionId === null || Array.isArray(cursor) || requestedPage === null ||
    levels === null || excludeLevels === null || (levels && excludeLevels) ||
    (cursor !== undefined && !awardCursorPattern.test(cursor)) || (cursor !== undefined && requestedPage !== undefined)) notFound();
  // Numbered navigation is the default; legacy cursor links keep working.
  const page = cursor === undefined ? requestedPage ?? 1 : undefined;
  const data = await listAwardsByCompetition(year, competitionId, { cursor, page, levels, excludeLevels }).catch((error: unknown) => {
    if (error instanceof WebApiError && error.status === 400) notFound();
    throw error;
  });
  if (!data) notFound();
  if (page !== undefined && data.page.pageCount != null && page > data.page.pageCount) notFound();
  return <AwardCompetition data={data} selectedLevels={levels} excludedLevels={excludeLevels} />;
}
