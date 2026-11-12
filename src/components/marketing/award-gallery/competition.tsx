import Link from "next/link";
import type { AwardCompetitionCertificates, PublicGalleryCertificate } from "@/lib/contracts/award-gallery";
import { galleryHref } from "@/lib/award-gallery";
import { CertificateCard } from "../certificate-card";
import { GalleryAction, GalleryFrame } from "./frame";

export function AwardCompetition({ data }: { data: AwardCompetitionCertificates }) {
  const selection = { year: data.year, competition: data.competitionId };
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
        <nav aria-label="获奖证书分页" className="flex flex-wrap items-center gap-4">
          {data.page.previousCursor && (
            <GalleryAction href={galleryHref({ ...selection, cursor: data.page.previousCursor })}>上一页</GalleryAction>
          )}
          {data.page.nextCursor && (
            <GalleryAction href={galleryHref({ ...selection, cursor: data.page.nextCursor })}>下一页</GalleryAction>
          )}
          <Link prefetch={false} className="inline-flex min-h-11 items-center text-sm underline focus-visible:outline-2 focus-visible:outline-primary" href={galleryHref(selection)}>
            赛事首页
          </Link>
        </nav>
      </div>
    </GalleryFrame>
  );
}
