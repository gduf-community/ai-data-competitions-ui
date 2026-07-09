import { NewCta } from "@/components/marketing/new-cta";
import { NewFeatured } from "@/components/marketing/new-featured";
import { NewFooter } from "@/components/marketing/new-footer";
import { HonorShowcase } from "@/components/marketing/honor-showcase";
import { NewHero } from "@/components/marketing/new-hero";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { mockHomepageData, mockUser } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar currentUser={mockUser} />
      <main>
        <NewHero
          featuredCompetitions={mockHomepageData.featuredCompetitions}
          currentUser={mockUser}
        />
        <NewFeatured
          competitions={mockHomepageData.featuredCompetitions.slice(0, 3)}
        />
        <HonorShowcase
          awards={mockHomepageData.awardShowcaseEntries}
          hallOfFameEntries={mockHomepageData.hallOfFameEntries}
        />
        <NewCta isLoggedIn={Boolean(mockUser)} />
      </main>
      <NewFooter />
    </div>
  );
}
