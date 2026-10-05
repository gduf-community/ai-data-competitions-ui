import Link from "next/link";
import { ArrowUpRight, CalendarRange, ExternalLink, Users } from "lucide-react";

import type { PublicCompetitionSummary as Competition } from "@/lib/contracts/public-portal";
import { formatRegistrationWindow } from "@/lib/competition-date";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CompetitionRecognitionBadge } from "./competition-recognition-badge";
import { CompetitionStatusBadge } from "./competition-status-badge";

interface CompetitionCardProps {
  competition: Competition;
  compact?: boolean;
}

function getCardCtaLabel(competition: Competition): string {
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

export function CompetitionCard({
  competition,
  compact = false,
}: CompetitionCardProps) {
  const ctaLabel = getCardCtaLabel(competition);
  const isExternalCta =
    competition.ctaType === "official_only" && Boolean(competition.officialUrl);
  const isRegistrationOpen =
    competition.status === "registration_open" ||
    competition.status === "previous_recording";

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-border/60 bg-card transition-colors duration-150 hover:border-border">
      <CardHeader className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="text-xs font-semibold tracking-[0.22em] text-muted-foreground uppercase">
              {competition.category}
            </div>
            <CardTitle className={compact ? "text-xl leading-8" : "text-2xl leading-8"}>
              {competition.title}
            </CardTitle>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <CompetitionStatusBadge status={competition.status} />
            <CompetitionRecognitionBadge recognition={competition.recognition} />
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        <p className="text-sm leading-7 text-muted-foreground">{competition.summary}</p>
        <div className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <CalendarRange className="mt-0.5 size-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">报名时间</p>
              <p>{formatRegistrationWindow(competition)}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 size-4 text-primary" />
            <div>
              <p className="font-medium text-foreground">报名方式</p>
              <p>{competition.registrationMode === "team" ? "团队报名" : "个人报名"}</p>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
            {competition.competitionYear} 年
          </span>
          <span className="text-sm text-muted-foreground">{competition.department}</span>
          {competition.wechatArticleUrl && (
            <a
              href={competition.wechatArticleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              微信推文
            </a>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isRegistrationOpen ? (
            <Button
              size="sm"
              disabled
              className="cursor-not-allowed"
            >
              报名未开放
            </Button>
          ) : isExternalCta ? (
            <Button asChild size="sm" className="bg-primary text-white hover:bg-primary-hover">
              <a
                href={`/api/competitions/${competition.id}/official-link`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {ctaLabel}
                <ExternalLink className="ml-1 size-3.5" />
              </a>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-primary text-white hover:bg-primary-hover">
              <Link href={`/competitions/${competition.id}/apply`}>{ctaLabel}</Link>
            </Button>
          )}
          <Button
            asChild
            size="sm"
            variant="outline"
            className=""
          >
            <Link href={`/competitions/${competition.id}`}>
              查看详情
              <ArrowUpRight className="size-4" />
            </Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
