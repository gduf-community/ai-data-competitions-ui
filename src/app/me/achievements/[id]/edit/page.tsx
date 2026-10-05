import { redirect } from "next/navigation";

interface LegacyEditPageProps {
  params: Promise<{ id: string }>;
}

export default async function LegacyAchievementEditRedirect({
  params,
}: LegacyEditPageProps) {
  const { id } = await params;
  redirect(`/me/experiences/${id}/edit`);
}
