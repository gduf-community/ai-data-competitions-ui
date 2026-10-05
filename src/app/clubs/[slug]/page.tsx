import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";

import { getWebSession as auth } from "@/lib/web-session";
import { clubsData } from "@/lib/data/clubs";
import { normalizeLocale, type AppLocale } from "@/lib/i18n";
import { ClubContentTabs } from "@/components/clubs/club-content-tabs";
import { ClubDetailHero } from "@/components/clubs/club-detail-hero";
import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import {
  getClubContacts,
  listPublishedClubContents,
} from "@/lib/web-data";

const CONTENT_LIST_LIMIT = 30;

export default async function ClubDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [club, session] = await Promise.all([
    Promise.resolve(clubsData.find((c) => c.id === slug) ?? null),
    auth(),
  ]);

  if (!club) {
    notFound();
  }

  const [contacts, recruitment, activity, announcement, eventSummary] =
    await Promise.all([
      getClubContacts(slug),
      listPublishedClubContents(slug, "recruitment", CONTENT_LIST_LIMIT),
      listPublishedClubContents(slug, "activity", CONTENT_LIST_LIMIT),
      listPublishedClubContents(slug, "announcement", CONTENT_LIST_LIMIT),
      listPublishedClubContents(slug, "event_summary", CONTENT_LIST_LIMIT),
    ]);

  const currentUser = session?.user
    ? { name: session.user.name ?? "未命名用户", role: session.user.role }
    : null;


  const locale: AppLocale = normalizeLocale(
    (await cookies()).get("locale")?.value ??
      (await headers()).get("Accept-Language")
  );

  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar currentUser={currentUser} />
      <main>
        <ClubDetailHero club={club} contacts={contacts} />
        <section className="py-6 sm:py-10">
          <div className="mx-auto max-w-[1400px] px-4 md:px-6">
            <ClubContentTabs
              clubSlug={slug}
              recruitment={recruitment}
              activity={activity}
              announcement={announcement}
              eventSummary={eventSummary}
              locale={locale}
            />
          </div>
        </section>
      </main>
      <NewFooter />
    </div>
  );
}
