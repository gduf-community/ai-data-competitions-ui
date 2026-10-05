import { notFound } from "next/navigation";

import { getWebSession as auth } from "@/lib/web-session";
import { clubsData } from "@/lib/data/clubs";
import { ClubContentDetail } from "@/components/clubs/club-content-detail";
import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { getPublishedClubContentById } from "@/lib/web-data";

export default async function ClubContentDetailPage({
  params,
}: {
  params: Promise<{ slug: string; contentId: string }>;
}) {
  const { slug, contentId } = await params;

  const [club, session] = await Promise.all([
    Promise.resolve(clubsData.find((c) => c.id === slug) ?? null),
    auth(),
  ]);

  if (!club) {
    notFound();
  }

  const content = await getPublishedClubContentById(contentId, slug);
  if (!content || content.clubSlug !== slug) {
    notFound();
  }

  const currentUser = session?.user
    ? { name: session.user.name ?? "未命名用户", role: session.user.role }
    : null;


  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar currentUser={currentUser} />
      <main>
        <ClubContentDetail
          clubSlug={slug}
          clubName={club.name}
          content={content}
        />
      </main>
      <NewFooter />
    </div>
  );
}
