import Link from "next/link";
import { ArrowRight, Users2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { clubsData } from "@/lib/data/clubs";
import { getManagedClubs } from "@/lib/web-data";

export default async function MyClubsPage() {
  const managedSlugs = (await getManagedClubs()).map(club => club.slug);

  const managedClubs = clubsData.filter((club) =>
    managedSlugs.includes(club.id),
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="个人中心"
        title="社团管理"
        description="管理你所负责社团的招新信息、近期活动、公告与往期活动回顾。"
      />

      {managedClubs.length === 0 ? (
        <EmptyState
          title="暂无可管理的社团"
          description="如果你是社团负责人，请联系平台管理员将你绑定为对应社团的管理员。"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {managedClubs.map((club) => (
            <Card key={club.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users2 className="size-4 text-muted-foreground" />
                  {club.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4 text-sm text-muted-foreground">
                  {club.slogan}
                </p>
                <Button size="sm" asChild>
                  <Link href={`/me/clubs/${club.id}`}>
                    管理内容
                    <ArrowRight className="ml-1 size-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
