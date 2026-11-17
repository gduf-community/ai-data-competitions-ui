import Link from "next/link";
import type { AwardCompetitionCertificates, PublicGalleryCertificate } from "@/lib/contracts/award-gallery";
import { galleryHref } from "@/lib/award-gallery";
import { CertificateCard } from "../certificate-card";
import { GalleryAction, GalleryFrame } from "./frame";

const pageChip = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const inactiveChip = `${pageChip} border-border bg-background text-foreground hover:border-primary/40`;
const activeChip = `${pageChip} border-primary bg-primary font-semibold text-primary-foreground`;

/** First, last, and a window around the current page; gaps collapse to an ellipsis. */
export function awardPageItems(current: number, total: number): (number | "gap")[] {
  const pages = new Set<number>([1, total]);
  for (let page = Math.max(1, current - 2); page <= Math.min(total, current + 2); page += 1) pages.add(page);
  const ordered = [...pages].sort((left, right) => left - right);
  const items: (number | "gap")[] = [];
  ordered.forEach((page, index) => {
    if (index > 0 && page - ordered[index - 1] > 1) items.push("gap");
    items.push(page);
  });
  return items;
}

export function AwardCompetition({ data }: { data: AwardCompetitionCertificates }) {
  const selection = { year: data.year, competition: data.competitionId };
  const currentPage = data.page.pageNumber ?? null;
  const pageCount = data.page.pageCount ?? null;
  const groups: { level: string; start: number; awards: PublicGalleryCertificate[] }[] = [];
  // Keep API order. Even older API responses with interleaved levels keep their cursor order.
  for (const [index, award] of data.awards.entries()) {
    const previous = groups[groups.length - 1];
    if (previous?.level === award.level) previous.awards.push(award);
    else groups.push({ level: award.level, start: index, awards: [award] });
  }
  return (
    <GalleryFrame
      stage={2}
      year={data.year}
      title={data.competitionTitle}
      description="点击证书查看大图与获奖信息。"
      navigationKey={`${data.competitionId}:${data.page.previousCursor ?? ""}:${data.page.nextCursor ?? ""}`}
    >
      <div className="space-y-8">
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            已公开<span className="whitespace-nowrap">{data.certificateCount}份</span>获奖证书，本页<span className="whitespace-nowrap">{data.awards.length}份</span>。
          </p>
          <ul aria-label="全赛事奖项等级统计" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {data.levels.map(level => (
              <li key={level.level} className="min-w-0 break-words">
                {level.level} <span className="whitespace-nowrap">{level.certificateCount}份</span>
              </li>
            ))}
          </ul>
        </div>
        {!data.awards.length && (
          <p className="text-sm text-muted-foreground">本页暂无公开证书，请返回赛事首页查看。</p>
        )}
        {groups.map(group => (
          <section key={group.awards[0].id}>
            <h2 className="mb-4 text-base font-semibold break-words">
              {group.level}
              <span className="ml-3 whitespace-nowrap text-sm font-normal text-muted-foreground">本页{group.awards.length}份</span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {group.awards.map((award, index) => (
                <CertificateCard key={award.id} award={award} level={group.level} nearViewport={group.start + index >= 4} />
              ))}
            </div>
          </section>
        ))}
        <nav aria-label="获奖证书分页" className="flex flex-wrap items-center gap-3">
          {currentPage !== null && pageCount !== null ? (
            <>
              {currentPage > 1 ? (
                <Link prefetch={false} className={inactiveChip} href={galleryHref({ ...selection, page: currentPage - 1 })}>上一页</Link>
              ) : (
                <span aria-disabled="true" className={`${pageChip} border-border text-muted-foreground opacity-50`}>上一页</span>
              )}
              <ol aria-label="页码" className="flex flex-wrap items-center gap-1">
                {awardPageItems(currentPage, pageCount).map((item, index) =>
                  item === "gap" ? (
                    <li key={`gap-${index}`} aria-hidden="true" className="px-2 text-sm text-muted-foreground">…</li>
                  ) : (
                    <li key={item}>
                      {item === currentPage ? (
                        <span aria-current="page" className={activeChip}>{item}</span>
                      ) : (
                        <Link prefetch={false} className={inactiveChip} href={galleryHref({ ...selection, page: item })}>{item}</Link>
                      )}
                    </li>
                  ),
                )}
              </ol>
              {currentPage < pageCount ? (
                <Link prefetch={false} className={inactiveChip} href={galleryHref({ ...selection, page: currentPage + 1 })}>下一页</Link>
              ) : (
                <span aria-disabled="true" className={`${pageChip} border-border text-muted-foreground opacity-50`}>下一页</span>
              )}
              <span className="text-sm text-muted-foreground">【{currentPage}】/{pageCount}页</span>
              <form action={galleryHref(selection)} method="get" className="flex items-center gap-2">
                <label htmlFor="award-page-jump" className="text-sm text-muted-foreground">跳转</label>
                <input
                  id="award-page-jump"
                  name="page"
                  type="number"
                  min={1}
                  max={pageCount}
                  required
                  className="h-11 w-16 rounded-full border border-border bg-background px-3 text-center text-sm tabular-nums focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                />
                <button type="submit" className={inactiveChip}>跳转</button>
              </form>
            </>
          ) : (
            <>
              {data.page.previousCursor && (
                <GalleryAction href={galleryHref({ ...selection, cursor: data.page.previousCursor })}>上一页</GalleryAction>
              )}
              {data.page.nextCursor && (
                <GalleryAction href={galleryHref({ ...selection, cursor: data.page.nextCursor })}>下一页</GalleryAction>
              )}
            </>
          )}
          <Link prefetch={false} className="inline-flex min-h-11 items-center text-sm underline focus-visible:outline-2 focus-visible:outline-primary" href={galleryHref(selection)}>
            赛事首页
          </Link>
        </nav>
      </div>
    </GalleryFrame>
  );
}
