"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "@/lib/i18n/toast";

import { CompetitionCard } from "@/components/competitions/competition-card";
import { CompetitionFilterBar } from "@/components/competitions/competition-filter-bar";
import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { Section } from "@/components/marketing/section";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import type { CompetitionStatus } from "@/lib/types";
import type { PublicCompetitionSummary as Competition } from "@/lib/contracts/public-portal";

function resolveCompetitionSortTimestamp(competition: Competition) {
  if (!competition.registrationStartAt) return Number.MAX_SAFE_INTEGER;
  const timestamp = new Date(competition.registrationStartAt).getTime();
  return Number.isNaN(timestamp) ? Number.MAX_SAFE_INTEGER : timestamp;
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<CompetitionStatus | "all">("all");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    const run = async () => {
      setLoading(true);
      try {
        // Keep the existing year/filter UI complete while each server read is bounded.
        const records: Competition[] = [];
        let total = 0;
        do {
          const response = await fetch(`/api/competitions?limit=100&offset=${records.length}`, {
            method: "GET", cache: "no-store",
          });
          if (!response.ok) throw new Error("加载比赛列表失败");
          const payload = await response.json() as { competitions: Competition[]; total: number };
          records.push(...payload.competitions);
          total = payload.total;
          if (!active || payload.competitions.length === 0) break;
        } while (records.length < total);
        if (active) {
          setCompetitions(records);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "加载比赛列表失败";
        toast.error(message);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, []);

  const availableYears = useMemo(() => {
    return Array.from(new Set(competitions.map((competition) => competition.competitionYear)))
      .sort((a, b) => b - a);
  }, [competitions]);

  const effectiveSelectedYear = useMemo(() => {
    if (availableYears.length === 0) return null;
    if (selectedYear !== null && availableYears.includes(selectedYear)) {
      return selectedYear;
    }
    return availableYears[0];
  }, [availableYears, selectedYear]);

  const filteredCompetitions = useMemo(() => {
    return competitions
      .filter((competition) => {
        const matchesYear =
          effectiveSelectedYear === null ||
          competition.competitionYear === effectiveSelectedYear;
        const matchesKeyword =
          !keyword ||
          competition.title.includes(keyword) ||
          competition.category.includes(keyword) ||
          competition.department.includes(keyword);
        const matchesStatus = status === "all" || competition.status === status;
        return matchesYear && matchesKeyword && matchesStatus;
      })
      .sort((a, b) => {
        const delta =
          resolveCompetitionSortTimestamp(a) - resolveCompetitionSortTimestamp(b);
        if (delta !== 0) return delta;
        return a.title.localeCompare(b.title, "zh-CN");
      });
  }, [competitions, effectiveSelectedYear, keyword, status]);

  return (
    <div className="relative min-h-screen bg-background">
      <NewNavbar />
      <main className="pt-24">
        <Section className="pb-10 pt-6 sm:pt-10">
          <div className="mx-auto max-w-7xl space-y-8">
            <PageHeader
              eyebrow="Competitions"
              title="比赛列表"
              description="先按年份切换，再按报名状态、分类和归属学院快速浏览比赛入口。"
            />
            {availableYears.length > 0 ? (
              <div className="flex flex-wrap gap-3 border-t border-border/70 pt-6">
                {availableYears.map((year) => {
                  const count = competitions.filter(
                    (competition) => competition.competitionYear === year,
                  ).length;
                  const isActive = effectiveSelectedYear === year;
                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedYear(year)}
                      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                      }`}
                    >
                      {year} 年
                      <span className="ml-2 text-xs opacity-80">{count}</span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <CompetitionFilterBar
              keyword={keyword}
              status={status}
              onKeywordChange={setKeyword}
              onStatusChange={setStatus}
            />
            {loading ? (
              <div className="rounded-2xl border border-dashed border-border/70 p-8 text-sm text-muted-foreground">
                加载比赛数据中…
              </div>
            ) : filteredCompetitions.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredCompetitions.map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="没有匹配的比赛"
                description="可以尝试切换状态筛选或更换关键词，后续这里会接入更细的分页与空状态引导。"
              />
            )}
          </div>
        </Section>
      </main>
      <NewFooter />
    </div>
  );
}
