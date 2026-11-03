import { notFound } from "next/navigation";
import { AwardsGallery } from "@/components/marketing/awards-gallery";
import { parseAwardYear } from "@/lib/contracts/award-gallery";
import { listAwardCompetitionsByYear } from "@/lib/web-data";

export default async function AwardYearPage({ params }: { params: Promise<{ year: string }> }) {
  const year = parseAwardYear((await params).year);
  if (year === null) notFound();
  const data = await listAwardCompetitionsByYear(year);
  if (!data) notFound();
  return <AwardsGallery view="year" data={data} />;
}
