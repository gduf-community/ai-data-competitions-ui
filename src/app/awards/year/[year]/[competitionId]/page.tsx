import { notFound } from "next/navigation";
import { AwardCompetition } from "@/components/marketing/award-gallery/competition";
import { awardCursorPattern } from "@/lib/award-gallery";
import { parseAwardYear, parseAwardCompetitionId } from "@/lib/contracts/award-gallery";
import { listAwardsByCompetition } from "@/lib/web-data";
import { WebApiError } from "@/lib/web-api";

export default async function AwardCompetitionPage({ params, searchParams }: {
  params: Promise<{ year: string; competitionId: string }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const input = await params;
  const year = parseAwardYear(input.year);
  const competitionId = parseAwardCompetitionId(input.competitionId);
  const cursor = (await searchParams).cursor;
  if (year === null || competitionId === null || Array.isArray(cursor) || (cursor !== undefined && !awardCursorPattern.test(cursor))) notFound();
  const data = await listAwardsByCompetition(year, competitionId, cursor).catch((error: unknown) => {
    if (error instanceof WebApiError && error.status === 400) notFound();
    throw error;
  });
  if (!data) notFound();
  return <AwardCompetition data={data} />;
}
