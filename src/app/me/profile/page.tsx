import { getMeProfile } from "@/lib/web-data";
import { resolveUserTitles } from "@/lib/web-data";
import { ProfileView } from "@/components/profile/profile-view";

export default async function MyProfilePage() {

  const [profileData, titles] = await Promise.all([
    getMeProfile(),
    resolveUserTitles(),
  ]);

  return <ProfileView initialData={profileData} titles={titles} />;
}
