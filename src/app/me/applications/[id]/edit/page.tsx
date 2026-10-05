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
import { getCompetitionById } from "@/lib/web-data";
import { getApplicationForEdit } from "@/lib/web-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ApplicationEditPage({ params }: PageProps) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/sign-in?callbackUrl=/me/applications");
  }

  const application = await getApplicationForEdit(id);
  if (!application) {
    notFound();
  }

  const competition = await getCompetitionById(application.competitionId);
  if (!competition) {
    notFound();
  }

  const EDITABLE_STATUSES = new Set(["rejected", "withdrawn"]);
  if (!EDITABLE_STATUSES.has(application.status)) {
    redirect(`/me/applications/${id}`);
  }

  const currentUser = {
    name: session.user.name ?? "未命名用户",
    role: session.user.role,
  };

  return (
    <div className="min-h-screen bg-background">
      <PortalNavbar currentUser={currentUser} />
      <Section>
        <div className="mx-auto max-w-7xl space-y-8">
          <PageHeader
            eyebrow="修改报名"
            title={`修改报名：${application.competitionTitle}`}
            description="修改报名信息后需重新审核。"
            actions={
              <Button variant="outline" asChild>
                <Link href={`/me/applications/${id}`}>返回报名详情</Link>
              </Button>
            }
          />

          <Card className="border-border/70">
            <CardContent className="py-6">
              <div className="grid gap-3 text-sm">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  如果只是补充说明或修改成员信息，会更新当前报名；如果改成其他子赛项，系统会新建一条报名，并保留原报名记录。
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground">报名编号：</span>
                    <span className="font-medium">{application.id}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">当前状态：</span>
                    <span className="font-medium">
                      {application.status === "approved"
                        ? "审核通过"
                        : application.status === "submitted"
                          ? "待审核"
                          : "审核驳回"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ApplicationForm
            competition={competition}
            registrationId={id}
            initialData={{
              applicantName: application.applicantName,
              studentId: application.studentNo ?? "",
              college: application.college,
              major: application.major,
              grade: application.grade,
              phone: application.phone ?? "",
              email: application.email ?? "",
              selectedSubTrack: application.selectedSubTrack ?? "",
              teamName: application.teamName ?? "",
              statement: application.statement ?? "",
              teamMembers: application.teamMembers.map((m) => ({
                name: m.name,
                studentId: m.studentId ?? "",
                college: m.college ?? "",
                major: m.major ?? "",
                grade: m.grade ?? "",
                phone: m.phone ?? "",
                email: m.email ?? "",
              })),
              advisors: application.advisors
                ? application.advisors.map((a) => ({
                    name: a.name,
                    college: a.college,
                    major: a.major,
                    phone: a.phone ?? "",
                    email: a.email ?? "",
                  }))
                : [],
            }}
          />
        </div>
      </Section>
      <PortalFooter />
    </div>
  );
}
