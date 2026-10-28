import { notFound } from "next/navigation";

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

  const club = await Promise.resolve(clubsData.find((c) => c.id === slug) ?? null);

  if (!club) {
    notFound();
  }

  const content = await getPublishedClubContentById(contentId, slug);
  if (!content || content.clubSlug !== slug) {
    notFound();
  }



  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar />
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
