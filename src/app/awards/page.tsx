import { AwardsGallery } from "@/components/marketing/awards-gallery";
import { listAwardYearSummaries } from "@/lib/web-data";

export default async function AwardsGalleryPage() {
  return <AwardsGallery view="overview" data={await listAwardYearSummaries()} />;
}
