import Link from "next/link";
import { CalendarClock, ExternalLink, MapPin } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { formatAppDate } from "@/lib/date-time";
import type { ClubContentSummaryRow } from "@/lib/contracts/clubs";

interface ClubContentListProps {
  clubSlug: string;
  items: ClubContentSummaryRow[];
  /** 空状态标题，如“暂无招新信息” */
  emptyTitle: string;
  /** 空状态说明文案 */
  emptyText: string;
}

function ContentMeta({ item }: { item: ClubContentSummaryRow }) {
  if (item.contentType === "recruitment") {
    const hasWindow = item.recruitmentStartAt || item.recruitmentEndAt;
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {hasWindow ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {formatAppDate(item.recruitmentStartAt, "即日起")}
            {" ~ "}
            {formatAppDate(item.recruitmentEndAt, "截止另行通知")}
          </span>
        ) : null}
      </div>
    );
  }

  if (item.contentType === "activity") {
    const hasWindow = item.eventStartAt || item.eventEndAt;
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        {hasWindow ? (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {formatAppDate(item.eventStartAt, "时间待定")}
            {item.eventEndAt ? ` ~ ${formatAppDate(item.eventEndAt)}` : ""}
          </span>
        ) : null}
        {item.eventLocation ? (
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            {item.eventLocation}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className="text-xs text-muted-foreground">
      发布于 {formatAppDate(item.publishedAt)}
    </div>
  );
}

export function ClubContentList({
  clubSlug,
  items,
  emptyTitle,
  emptyText,
}: ClubContentListProps) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyText} />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-background/70 transition-colors hover:border-primary/50"
        >
          <Link
            href={`/clubs/${clubSlug}/${item.id}`}
            className="relative aspect-[16/9] w-full overflow-hidden bg-muted/30"
          >
            <LazyFillImage
              src={item.coverImage}
              alt={item.title}
              className="transition-transform duration-500 group-hover:scale-105"
              fallbackText="暂无封面图"
            />
          </Link>
          <div className="flex flex-1 flex-col gap-3 p-4">
            <Link href={`/clubs/${clubSlug}/${item.id}`}>
              <h4 className="line-clamp-2 text-sm font-semibold text-foreground group-hover:text-primary">
                {item.title}
              </h4>
            </Link>
            <ContentMeta item={item} />
            <div className="mt-auto flex items-center justify-between gap-2 pt-1">
              <Button variant="ghost" size="sm" asChild className="px-0">
                <Link href={`/clubs/${clubSlug}/${item.id}`}>查看详情</Link>
              </Button>
              {item.contentType === "recruitment" && item.registrationUrl ? (
                <Button size="sm" asChild>
                  <a
                    href={item.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    立即报名
                    <ExternalLink className="size-3.5" />
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

export function ClubContentTypeBadge({
  contentType,
}: {
  contentType: ClubContentSummaryRow["contentType"];
}) {
  const labelMap: Record<ClubContentSummaryRow["contentType"], string> = {
    recruitment: "招新信息",
    activity: "近期活动",
    announcement: "社团公告",
    event_summary: "往期回顾",
  };
  return (
    <Badge variant="secondary" className="rounded-full">
      {labelMap[contentType]}
    </Badge>
  );
}
