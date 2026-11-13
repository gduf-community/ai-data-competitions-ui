import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { galleryHref } from "@/lib/award-gallery";
import { cn } from "@/lib/utils";
import { AwardCardMotion, AwardGalleryHeading } from "./motion";

interface GalleryFrameProps {
  stage: 0 | 1 | 2;
  year?: number;
  title: string;
  description: string;
  navigationKey?: string;
  summary?: ReactNode;
  children: ReactNode;
}

export function GalleryFrame({ stage, year, title, description, navigationKey = title, summary, children }: GalleryFrameProps) {
  const stages = ["年度总览", "年度比赛", "获奖证书"];
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-14 md:px-6 md:pt-8">
      <nav aria-label="荣誉展示页面层级" className="mb-5">
        <ol className="grid grid-cols-3 gap-3 sm:flex sm:gap-6">
          {stages.map((label, index) => {
            const current = index === stage;
            const previous = index < stage;
            const detail = current
              ? (index === 1 ? `当前所在 · ${year}年` : "当前所在")
              : previous && (index === 1 ? `返回${year}年比赛` : "返回年度总览");
            const className = cn(
              "flex min-h-14 w-full flex-col items-start justify-center gap-0.5 rounded-md px-1.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3",
              current && "bg-primary/10 font-semibold text-primary",
              previous ? "text-foreground hover:bg-muted" : !current && "text-muted-foreground",
            );
            const content = (
              <>
                <strong className="whitespace-nowrap text-sm">{label}</strong>
                {detail && <small className="text-xs leading-relaxed">{detail}</small>}
              </>
            );
            return (
              <li key={label} className="relative min-w-0 after:absolute after:-right-2.5 after:top-4 after:text-muted-foreground after:content-['›'] last:after:content-none sm:after:-right-4">
                {previous ? (
                  <Link prefetch={false} href={index === 0 ? "/awards" : galleryHref({ year })} className={className}>
                    {content}
                  </Link>
                ) : (
                  <span aria-current={current ? "page" : undefined} className={className}>{content}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <AwardGalleryHeading title={title} navigationKey={navigationKey} />
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        </div>
        {summary}
      </div>
      {children}
    </main>
  );
}

export function GalleryAction({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Button asChild className={cn("min-h-11 rounded-full", className)}>
      <Link href={href} prefetch={false}>{children}</Link>
    </Button>
  );
}

export function GalleryCompetitionCard({ children }: { children: ReactNode }) {
  return (
    <AwardCardMotion>
      <Card className="h-full gap-5 rounded-xl border-primary bg-background p-5">{children}</Card>
    </AwardCardMotion>
  );
}
