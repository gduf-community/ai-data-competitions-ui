import Link from "next/link";
import { Trophy } from "lucide-react";

import { DashedLine } from "@/components/ui/dashed-line";

export function NewFooter() {
  return (
    <footer className="border-t border-border/50 bg-card/30">
      <div className="mx-auto max-w-[1400px] px-4 py-12 md:px-6">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Trophy className="size-4" />
              </div>
              <span className="text-sm font-semibold">学院竞赛中心</span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              为广金学子提供从赛事发现、报名参赛到备赛交流的一站式服务平台。
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">平台入口</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/competitions" className="transition hover:text-foreground">
                比赛列表
              </Link>
              <Link href="/notifications" className="transition hover:text-foreground">
                通知公告
              </Link>
              <Link href="/clubs" className="transition hover:text-foreground">
                五大社团
              </Link>
              <Link href="/hall-of-fame" className="transition hover:text-foreground">
                名人堂
              </Link>
              <Link href="/team" className="transition hover:text-foreground">
                网站团队
              </Link>
              <Link href="/me" className="transition hover:text-foreground">
                个人中心
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-foreground">联系与说明</h4>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span>学院竞赛办公室</span>
              <span>邮箱：topoxu@gduf.edu.cn</span>
              <span>问题反馈qq群：861503609</span>
              <span>工作日：09:00 - 17:30</span>
            </div>
          </div>
        </div>

        <DashedLine className="my-8" />

        <div className="flex flex-col items-center gap-2">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
            <a
              href="http://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition"
            >
              粤ICP备05008840号
            </a>
            <a
              href="http://www.beian.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition"
            >
              粤公网安备44010602001127号
            </a>
          </div>
          <p className="text-6xl font-bold tracking-tighter text-foreground/5 sm:text-8xl">
            竞赛中心
          </p>
          <p className="text-xs text-muted-foreground">
            学院竞赛管理与问答平台
          </p>
        </div>
      </div>
    </footer>
  );
}
