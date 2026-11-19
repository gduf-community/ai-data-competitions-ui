import { notFound } from "next/navigation";

import { PublicProfileContent } from "@/components/profile/hall-of-fame-milestone-list";
import { getPublicProfile, listAwardsForUser } from "@/lib/web-data";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    notFound();
  }

  const awardsPreview = await listAwardsForUser(profile.id, {
    page: 1,
    limit: 4,
  });

  return (
    <PublicProfileContent profile={profile} awardsPreview={awardsPreview} />
  );
}
