"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { compareAwardLevels, type AwardYearSummaries, type AwardYearCompetitions, type AwardCompetitionCertificates } from "@/lib/contracts/award-gallery";
import { galleryHref } from "@/lib/award-gallery";

// UI-only state for this browser tab; revisiting A must not replay completed counters.
const animatedCounts = new Set<string>();

function Count({ value, unit }: { value: number; unit: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const completedValue = useRef<number | null>(null);
  const [counter, setCounter] = useState({ target: value, display: value });
  const display = reducedMotion || counter.target !== value ? value : counter.display;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const key = `${unit}:${value}`;
    if (animatedCounts.has(key) || !window.IntersectionObserver || reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const finish = requestAnimationFrame(() => {
        completedValue.current = value;
        setCounter({ target: value, display: value });
      });
      return () => cancelAnimationFrame(finish);
    }
    if (completedValue.current === value) return;
    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || started) return;
      started = true;
      animatedCounts.add(key);
      observer.disconnect();
      setCounter({ target: value, display: 0 });
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 3000, 1);
        setCounter({ target: value, display: Math.floor(value * (1 - (1 - progress) ** 2)) });
        if (progress < 1) frame = requestAnimationFrame(tick);
        else completedValue.current = value;
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value, unit, reducedMotion]);
  return <span ref={ref} role="img" className="inline-flex items-baseline gap-1 whitespace-nowrap" aria-label={`${value}${unit}`}><strong aria-hidden="true" className="text-4xl font-semibold tabular-nums text-primary">{display.toLocaleString("zh-CN")}</strong><span aria-hidden="true" className="text-sm text-muted-foreground">{unit}</span></span>;
}

