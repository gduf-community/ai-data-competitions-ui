import { notFound } from "next/navigation";

import { PublicProfileContent } from "@/components/profile/hall-of-fame-milestone-list";
import { getPublicProfile } from "@/lib/web-data";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    notFound();
  }

  return <PublicProfileContent profile={profile} />;
}
