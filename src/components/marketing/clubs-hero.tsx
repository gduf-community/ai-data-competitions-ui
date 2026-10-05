import Link from "next/link";
import { ArrowRight, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import Glow from "@/components/ui/glow";

interface ClubsHeroProps {
  totalClubs: number;
}

export function ClubsHero({ totalClubs }: ClubsHeroProps) {
  return (
    <section className="relative overflow-hidden pt-28 pb-14 sm:pt-34 sm:pb-18">
      <Glow variant="top" className="opacity-35 dark:opacity-60" />
      <div className="relative mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-card/80 px-4 py-1.5 text-sm text-muted-foreground backdrop-blur">
              <UsersRound className="size-4 text-primary" />
              学院竞赛社团生态
            </div>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              五大社团聚力
              <span className="text-primary"> 助力</span>
              竞赛成长
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              参考社团培养方向，规划参赛之路。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild>
                <a href="#clubs-overview">
                  查看社团总览
                  <ArrowRight className="size-4" />
                </a>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/competitions">查看近期比赛</Link>
              </Button>
            </div>
          </div>

          <div className="glass-3 rounded-2xl border border-border/50 p-6">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              当前编组
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-foreground">
              {totalClubs}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">核心学生社团</p>
            <div className="mt-5 space-y-2 text-sm text-muted-foreground">
              <p>覆盖量化投资、IT技术、人工智能、机器人竞技与算法竞赛五条主线。</p>
              <p>每学期以训练营与赛事项目为主节奏。</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
