import { NewCta } from "@/components/marketing/new-cta";
import { NewFeatured } from "@/components/marketing/new-featured";
import { NewFooter } from "@/components/marketing/new-footer";
import { HonorShowcase } from "@/components/marketing/honor-showcase";
import { NewHero } from "@/components/marketing/new-hero";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { getHomepagePortalData } from "@/lib/web-data";

export default async function HomePage() {
  const homepageData = await getHomepagePortalData();


  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar />
      <main>
        <NewHero
          featuredCompetitions={homepageData.featuredCompetitions}
        />
        <NewFeatured competitions={homepageData.featuredCompetitions.slice(0, 3)} />
        <HonorShowcase
          awards={homepageData.awardShowcaseEntries}
          hallOfFameEntries={homepageData.hallOfFameEntries}
        />
        <NewCta />
      </main>
      <NewFooter />
    </div>
  );
}
