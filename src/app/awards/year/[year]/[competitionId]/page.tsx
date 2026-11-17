import { notFound } from "next/navigation";
import { AwardCompetition } from "@/components/marketing/award-gallery/competition";
import { awardCursorPattern, MAX_AWARD_PAGE_NUMBER } from "@/lib/award-gallery";
import { parseAwardYear, parseAwardCompetitionId } from "@/lib/contracts/award-gallery";
import { listAwardsByCompetition } from "@/lib/web-data";
import { WebApiError } from "@/lib/web-api";

function parsePageNumber(value: string | string[] | undefined): number | undefined | null {
  if (value === undefined) return undefined;
  if (Array.isArray(value) || !/^[1-9]\d{0,4}$/.test(value)) return null;
  const page = Number(value);
  return page <= MAX_AWARD_PAGE_NUMBER ? page : null;
}

export default async function AwardCompetitionPage({ params, searchParams }: {
  params: Promise<{ year: string; competitionId: string }>;
  searchParams: Promise<{ cursor?: string | string[]; page?: string | string[] }>;
}) {
  const input = await params;
  const year = parseAwardYear(input.year);
  const competitionId = parseAwardCompetitionId(input.competitionId);
  const query = await searchParams;
  const cursor = query.cursor;
  const requestedPage = parsePageNumber(query.page);
  if (year === null || competitionId === null || Array.isArray(cursor) || requestedPage === null ||
    (cursor !== undefined && !awardCursorPattern.test(cursor)) || (cursor !== undefined && requestedPage !== undefined)) notFound();
  // Numbered navigation is the default; legacy cursor links keep working.
  const page = cursor === undefined ? requestedPage ?? 1 : undefined;
  const data = await listAwardsByCompetition(year, competitionId, { cursor, page }).catch((error: unknown) => {
    if (error instanceof WebApiError && error.status === 400) notFound();
    throw error;
  });
  if (!data) notFound();
  if (page !== undefined && data.page.pageCount != null && page > data.page.pageCount) notFound();
  return <AwardCompetition data={data} />;
}
