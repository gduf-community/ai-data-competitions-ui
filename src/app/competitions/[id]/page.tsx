import { notFound } from "next/navigation";
import { HelpCircle } from "lucide-react";

import { getWebSession as auth } from "@/lib/web-session";
import { canAccessDashboard } from "@/lib/auth/authorization";
import { CompetitionDetailHeader } from "@/components/competitions/competition-detail-header";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { Section } from "@/components/marketing/section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { QuestionSummaryCard } from "@/components/questions/question-summary-card";
import { CompetitionExperienceSection } from "@/components/competitions/competition-experience-section";
import { CompetitionHallOfFameSection } from "@/components/competitions/competition-hall-of-fame-section";
import { getPublicCompetition } from "@/lib/web-data";

export default async function CompetitionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [competition, session] = await Promise.all([
    getPublicCompetition(id),
    auth(),
  ]);

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
    ? { name: session.user.name ?? "未命名用户", role: session.user.role }
    : null;


  return (
    <div className="min-h-screen bg-background">
      <PortalNavbar currentUser={currentUser} />
      <Section className="pb-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <CompetitionDetailHeader competition={competition} />
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle>时间安排</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {competition.timeline.map((item) => (
                    <div key={item.label} className="grid gap-2 rounded-2xl border border-dashed border-border/70 p-4 sm:grid-cols-[120px_1fr]">
                      <div className="text-sm font-semibold text-primary">{item.date}</div>
                      <div className="space-y-1">
                        <p className="font-medium">{item.label}</p>
                        <p className="text-sm leading-6 text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <QuestionSummaryCard competitionId={id} />

              <Card className="border-border/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <HelpCircle className="size-5 text-primary" />
                    常见问题
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible>
                    {competition.faqs.map((faq, index) => (
                      <AccordionItem key={faq.question} value={`faq-${index}`}>
                        <AccordionTrigger>{faq.question}</AccordionTrigger>
                        <AccordionContent className="text-sm leading-7 text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <CompetitionHallOfFameSection competitionId={id} />
              <CompetitionExperienceSection competitionId={id} />
            </div>
          </div>
        </div>
      </Section>
      <PortalFooter />
    </div>
  );
}
