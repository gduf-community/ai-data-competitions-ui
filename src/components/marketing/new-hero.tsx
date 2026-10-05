"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarRange,
  MapPin,
  Sparkles,
} from "lucide-react";

import { CompetitionStatusBadge } from "@/components/competitions/competition-status-badge";
import { Button } from "@/components/ui/button";
import Glow from "@/components/ui/glow";
import type { UserRole } from "@/lib/types";
import type { PublicCompetitionSummary as Competition } from "@/lib/contracts/public-portal";
import { formatRegistrationWindow } from "@/lib/competition-date";

interface NewHeroProps {
  featuredCompetitions: Competition[];
  currentUser: { name: string; role: UserRole } | null;
}

function canAccessAdmin(role: UserRole) {
  return (
    role === "super_admin" ||
    role === "competition_admin" ||
    role === "security_admin" ||
    role === "business_admin" ||
    role === "analytics_viewer" ||
    role === "temporary_admin" ||
    role === "supervisor"
  );
}

const heroVars = {
  "--hero-mx": "50%",
  "--hero-my": "36%",
} as CSSProperties;

export function NewHero({ featuredCompetitions, currentUser }: NewHeroProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const [primaryCompetition, ...rest] = featuredCompetitions;
  const secondaryCards = rest.slice(0, 2);
  const secondaryActionHref = currentUser ? "/me/applications" : "/notifications";
  const secondaryActionLabel = currentUser ? "查看我的报名" : "查看通知公告";

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let rafId = 0;
    const updatePointer = (xPercent: number, yPercent: number) => {
      section.style.setProperty("--hero-mx", `${xPercent}%`);
      section.style.setProperty("--hero-my", `${yPercent}%`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = section.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updatePointer(x, y));
    };

    const handlePointerLeave = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => updatePointer(50, 36));
    };

    section.addEventListener("pointermove", handlePointerMove);
    section.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      cancelAnimationFrame(rafId);
      section.removeEventListener("pointermove", handlePointerMove);
      section.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      style={heroVars}
      className="hero-gradient-surface relative overflow-hidden pt-28 pb-16 text-white sm:pt-36 sm:pb-24"
    >
      <div className="hero-dot-matrix pointer-events-none absolute inset-0 opacity-60" />
      <div className="hero-scanline pointer-events-none absolute inset-0 opacity-35" />
      <div className="hero-band-drift pointer-events-none absolute inset-0 mix-blend-screen" />
      <div className="hero-orb-float pointer-events-none absolute -left-40 top-[-28%] h-[480px] w-[480px] rounded-full bg-primary/30 blur-3xl" />
      <div className="hero-orb-float-delayed pointer-events-none absolute -right-24 bottom-[-34%] h-[520px] w-[520px] rounded-full bg-indigo-400/25 blur-3xl" />
      <div className="hero-pointer-glow pointer-events-none absolute inset-0 transition-opacity duration-300" />
      <Glow variant="below" className="opacity-60" />

      <div className="relative mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-6">
              <div className="inline-flex animate-appear items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm text-white/85 backdrop-blur">
                <span className="inline-flex size-2 rounded-full bg-emerald-400" />
                学院竞赛官方门户
              </div>

              <h1 className="animate-appear text-4xl font-bold leading-[1.08] tracking-tight text-white delay-100 sm:text-5xl lg:text-6xl">
                广东金融学院大数据与人工智能学院
                <br />
                <span className="text-blue-300">|竞赛综合服务</span>中心
              </h1>

              <p className="max-w-xl animate-appear text-base leading-relaxed text-white/75 delay-200 sm:text-lg">
                奔赴每一场热爱与竞技，从找比赛、看通知、报赛事、寻同伴开始，开启你的科创之路！
              </p>
            </div>

            <div className="flex animate-appear flex-wrap items-center gap-3 delay-300">
              <Button
                size="lg"
                asChild
                className="bg-primary text-primary-foreground shadow-[0_10px_30px_rgba(62,99,221,0.45)]"
              >
                <Link href="/competitions">
                  查看全部比赛
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="border-white/35 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              >
                <Link href={secondaryActionHref}>{secondaryActionLabel}</Link>
              </Button>
              {currentUser && canAccessAdmin(currentUser.role) && (
                <Button
                  size="lg"
                  variant="ghost"
                  asChild
                  className="text-white/85 hover:bg-white/10 hover:text-white"
                >
                  <Link href="/admin">进入管理台</Link>
                </Button>
              )}
            </div>
          </div>

          <div className="animate-appear delay-300 lg:pt-4">
            <div className="overflow-hidden rounded-3xl border border-white/15 bg-white/[0.04] p-4 shadow-[0_30px_80px_rgba(4,10,32,0.55)] backdrop-blur-xl">
              <div className="mb-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-white/25" />
                  <span className="size-2 rounded-full bg-white/20" />
                  <span className="size-2 rounded-full bg-white/15" />
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] text-white/75">
                  <Sparkles className="size-3" />
                  赛事情报窗口
                </div>
              </div>

              {primaryCompetition ? (
                <div className="space-y-4 rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-white/60">
                        {primaryCompetition.category}
                      </p>
                      <h3 className="text-xl font-semibold leading-7 text-white">
                        {primaryCompetition.title}
                      </h3>
                    </div>
                    <CompetitionStatusBadge status={primaryCompetition.status} />
                  </div>

                  <p className="text-sm leading-6 text-white/70">
                    {primaryCompetition.summary}
                  </p>

                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <CalendarRange className="size-3.5 text-blue-300" />
                      <span className="text-xs text-white/75">
                        {formatRegistrationWindow(primaryCompetition)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                      <MapPin className="size-3.5 text-blue-300" />
                      <span className="text-xs text-white/75">
                        {primaryCompetition.department}
                      </span>
                    </div>
                  </div>

                  <Button asChild className="w-full bg-primary hover:bg-primary-hover">
                    <Link href={`/competitions/${primaryCompetition.id}`}>
                      前往比赛详情
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/25 bg-black/25 px-5 py-8 text-center">
                  <p className="font-medium text-white">当前暂无重点赛事</p>
                  <p className="mt-1 text-sm text-white/70">
                    比赛发布后会自动进入首页展示区。
                  </p>
                </div>
              )}

              {secondaryCards.length > 0 && (
                <div className="mt-3 space-y-2">
                  {secondaryCards.map((competition) => (
                    <Link
                      key={competition.id}
                      href={`/competitions/${competition.id}`}
                      className="group flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 transition hover:bg-white/10"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">
                          {competition.title}
                        </p>
                        <p className="text-xs text-white/60">
                          {formatRegistrationWindow(competition)}
                        </p>
                      </div>
                      <ArrowRight className="size-3.5 text-white/60 transition group-hover:translate-x-1 group-hover:text-white" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
