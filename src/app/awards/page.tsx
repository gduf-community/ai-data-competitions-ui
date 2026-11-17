import { AwardOverview } from "@/components/marketing/award-gallery/overview";
import { listAwardYearSummaries } from "@/lib/web-data";

export default async function AwardsGalleryPage() {
  return <AwardOverview data={await listAwardYearSummaries()} />;
}
