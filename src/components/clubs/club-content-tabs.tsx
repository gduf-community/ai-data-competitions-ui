import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClubContentList } from "@/components/clubs/club-content-list";
import type { ClubContentSummaryRow } from "@/lib/contracts/clubs";
import { translateText, type AppLocale } from "@/lib/i18n";

interface ClubContentTabsProps {
  clubSlug: string;
  recruitment: ClubContentSummaryRow[];
  activity: ClubContentSummaryRow[];
  announcement: ClubContentSummaryRow[];
  eventSummary: ClubContentSummaryRow[];
  locale: AppLocale;
}

function formatCount(count: number, locale: AppLocale): string {
  if (count <= 0) return "";
  return locale === "en-US" ? ` (${count})` : `（${count}）`;
}

export function ClubContentTabs({
  clubSlug,
  recruitment,
  activity,
  announcement,
  eventSummary,
  locale
}: ClubContentTabsProps) {
  return (
    <Tabs defaultValue="recruitment" className="gap-6">
      <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-xl bg-muted/50 p-2">
        <TabsTrigger
          value="recruitment"
          className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-background"
        >
          {translateText("招新信息", locale)}
          {formatCount(recruitment.length, locale)}
        </TabsTrigger>
        <TabsTrigger
          value="activity"
          className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-background"
        >
          {translateText("近期活动", locale)}
          {formatCount(activity.length, locale)}
        </TabsTrigger>
        <TabsTrigger
          value="announcement"
          className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-background"
        >
          {translateText("社团公告", locale)}
          {formatCount(announcement.length, locale)}
        </TabsTrigger>
        <TabsTrigger
          value="event_summary"
          className="rounded-lg px-3 py-2 text-sm data-[state=active]:bg-background"
        >
          {translateText("往期活动", locale)}
          {formatCount(eventSummary.length, locale)}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="recruitment">
        <ClubContentList
          clubSlug={clubSlug}
          items={recruitment}
          emptyTitle={translateText("暂无招新信息", locale)}
          emptyText={translateText("请关注社团后续发布。", locale)}
        />
      </TabsContent>
      <TabsContent value="activity">
        <ClubContentList
          clubSlug={clubSlug}
          items={activity}
          emptyTitle={translateText("暂无近期活动", locale)}
          emptyText={translateText("敬请期待。", locale)}
        />
      </TabsContent>
      <TabsContent value="announcement">
        <ClubContentList
          clubSlug={clubSlug}
          items={announcement}
          emptyTitle={translateText("暂无社团公告", locale)}
          emptyText={translateText("社团发布公告后将在此展示。", locale)}
        />
      </TabsContent>
      <TabsContent value="event_summary">
        <ClubContentList
          clubSlug={clubSlug}
          items={eventSummary}
          emptyTitle={translateText("暂无往期活动回顾", locale)}
          emptyText={translateText("社团发布活动总结后将在此展示。", locale)}
        />
      </TabsContent>
    </Tabs>
  );
}
