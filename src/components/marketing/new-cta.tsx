import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import Glow from "@/components/ui/glow";

interface NewCtaProps {
  isLoggedIn?: boolean;
}

export function NewCta({ isLoggedIn = false }: NewCtaProps) {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <Glow variant="bottom" className="opacity-30 dark:opacity-50" />
      <div className="relative mx-auto max-w-[1400px] px-4 text-center md:px-6">
        <h2 className="animate-appear text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          开始你的竞赛之旅
        </h2>
        <p className="mx-auto mt-4 max-w-xl animate-appear text-base leading-relaxed text-muted-foreground delay-100">
          从报名到获奖，一站式管理你的竞赛经历。
        </p>
        <div className="mt-8 flex animate-appear flex-wrap items-center justify-center gap-3 delay-200">
          <Button size="lg" asChild>
            <Link href="/competitions">
              查看全部比赛
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={isLoggedIn ? "/me/applications" : "/sign-up"}>
              {isLoggedIn ? "查看我的报名" : "立即注册"}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
