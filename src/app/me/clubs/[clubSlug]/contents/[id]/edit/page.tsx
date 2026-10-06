import { notFound } from "next/navigation";

import { ClubContentEditor } from "@/components/clubs-admin/club-content-editor";
import { clubsData } from "@/lib/data/clubs";
import { getManagedClubs } from "@/lib/web-data";
import { getManagedClubContent } from "@/lib/web-data";

/** Date -> ISO 字符串，供 ClubContentEditor 的 defaultValues 使用；空值转为空字符串。 */
function toIsoOrEmpty(value: Date | null) {
  return value ? value.toISOString() : "";
}

export default async function EditClubContentPage({
  params,
}: {
  params: Promise<{ clubSlug: string; id: string }>;
}) {
  const { clubSlug, id } = await params;

  const club = clubsData.find((c) => c.id === clubSlug);
  if (!club) {
    notFound();
  }

  if (!(await getManagedClubs()).some(club => club.slug === clubSlug)) {
    notFound();
  }

  const result = await getManagedClubContent(clubSlug, id);
  if (!result || !result.canEdit) {
    notFound();
  }

  const content = result.data;

  return (
    <ClubContentEditor
      clubId={clubSlug}
      mode="edit"
      contentId={content.id}
      initialStatus={content.status}
      defaultValues={{
        contentType: content.contentType,
        title: content.title,
        content: content.content,
        coverImage: content.coverImage,
        recruitmentStartAt: toIsoOrEmpty(content.recruitmentStartAt),
        recruitmentEndAt: toIsoOrEmpty(content.recruitmentEndAt),
        registrationUrl: content.registrationUrl ?? "",
        eventStartAt: toIsoOrEmpty(content.eventStartAt),
        eventEndAt: toIsoOrEmpty(content.eventEndAt),
        eventLocation: content.eventLocation ?? "",
      }}
    />
  );
}
