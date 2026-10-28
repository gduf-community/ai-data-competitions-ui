import { clubsData } from "@/lib/data/clubs";
import { ClubsActivityGallery } from "@/components/marketing/clubs-activity-gallery";
import { ClubsDetailSwitcher } from "@/components/marketing/clubs-detail-switcher";
import { ClubsHero } from "@/components/marketing/clubs-hero";
import { ClubsJoinGuide } from "@/components/marketing/clubs-join-guide";
import { ClubsOverview } from "@/components/marketing/clubs-overview";
import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";

export default async function ClubsPage() {

  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar />
      <main>
        <ClubsHero totalClubs={clubsData.length} />
        <ClubsOverview clubs={clubsData} />
        <ClubsDetailSwitcher clubs={clubsData} />
        <ClubsActivityGallery clubs={clubsData} />
        <ClubsJoinGuide clubs={clubsData} />
      </main>
      <NewFooter />
    </div>
  );
}
