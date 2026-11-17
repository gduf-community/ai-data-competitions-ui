import { notFound } from "next/navigation";
import { AwardYear } from "@/components/marketing/award-gallery/year";
import { parseAwardYear } from "@/lib/contracts/award-gallery";
import { listAwardCompetitionsByYear } from "@/lib/web-data";

export default async function AwardYearPage({ params }: { params: Promise<{ year: string }> }) {
  const year = parseAwardYear((await params).year);
  if (year === null) notFound();
  const data = await listAwardCompetitionsByYear(year);
  if (!data) notFound();
  return <AwardYear data={data} />;
}
