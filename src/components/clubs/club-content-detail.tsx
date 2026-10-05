import Link from "next/link";
import { ArrowLeft, CalendarClock, ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClubContentTypeBadge } from "@/components/clubs/club-content-list";
import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { RichTextContent } from "@/components/shared/rich-text-content";
import { formatAppDate } from "@/lib/date-time";
import type { PublicClubContent } from "@/lib/contracts/clubs";

interface ClubContentDetailProps {
  clubSlug: string;
  clubName: string;
  content: PublicClubContent;
}

export function ClubContentDetail({
  clubSlug,
  clubName,
  content,
}: ClubContentDetailProps) {
  return (
    <section className="relative pt-28 pb-16 sm:pt-34">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <Link
          href={`/clubs/${clubSlug}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回 {clubName}
        </Link>

        <div className="glass-3 overflow-hidden rounded-2xl border border-border/50">
          {content.coverImage ? (
            <div className="relative aspect-[21/9] w-full">
              <LazyFillImage
                src={content.coverImage}
                alt={content.title}
                fallbackText="暂无封面图"
              />
            </div>
          ) : null}

          <div className="p-6 sm:p-8">
            <ClubContentTypeBadge contentType={content.contentType} />
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {content.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {content.contentType === "recruitment" &&
              (content.recruitmentStartAt || content.recruitmentEndAt) ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-4" />
                  报名时间：{formatAppDate(content.recruitmentStartAt, "即日起")}
                  {" ~ "}
                  {formatAppDate(content.recruitmentEndAt, "截止另行通知")}
                </span>
              ) : null}

              {content.contentType === "activity" &&
              (content.eventStartAt || content.eventEndAt) ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarClock className="size-4" />
                  活动时间：{formatAppDate(content.eventStartAt, "时间待定")}
                  {content.eventEndAt
                    ? ` ~ ${formatAppDate(content.eventEndAt)}`
                    : ""}
                </span>
              ) : null}

              {content.contentType === "activity" && content.eventLocation ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="size-4" />
                  {content.eventLocation}
                </span>
              ) : null}

              <span>发布于 {formatAppDate(content.publishedAt)}</span>
            </div>

            {content.contentType === "recruitment" &&
            content.registrationUrl ? (
              <Button asChild className="mt-6">
                <a
                  href={content.registrationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  立即报名
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            ) : null}

            <RichTextContent
              html={content.content}
              className="mt-8 text-sm leading-7 text-muted-foreground"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
