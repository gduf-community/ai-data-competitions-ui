import Link from "next/link";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClubRecord } from "@/lib/data/clubs";

interface ClubsDetailSwitcherProps {
  clubs: ClubRecord[];
}

export function ClubsDetailSwitcher({ clubs }: ClubsDetailSwitcherProps) {
  if (clubs.length === 0) {
    return null;
  }

  return (
    <section id="clubs-detail" className="py-4 sm:py-8">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <Tabs defaultValue={clubs[0].id} className="gap-6">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-muted/50 p-2">
            {clubs.map((club) => (
              <TabsTrigger
                key={club.id}
                value={club.id}
                className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-background"
              >
                {club.shortName}
              </TabsTrigger>
            ))}
          </TabsList>

          {clubs.map((club) => (
            <TabsContent key={club.id} value={club.id}>
              <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
                <div className="glass-3 rounded-xl border border-border/50 p-6">
                  <h3 className="text-2xl font-semibold text-foreground">{club.name}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{club.slogan}</p>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">
                    {club.description}
                  </p>

                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-semibold text-foreground">聚焦方向</h4>
                    <div className="flex flex-wrap gap-2">
                      {club.focusAreas.map((area) => (
                        <Badge key={area} variant="secondary" className="rounded-full">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6">
                    <h4 className="mb-3 text-sm font-semibold text-foreground">支持竞赛</h4>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {club.relatedCompetitions.map((competition) => (
                        <article
                          key={competition.id}
                          className="rounded-lg border border-border/60 bg-background/70 p-4"
                        >
                          <p className="text-sm font-medium text-foreground">
                            {competition.label}
                          </p>
                          <p className="mt-1 text-xs leading-6 text-muted-foreground">
                            {competition.summary}
                          </p>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="glass-3 rounded-xl border border-border/50 p-6">
                  <h4 className="text-sm font-semibold text-foreground">加入方式</h4>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {club.joinGuide}
                  </p>
                  <div className="mt-6 space-y-2 text-sm text-muted-foreground">
                    <p>指导老师：{club.advisorOrContact.advisor}</p>
                    <p>学生负责人：{club.advisorOrContact.studentLead}</p>
                    <p>联系邮箱：{club.advisorOrContact.email}</p>
                  </div>
                  <Button asChild className="mt-6 w-full">
                    <Link href={`/clubs/${club.id}`}>
                      进入社团主页（招新 / 活动 / 公告）
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="mt-2 w-full">
                    <Link href="/competitions">查看相关比赛</Link>
                  </Button>
                </aside>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
}
