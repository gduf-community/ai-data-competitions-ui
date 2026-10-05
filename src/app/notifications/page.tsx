import { Bell, Megaphone } from "lucide-react";

import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { Section } from "@/components/marketing/section";
import { NotificationsReadSync } from "@/components/notifications/notifications-read-sync";
import { RichTextContent } from "@/components/shared/rich-text-content";
import { Card, CardContent } from "@/components/ui/card";
import { getWebSession as auth } from "@/lib/web-session";
import { listPublishedNotices } from "@/lib/web-data";
import { formatNoticeDate } from "@/lib/notice-format";

export default async function NotificationsPage() {
  const [session, publishedNotices] = await Promise.all([
    auth(),
    listPublishedNotices(100),
  ]);
  const currentUser = session?.user
    ? { name: session.user.name ?? "未命名用户", role: session.user.role }
    : null;


  return (
    <div className="min-h-screen bg-background">
      <PortalNavbar currentUser={currentUser} />
      <NotificationsReadSync
        noticeIds={publishedNotices.map((notice) => notice.id)}
        userId={session?.user?.id ?? null}
      />
      <Section className="pb-16">
        <div className="mx-auto max-w-3xl space-y-8">
          <div className="space-y-3">
            <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
              <Bell className="size-7 text-primary" />
              通知中心
            </h1>
            <p className="text-sm text-muted-foreground">
              查看平台公告和比赛相关通知
            </p>
          </div>

          {publishedNotices.length === 0 ? (
            <Card className="border-border/70">
              <CardContent className="py-12 text-center">
                <p className="text-sm text-muted-foreground">
                  暂无通知，有新公告时会在此展示。
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {publishedNotices.map((notice) => (
                <Card
                  key={notice.id}
                  className="border-border/70 transition-colors hover:border-border"
                >
                  <CardContent className="p-5">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                          notice.priority === "critical"
                            ? "bg-rose-100 text-rose-700"
                            : notice.priority === "important"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <Megaphone className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold">
                            {notice.title}
                          </h3>
                          {notice.priority !== "normal" && (
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                                notice.priority === "critical"
                                  ? "bg-rose-100 text-rose-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {notice.priority === "critical" ? "紧急" : "重要"}
                            </span>
                          )}
                          {notice.deliveryScope === "global" && (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                              全站
                            </span>
                          )}
                        </div>
                        <RichTextContent
                          html={notice.content}
                          className="text-sm leading-6 text-slate-600"
                        />
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {formatNoticeDate(notice.publishedAt || notice.updatedAt)}
                          </span>
                          {notice.competitionTitle && <span>· {notice.competitionTitle}</span>}
                          {notice.competitionId ? (
                            <a
                              href={`/api/notices/${notice.id}/open`}
                              className="text-primary hover:underline"
                            >
                              查看关联比赛
                            </a>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Section>
      <PortalFooter />
    </div>
  );
}
