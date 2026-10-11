import { redirect } from "next/navigation";
import { getWebSession } from "@/lib/web-session";
import { readAPI } from "@/lib/web-api";
import { ClubContentManageList } from "@/components/clubs-admin/club-content-manage-list";
import type { ClubContentRow } from "@/lib/contracts/clubs";
export default async function ClubGovernancePage() {
  const session = await getWebSession();
  if (!session?.user.capabilities.canModerateClubContent) redirect("/errors/forbidden");
  const { data } = await readAPI<{ data: ClubContentRow[] }>("/api/admin/clubs/contents?status=published");
  const slugs = [...new Set(data.map(row => row.clubSlug))];
  return <div className="space-y-6 px-4 lg:px-6"><h1 className="text-xl font-semibold">已发布社团内容治理</h1><p className="text-sm text-muted-foreground">治理权限可强制下线；内容编辑需要对应社团授权。</p>{slugs.length ? slugs.map(slug => <ClubContentManageList key={slug} clubId={slug} contents={data.filter(row => row.clubSlug === slug)} governance />) : <p>暂无已发布内容。</p>}</div>;
}