function CompetitionCard({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return <motion.article className="flex min-w-0 flex-col gap-5 rounded-xl border border-primary bg-background p-5"
    animate={reducedMotion ? { x: 0, y: 0 } : offset} transition={{ type: "spring", stiffness: 220, damping: 26 }}
    onPointerMove={(event) => {
      if (event.pointerType !== "mouse" || reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      const box = event.currentTarget.getBoundingClientRect();
      setOffset({ x: Math.max(-6, Math.min(6, (event.clientX - box.left - box.width / 2) / 30)), y: Math.max(-6, Math.min(6, (event.clientY - box.top - box.height / 2) / 30)) });
    }} onPointerLeave={() => setOffset({ x: 0, y: 0 })} onFocusCapture={() => setOffset({ x: 0, y: 0 })}>{children}</motion.article>;
}

type GalleryProps =
  | { view: "overview"; data: AwardYearSummaries }
  | { view: "year"; data: AwardYearCompetitions }
  | { view: "competition"; data: AwardCompetitionCertificates };

const actionClass = "inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

export function AwardsGallery(props: GalleryProps) {
  const overview = props.view === "overview" ? props.data : null;
  const year = props.view === "year" ? props.data : null;
  const competition = props.view === "competition" ? props.data : null;
  const selectedYear = year?.year ?? competition?.year;
  const stage = competition ? 2 : year ? 1 : 0;
  const orderedAwards = competition ? [...competition.awards].sort((left, right) => compareAwardLevels(left, right)) : [];
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [stage, selectedYear, competition?.competitionId, competition?.page.nextCursor, competition?.page.previousCursor]);
  const title = competition?.competitionTitle ?? (year ? `${year.year}年获奖比赛` : "荣誉展示");

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-14 md:px-6 md:pt-8">
      <nav aria-label="荣誉展示页面层级" className="mb-5">
        <ol className="grid grid-cols-3 gap-3 sm:flex sm:gap-6">
          {["年度总览", "年度比赛", "获奖证书"].map((label, index) => {
            const current = index === stage;
            const detail = current ? `当前所在${index === 1 ? ` · ${selectedYear}年` : ""}`
              : index < stage ? (index === 1 ? `返回${selectedYear}年比赛` : "返回年度总览") : "";
            const classes = `flex min-h-14 w-full flex-col items-start justify-center gap-0.5 rounded-md px-1.5 py-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:px-3 ${current ? "bg-primary/10 font-semibold text-primary" : index < stage ? "text-foreground hover:bg-muted" : "text-muted-foreground"}`;
            const content = <><strong className="whitespace-nowrap text-sm">{label}</strong>{detail && <small className="text-xs leading-relaxed">{detail}</small>}</>;
            return (
              <li key={label} className="relative min-w-0 after:absolute after:-right-2.5 after:top-4 after:text-slate-400 after:content-['›'] last:after:content-none sm:after:-right-4">
                {index < stage
                  ? <Link prefetch={false} href={index === 0 ? "/awards" : galleryHref({ year: selectedYear })} className={classes}>{content}</Link>
                  : <span aria-current={current ? "page" : undefined} className={classes}>{content}</span>}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="mb-8 flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold leading-relaxed break-words focus-visible:outline-2 focus-visible:outline-blue-600 sm:text-3xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {competition ? "点击证书查看大图与获奖信息。"
              : year ? `已公开${year.competitionCount}项比赛、${year.certificateCount}份获奖证书。`
              : "按年份和比赛查看已公开的获奖证书。"}
          </p>
        </div>
        {overview && overview.totals.yearCount > 0 && (
          <aside aria-label="累计成果速览" className="max-w-full rounded-xl border border-border p-5">
            <p className="mb-4 text-sm">累计成果速览</p>
            <div className="flex flex-wrap gap-8">
              {[
                { value: overview.totals.certificateCount, unit: "份", label: "获奖证书" },
                { value: overview.totals.competitionCount, unit: "项", label: "获奖比赛" },
                { value: overview.totals.yearCount, unit: "年", label: "获奖年度" },
              ].map(item => <div key={item.label}><Count value={item.value} unit={item.unit} /><p className="mt-2 text-sm text-muted-foreground">{item.label}</p></div>)}
            </div>
          </aside>
        )}
      </div>

      {overview && overview.years.length === 0 && (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">暂无已通过审核的获奖证书。</p>
      )}
      {overview && (
        <div className="space-y-5">
          {overview.years.map(item => (
            <section key={item.year} className="rounded-xl border-2 border-primary/20 p-5 sm:p-7">
              <div className="mb-6 flex flex-wrap items-center gap-4">
                <h2 className="text-2xl font-semibold text-primary">{item.year}年</h2>
                <p className="text-sm text-muted-foreground">已公开{item.competitionCount}项比赛、{item.certificateCount}份获奖证书。</p>
                <Link prefetch={false} href={galleryHref({ year: item.year })} className={`${actionClass} sm:ml-auto`}>查看年度比赛</Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {item.competitions.map(entry => (
                  <CompetitionCard key={entry.competitionId}>
                    <Link prefetch={false} href={galleryHref({ year: item.year, competition: entry.competitionId })} className="flex h-full min-h-11 flex-col gap-5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600">
                      <h3 className="text-sm font-semibold leading-7 break-words">{entry.competitionTitle}</h3>
                      <p className="mt-auto whitespace-nowrap text-primary"><strong className="text-2xl tabular-nums">{entry.certificateCount}</strong><span className="ml-1 text-sm text-muted-foreground">份证书</span></p>
                    </Link>
                  </CompetitionCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {year && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {year.competitions.map(entry => (
            <CompetitionCard key={entry.competitionId}>
              <h2 className="text-base font-semibold leading-7 break-words">{entry.competitionTitle}</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {entry.levels.map(level => <li key={level.level} className="flex justify-between gap-3"><span>{level.level}</span><span className="whitespace-nowrap">{level.certificateCount}份</span></li>)}
              </ul>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                <span className="whitespace-nowrap text-sm text-muted-foreground">{entry.certificateCount}份证书</span>
                <Link prefetch={false} className={actionClass} href={galleryHref({ year: year.year, competition: entry.competitionId })}>查看获奖证书</Link>
              </div>
            </CompetitionCard>
          ))}
        </div>
      )}

      {competition && (
        <div className="space-y-8">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">已公开<span className="whitespace-nowrap">{competition.certificateCount}份</span>获奖证书，本页<span className="whitespace-nowrap">{competition.awards.length}份</span>。</p>
            <ul aria-label="全赛事奖项等级统计" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">{competition.levels.map(level => <li key={level.level}>{level.level} <span className="whitespace-nowrap">{level.certificateCount}份</span></li>)}</ul>
          </div>
          {!competition.awards.length && <p className="text-sm text-muted-foreground">本页暂无公开证书，请返回赛事首页查看。</p>}
          {competition.levels.filter(level => competition.awards.some(award => award.level === level.level)).sort(compareAwardLevels).map(level => (
            <section key={level.level}>
              <h2 className="mb-4 text-base font-semibold">{level.level}<span className="ml-3 whitespace-nowrap text-sm font-normal text-muted-foreground">本页{competition.awards.filter(award => award.level === level.level).length}份</span></h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {competition.awards.filter(award => award.level === level.level).map(award => (
                  <Link prefetch={false} key={award.id} href={`/awards/${encodeURIComponent(award.id)}`} className="overflow-hidden rounded-xl border bg-background focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary">
                    <div className="relative aspect-[4/3]">
                      <LazyFillImage src={award.imageUrl} alt={`${award.competitionTitle} ${level.level} ${(award.memberNames.length ? award.memberNames : [award.userName]).join("、")}获奖证书`} sizes="(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 270px" className="object-contain" nearViewport={orderedAwards.indexOf(award) >= 4} fallbackText="奖状图片暂不可用" fallbackClassName="px-4 text-center" />
                    </div>
                    <div className="p-3"><p className="text-sm leading-relaxed break-words">{award.competitionTitle}</p><p className="mt-1 text-xs leading-relaxed break-words text-muted-foreground">{(award.memberNames.length ? award.memberNames : [award.userName]).join("、")}</p></div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
          <nav aria-label="获奖证书分页" className="flex flex-wrap items-center gap-4">
            {competition.page.previousCursor && <Link prefetch={false} className={actionClass} href={galleryHref({year: competition.year, competition: competition.competitionId, cursor: competition.page.previousCursor})}>上一页</Link>}
            {competition.page.nextCursor && <Link prefetch={false} className={actionClass} href={galleryHref({year: competition.year, competition: competition.competitionId, cursor: competition.page.nextCursor})}>下一页</Link>}
            <Link prefetch={false} className="inline-flex min-h-11 items-center text-sm underline focus-visible:outline-2 focus-visible:outline-primary" href={galleryHref({year: competition.year, competition: competition.competitionId})}>赛事首页</Link>
          </nav>
        </div>
      )}
    </main>
  );
}


