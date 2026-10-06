export function SiteFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="px-4 py-6 lg:px-6">
        <div className="flex flex-col items-center justify-center space-y-2 text-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>学院竞赛管理与问答平台骨架</span>
            <span>·</span>
            <span>Next.js + shadcn/ui</span>
          </div>
          <p className="text-xs text-muted-foreground">
            当前阶段优先验证门户展示、报名链路、审核工作台与可复用业务组件。
          </p>
        </div>
      </div>
    </footer>
  )
}
