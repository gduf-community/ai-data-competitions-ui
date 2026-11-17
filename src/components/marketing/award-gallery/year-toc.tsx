"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface AwardYearTocItem {
  year: number;
  competitionCount: number;
}

export function AwardYearToc({ years }: { years: AwardYearTocItem[] }) {
  const [active, setActive] = useState(years[0]?.year ?? null);
  const ordered = [...years].sort((a, b) => a.year - b.year);

  useEffect(() => {
    const sections = years
      .map(item => document.getElementById(`award-year-${item.year}`))
      .filter((element): element is HTMLElement => element !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      entries => {
        const current = entries
          .filter(entry => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (current) setActive(Number(current.target.getAttribute("data-award-year")));
      },
      { rootMargin: "-96px 0px -65% 0px" },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [years]);

  // Scroll without writing a location hash: a hash history entry makes the
  // browser restore "#award-year-…" after returning from a certificate page.
  function jumpTo(year: number) {
    setActive(year);
    const target = document.getElementById(`award-year-${year}`);
    if (!target) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  }

  if (!years.length) return null;

  return (
    <nav aria-label="获奖年份目录" className="rounded-xl border border-border/70 bg-background/70 p-2">
      <p className="px-3 py-2 text-xs font-medium tracking-wide text-muted-foreground">按年份浏览</p>
      <ul className="space-y-0.5">
        {ordered.map(({ year, competitionCount }) => {
          const isActive = year === active;
          return (
            <li key={year}>
              <button
                type="button"
                aria-current={isActive ? "location" : undefined}
                onClick={() => jumpTo(year)}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-2 rounded-md border-l-2 px-3 py-2 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  isActive
                    ? "border-primary bg-primary/10 font-semibold text-primary"
                    : "border-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground",
                )}
              >
                <span className="tabular-nums">{year}年</span>
                <span className="text-xs tabular-nums">{competitionCount}项</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
