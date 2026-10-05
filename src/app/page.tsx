import { NewCta } from "@/components/marketing/new-cta";
import { NewFeatured } from "@/components/marketing/new-featured";
import { NewFooter } from "@/components/marketing/new-footer";
import { HonorShowcase } from "@/components/marketing/honor-showcase";
import { NewHero } from "@/components/marketing/new-hero";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { getWebSession as auth } from "@/lib/web-session";
import { getHomepagePortalData } from "@/lib/web-data";

export default async function HomePage() {
  const [session, homepageData] = await Promise.all([
    auth(),
    getHomepagePortalData(),
  ]);

  const currentUser = session?.user
    ? {
        name: session.user.name ?? "未命名用户",
        role: session.user.role,
      }
    : null;


  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar currentUser={currentUser} />
      <main>
        <NewHero
          featuredCompetitions={homepageData.featuredCompetitions}
          currentUser={currentUser}
        />
        <NewFeatured competitions={homepageData.featuredCompetitions.slice(0, 3)} />
        <HonorShowcase
          awards={homepageData.awardShowcaseEntries}
          hallOfFameEntries={homepageData.hallOfFameEntries}
        />
        <NewCta isLoggedIn={Boolean(session?.user)} />
      </main>
      <NewFooter />
    </div>
  );
}
