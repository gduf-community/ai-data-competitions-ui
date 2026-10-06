import { notFound } from "next/navigation";

import { clubsData } from "@/lib/data/clubs";
import { ClubAdminsEditor } from "@/components/admin/club-admins-editor";
import { ClubContactsEditor } from "@/components/admin/club-contacts-editor";
import { PageHeader } from "@/components/shared/page-header";
import {
  getAdminClubContacts,
  listClubAdmins,
} from "@/lib/web-data";

export default async function AdminClubDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Route param is [id] but now represents the club slug
  const { id: clubSlug } = await params;

  const club = clubsData.find((c) => c.id === clubSlug);
  if (!club) {
    notFound();
  }

  const [contacts, admins] = await Promise.all([
    getAdminClubContacts(clubSlug),
    listClubAdmins(clubSlug),
  ]);

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <PageHeader
        eyebrow="社团管理"
        title={club.name}
        description={`/clubs/${club.id}`}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <ClubContactsEditor clubSlug={clubSlug} initialContacts={contacts} />
        <ClubAdminsEditor clubSlug={clubSlug} initialAdmins={admins} />
      </div>
    </div>
  );
}
