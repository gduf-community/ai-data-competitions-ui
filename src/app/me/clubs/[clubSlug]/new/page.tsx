import { notFound } from "next/navigation";

import { ClubContentEditor } from "@/components/clubs-admin/club-content-editor";
import { clubsData } from "@/lib/data/clubs";
import { getManagedClubs } from "@/lib/web-data";

export default async function NewClubContentPage({
  params,
}: {
  params: Promise<{ clubSlug: string }>;
}) {
  const { clubSlug } = await params;

  const club = clubsData.find((c) => c.id === clubSlug);
  if (!club) {
    notFound();
  }

  if (!(await getManagedClubs()).some(club => club.slug === clubSlug)) {
    notFound();
  }

  return (
    <ClubContentEditor
      clubId={clubSlug}
      mode="create"
      defaultValues={{
        contentType: "recruitment",
        title: "",
        content: "",
        coverImage: null,
        recruitmentStartAt: "",
        recruitmentEndAt: "",
        registrationUrl: "",
        eventStartAt: "",
        eventEndAt: "",
        eventLocation: "",
      }}
    />
  );
}
