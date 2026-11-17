import Link from "next/link";
import type { AwardCompetitionCertificates, PublicGalleryCertificate } from "@/lib/contracts/award-gallery";
import { galleryHref } from "@/lib/award-gallery";
import { CertificateCard } from "../certificate-card";
import { GalleryAction, GalleryFrame } from "./frame";

const pageChip = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm tabular-nums transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const inactiveChip = `${pageChip} border-border bg-background text-foreground hover:border-primary/40`;
const activeChip = `${pageChip} border-primary bg-primary font-semibold text-primary-foreground`;
const levelChip = "inline-flex min-h-10 items-center rounded-full border px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const levelOn = `${levelChip} border-primary bg-primary/10 font-medium text-primary`;
const levelOff = `${levelChip} border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground`;

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

export function AwardCompetition({ data, selectedLevels }: { data: AwardCompetitionCertificates; selectedLevels?: string[] }) {
  const allLevels = data.levels.map(level => level.level);
  // No `levels` parameter means every level is selected.
  const selected = selectedLevels?.length ? allLevels.filter(level => selectedLevels.includes(level)) : allLevels;
  const filterActive = (selectedLevels?.length ?? 0) > 0;
  const filteredCount = data.levels.filter(level => selected.includes(level.level)).reduce((sum, level) => sum + level.certificateCount, 0);
  const selection = { year: data.year, competition: data.competitionId, levels: filterActive ? selected : undefined };
  const currentPage = data.page.pageNumber ?? null;
  const pageCount = data.page.pageCount ?? null;
  const toggleHref = (level: string) => {
    const next = selected.includes(level) ? selected.filter(item => item !== level) : allLevels.filter(item => selected.includes(item) || item === level);
    // Selecting every level again drops the parameter, restoring the default-all view.
    return galleryHref({ year: data.year, competition: data.competitionId, levels: next.length === allLevels.length ? undefined : next });
  };
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
            已公开<span className="whitespace-nowrap">{data.certificateCount}份</span>获奖证书，
            {filterActive && <>当前筛选<span className="whitespace-nowrap">{filteredCount}份</span>，</>}
            本页<span className="whitespace-nowrap">{data.awards.length}份</span>。
          </p>
          <ul aria-label="按奖项等级筛选" className="flex flex-wrap gap-2">
            {data.levels.map(({ level, certificateCount }) => {
              const isOn = selected.includes(level);
              return (
                <li key={level} className="min-w-0 break-words">
                  <Link
                    prefetch={false}
                    aria-current={isOn ? "true" : undefined}
                    title={isOn ? `取消筛选${level}` : `筛选${level}`}
                    className={isOn ? levelOn : levelOff}
                    href={toggleHref(level)}
                  >
                    {level}<span className="ml-2 text-xs tabular-nums opacity-75">{certificateCount}份</span>
                  </Link>
                </li>
              );
            })}
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
              <span className="text-sm text-muted-foreground">{currentPage}/{pageCount}页</span>
              <form action={galleryHref({ year: data.year, competition: data.competitionId })} method="get" className="flex items-center gap-2">
                {filterActive && selected.map(level => <input key={level} type="hidden" name="levels" value={level} />)}
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
