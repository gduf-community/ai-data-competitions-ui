import Link from "next/link";
import { getManagedClubs } from "@/lib/web-data";
import { getWebSession } from "@/lib/web-session";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
export default async function ClubsWorkbenchPage() {
  const clubs = await getManagedClubs();
  const session = await getWebSession();
  return <div className="space-y-6 px-4 lg:px-6">
    <PageHeader title="社团内容工作台" description="在授权范围内保存、直接发布、编辑与下线内容。" />
    {session?.user.capabilities?.canModerateClubContent ? <Link href="/admin/clubs/governance" className="text-sm underline">已发布内容治理</Link> : null}
    {clubs.length ? <div className="grid gap-4 sm:grid-cols-2">{clubs.map(club => <Link key={club.slug} href={`/admin/clubs/${club.slug}/contents`}><Card><CardContent className="p-5">{club.name}</CardContent></Card></Link>)}</div> : <EmptyState title="暂无可管理的社团" description="请由平台管理员在用户管理中配置社团授权。" />}
  </div>;
}
