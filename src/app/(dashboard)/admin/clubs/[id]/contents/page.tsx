import { getWebSession } from "@/lib/web-session";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ClubContentManageList } from "@/components/clubs-admin/club-content-manage-list";
import { clubsData } from "@/lib/data/clubs";
import { getManagedClubs } from "@/lib/web-data";
import type { ClubContentRow } from "@/lib/contracts/clubs";
import { listManagedClubContents } from "@/lib/web-data";

export default async function ManageClubContentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: clubSlug } = await params;

  const club = clubsData.find((c) => c.id === clubSlug);
  if (!club) {
    notFound();
  }

  if (!(await getManagedClubs()).some(club => club.slug === clubSlug)) {
    notFound();
  }

  const session = await getWebSession();
  const contents: ClubContentRow[] = await listManagedClubContents(clubSlug);

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <PageHeader
        eyebrow="社团管理"
        title={club.name}
        description="管理社团的招新信息、近期活动、公告与往期活动回顾。"
        actions={
          <Button size="sm" asChild>
            <Link href={`/admin/clubs/${clubSlug}/contents/new`}>
              <Plus className="mr-1 size-4" />
              新建内容
            </Link>
          </Button>
        }
      />
      {session?.user.roles.some(role => role === "super_admin" || role === "temporary_admin") ? <Link href={`/admin/clubs/${clubSlug}/settings`} className="text-sm underline">联系方式设置</Link> : null}
      <ClubContentManageList clubId={clubSlug} contents={contents} />
    </div>
  );
}
