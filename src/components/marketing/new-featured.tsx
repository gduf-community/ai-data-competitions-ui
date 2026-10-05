import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { CompetitionCard } from "@/components/competitions/competition-card";
import { FadeInOnScroll } from "@/components/motion/fade-in-on-scroll";
import { StaggerChildren } from "@/components/motion/stagger-children";
import { Button } from "@/components/ui/button";
import { DashedLine } from "@/components/ui/dashed-line";
import type { PublicCompetitionSummary as Competition } from "@/lib/contracts/public-portal";

interface NewFeaturedProps {
  competitions: Competition[];
}

export function NewFeatured({ competitions }: NewFeaturedProps) {
  return (
    <section id="featured-competitions" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <FadeInOnScroll direction="up">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                重点赛事
              </p>
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                近期可参与的比赛
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                首页重点承接正在报名、即将开始和进行中的比赛，进入后直接找到能参加什么。
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/competitions">
                查看全部比赛
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </FadeInOnScroll>

        <DashedLine className="mb-10" />

        {competitions.length > 0 ? (
          <StaggerChildren
            className="grid items-stretch gap-5 xl:grid-cols-3"
            staggerDelay={0.12}
          >
            {competitions.map((competition) => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))}
          </StaggerChildren>
        ) : (
          <FadeInOnScroll>
            <div className="glass-2 rounded-xl p-8 text-center">
              <p className="font-medium text-foreground">当前暂无可展示赛事</p>
              <p className="mt-1 text-sm text-muted-foreground">
                比赛发布后会自动按状态进入首页重点赛事区。
              </p>
            </div>
          </FadeInOnScroll>
        )}
      </div>
    </section>
  );
}
