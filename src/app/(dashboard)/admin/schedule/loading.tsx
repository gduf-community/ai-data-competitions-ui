import { PageHeader } from "@/components/shared/page-header";
import { LoadingStatus } from "@/components/shared/euler-bridge-loader";

export default function AdminScheduleLoading() {
  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="赛程安排"
          title="赛程安排"
          description="按比赛时间线查看赛程安排。"
        />
        <div><LoadingStatus size={32}>正在加载赛程…</LoadingStatus></div>
        <div className="grid gap-4" aria-hidden="true">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 rounded-xl border border-border/70 bg-muted/40"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
