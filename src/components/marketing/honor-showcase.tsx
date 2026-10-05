import { Award } from "lucide-react";

import { FadeInOnScroll } from "@/components/motion/fade-in-on-scroll";
import { DashedLine } from "@/components/ui/dashed-line";
import type { AwardShowcaseRow } from "@/lib/contracts/profiles";
import type { PublicHallOfFameEntry } from "@/lib/contracts/profiles";

import { AwardWall } from "./award-wall";
import { HallOfFameCompact } from "./hall-of-fame-compact";

interface HonorShowcaseProps {
  awards: AwardShowcaseRow[];
  hallOfFameEntries: PublicHallOfFameEntry[];
}

export function HonorShowcase({
  awards,
  hallOfFameEntries,
}: HonorShowcaseProps) {
  const hasContent = awards.length > 0 || hallOfFameEntries.length > 0;

  return (
    <section id="honor-showcase" className="py-16 sm:py-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <FadeInOnScroll direction="up">
          <div className="mb-10 flex items-start gap-4">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Award className="size-5" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                荣誉展示
              </h2>
              <p className="text-base leading-relaxed text-muted-foreground">
                从获奖证书到优秀参赛者，集中展示学院竞赛成果与成长轨迹。
              </p>
            </div>
          </div>
        </FadeInOnScroll>

        <DashedLine className="mb-10" />

        {hasContent ? (
          <div className="space-y-12">
            {awards.length > 0 ? (
              <FadeInOnScroll direction="up" delay={0.1}>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    奖状作品墙
                  </h3>
                  <AwardWall awards={awards} />
                </div>
              </FadeInOnScroll>
            ) : null}

            <HallOfFameCompact entries={hallOfFameEntries} />
          </div>
        ) : (
          <FadeInOnScroll direction="up" delay={0.1}>
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Award className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-3 text-sm font-medium text-foreground">荣誉展示准备中</p>
              <p className="mt-1 text-xs text-muted-foreground">
                竞赛获奖数据将在审核通过后展示在这里
              </p>
            </div>
          </FadeInOnScroll>
        )}
      </div>
    </section>
  );
}
