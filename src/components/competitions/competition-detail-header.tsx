import Link from "next/link";
import {
  CalendarRange,
  ExternalLink,
  MapPin,
  MessageSquare,
  Users,
} from "lucide-react";

import type { PublicCompetitionDetail as Competition } from "@/lib/contracts/public-portal";
import { formatRegistrationWindow } from "@/lib/competition-date";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RichTextContent } from "@/components/shared/rich-text-content";
import { CompetitionRecognitionBadge } from "./competition-recognition-badge";
import { CompetitionStatusBadge } from "./competition-status-badge";

interface CompetitionDetailHeaderProps {
  competition: Competition;
}

function getCtaLabel(competition: Competition): string {
  if (competition.ctaLabelOverride) return competition.ctaLabelOverride;
  switch (competition.ctaType) {
    case "official_only":
      return "官网报名";
    case "official_plus_profile":
      return "官网报名并填写资料";
    case "internal_only":
      return "收集校内报名信息";
  }
}

function getCtaHref(competition: Competition): string {
  switch (competition.ctaType) {
    case "official_only":
      return competition.officialUrl
        ? `/api/competitions/${competition.id}/official-link`
        : `/competitions/${competition.id}/apply`;
    case "official_plus_profile":
      return `/competitions/${competition.id}/apply`;
    case "internal_only":
      return `/competitions/${competition.id}/apply`;
  }
}

function isExternalCta(competition: Competition): boolean {
  return competition.ctaType === "official_only" && !!competition.officialUrl;
}

export function CompetitionDetailHeader({
  competition,
}: CompetitionDetailHeaderProps) {
  const ctaLabel = getCtaLabel(competition);
  const ctaHref = getCtaHref(competition);
  const external = isExternalCta(competition);
  const isRegistrationOpen =
    competition.status === "registration_open" ||
    competition.status === "previous_recording";

  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[linear-gradient(135deg,rgba(17,24,39,0.04),rgba(183,140,64,0.08))] p-6 sm:p-8">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <CompetitionStatusBadge status={competition.status} />
            <CompetitionRecognitionBadge recognition={competition.recognition} />
            <span className="rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground">
              {competition.competitionYear} 年
            </span>
            <span className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              {competition.category}
            </span>
          </div>
          <div className="space-y-3">
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
              {competition.title}
            </h1>
            <RichTextContent
              html={competition.description}
              className="max-w-3xl text-sm sm:text-base [&_p]:text-current"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            {!isRegistrationOpen ? (
              <Button
                disabled
                className="cursor-not-allowed bg-slate-300 text-slate-600 hover:bg-slate-300"
              >
                报名未开放
              </Button>
            ) : external ? (
              <Button asChild>
                <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                  {ctaLabel}
                  <ExternalLink className="ml-1.5 size-4" />
                </a>
              </Button>
            ) : (
              <Button asChild>
                <Link href={ctaHref}>{ctaLabel}</Link>
              </Button>
            )}
            {competition.ctaType === "official_plus_profile" &&
              competition.officialUrl && (
                <Button variant="outline" asChild>
                  <a
                    href={`/api/competitions/${competition.id}/official-link`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-1.5 size-4" />
                    查看官网
                  </a>
                </Button>
              )}
            {competition.wechatArticleUrl && (
              <Button variant="outline" asChild>
                <a
                  href={competition.wechatArticleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看微信推文
                </a>
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/competitions/${competition.id}/questions`}>
                <MessageSquare className="mr-1.5 size-4" />
                问答讨论
              </Link>
            </Button>
          </div>
        </div>
        <Card className="border-border/70 bg-background/85">
          <CardContent className="grid gap-4 p-6 text-sm">
            <div className="flex items-start gap-3">
              <CalendarRange className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">报名时间</p>
                <p className="text-muted-foreground">
                  {formatRegistrationWindow(competition)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">参赛方式</p>
                <p className="text-muted-foreground">
                  {competition.registrationMode === "team" ? "团队报名" : "个人报名"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 text-primary" />
              <div>
                <p className="font-medium text-foreground">地点与归属</p>
                <p className="text-muted-foreground">
                  {competition.department} · {competition.location}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
