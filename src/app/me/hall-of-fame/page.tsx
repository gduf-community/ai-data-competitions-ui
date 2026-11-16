import { HallOfFameStatusCard } from "@/components/profile/hall-of-fame-status-card";
import { PageHeader } from "@/components/shared/page-header";
import { getForUser, getMeProfile } from "@/lib/web-data";
import { getSessionUser } from "@/lib/web-session";

export default async function MyHallOfFamePage() {
  const sessionUser = await getSessionUser();
  const userId = sessionUser.id!;

  const [profile, entry] = await Promise.all([getMeProfile(), getForUser()]);

  const displaySettings = {
    publicShowAvatar: profile?.profile?.publicShowAvatar ?? true,
    publicShowCollegeMajor: profile?.profile?.publicShowCollegeMajor ?? true,
    publicShowTitles: profile?.profile?.publicShowTitles ?? true,
  };

  const userSnapshot = {
    name: profile?.user?.name ?? sessionUser.name ?? "",
    grade: profile?.user?.grade ?? null,
    college: profile?.user?.college ?? null,
    major: profile?.user?.major ?? null,
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="个人中心"
        title="名人堂展示"
        description="名人堂资料需由超级管理员邀请后确认基础信息与专用照片，经审核通过后对外展示。"
      />
      <HallOfFameStatusCard
        entry={entry}
        userId={userId}
        userName={sessionUser.name}
        userSnapshot={userSnapshot}
        displaySettings={displaySettings}
      />
    </div>
  );
}
