import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplicationForm } from "@/components/competitions/application-form";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { Section } from "@/components/marketing/section";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getWebSession as auth } from "@/lib/web-session";
import { canAccessDashboard } from "@/lib/auth/authorization";
import { isCompetitionRegistrationAvailable } from "@/lib/competition-status";
import { getCompetitionById } from "@/lib/web-data";

export default async function CompetitionApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in?callbackUrl=" + encodeURIComponent(`/competitions/${id}/apply`));
  const competition = await getCompetitionById(id);

  if (!competition) {
    notFound();
  }
  const canViewDraft = session?.user?.role
    ? canAccessDashboard(session.user.role)
    : false;
  if (competition.status === "draft" && !canViewDraft) {
    notFound();
  }

  const currentUser = session?.user
    ? {
        name: session.user.name ?? "未命名用户",
        role: session.user.role,
      }
    : null;

  const canApply = isCompetitionRegistrationAvailable(competition.status);


  return (
    <div className="min-h-screen bg-background">
      <PortalNavbar currentUser={currentUser} />
      <Section>
        <div className="mx-auto max-w-7xl space-y-8">
          <PageHeader
            eyebrow="比赛报名"
            title={`报名：${competition.title}`}
            description="填写并提交校内报名信息。"
          />

          {!canApply ? (
            <Card className="border-border/70">
              <CardContent className="flex flex-col items-start gap-4 py-10">
                <p className="text-sm text-muted-foreground">
                  当前比赛不在报名阶段，仍可查看比赛详情与通知公告。
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    disabled
                    className="cursor-not-allowed bg-slate-300 text-slate-600 hover:bg-slate-300"
                  >
                    报名未开放
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/competitions/${competition.id}`}>返回比赛详情</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <ApplicationForm competition={competition} />
          )}
        </div>
      </Section>
      <PortalFooter />
    </div>
  );
}
