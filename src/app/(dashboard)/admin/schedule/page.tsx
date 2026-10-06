import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listCompetitions } from "@/lib/web-data";

export const dynamic = "force-dynamic";

export default async function AdminSchedulePage() {
  let competitions: Awaited<ReturnType<typeof listCompetitions>> = [];
  let error: string | null = null;

  try {
    competitions = await listCompetitions();
  } catch (e) {
    console.error("[schedule] failed to load competitions:", e);
    error = "赛程数据加载失败，请刷新页面重试。";
  }

  return (
    <div className="px-4 lg:px-6">
      <div className="space-y-8">
        <PageHeader
          eyebrow="赛程安排"
          title="赛程安排"
          description="按比赛时间线查看赛程安排。"
        />

        {error ? (
          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-6 text-center text-sm text-destructive">
            {error}
          </div>
        ) : competitions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 p-12 text-center text-sm text-muted-foreground">
            暂无赛程安排
          </div>
        ) : (
          <div className="grid gap-4">
            {competitions.map((competition) => (
              <Card key={competition.id} className="border-border/70">
                <CardHeader>
                  <CardTitle>{competition.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {competition.timeline.length === 0 ? (
                    <p className="text-muted-foreground">暂无赛程节点</p>
                  ) : (
                    competition.timeline.map((item) => (
                      <div
                        key={`${competition.id}-${item.label}`}
                        className="rounded-2xl border border-dashed border-border/70 p-4"
                      >
                        <p className="font-medium">{item.label}</p>
                        <p className="text-muted-foreground">{item.date} · {item.description}</p>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
