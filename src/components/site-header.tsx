"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ModeToggle } from "@/components/mode-toggle"

export function SiteHeader() {
  return (
    <>
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/60 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 py-3 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <div className="flex-1">
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight">学院竞赛管理后台</span>
              <span className="text-muted-foreground text-xs">
                统一承接比赛发布、报名审核、通知与资料管理
              </span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
              <Link href="/competitions" className="dark:text-foreground">
                比赛列表
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
              <Link href="/admin/applications" className="dark:text-foreground">
                审核工作台
              </Link>
            </Button>
            <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
              <Link href="/me/applications" className="dark:text-foreground">
                我的报名
              </Link>
            </Button>
            <ModeToggle />
          </div>
        </div>
      </header>
    </>
  )
}
