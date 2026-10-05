import { HallOfFameStatusCard } from "@/components/profile/hall-of-fame-status-card";
import { PageHeader } from "@/components/shared/page-header";
import { getSessionUser } from "@/lib/web-session";
import { getForUser } from "@/lib/web-data";
import { getMeProfile } from "@/lib/web-data";

export default async function MyHallOfFamePage() {
  const sessionUser = await getSessionUser();
  const userId = sessionUser.id!;

  const profile = await getMeProfile();

  const entry = await getForUser();

  const displaySettings = {
    publicShowAvatar: profile?.profile?.publicShowAvatar ?? true,
    publicShowCollegeMajor: profile?.profile?.publicShowCollegeMajor ?? true,
    publicShowTitles: profile?.profile?.publicShowTitles ?? true,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="个人中心"
        title="名人堂展示"
        description="名人堂资料需由超级管理员邀请后填写，并由超级管理员审核。"
      />
      <HallOfFameStatusCard
        entry={entry}
        userId={userId}
        userName={sessionUser.name}
        displaySettings={displaySettings}
      />
    </div>
  );
}
