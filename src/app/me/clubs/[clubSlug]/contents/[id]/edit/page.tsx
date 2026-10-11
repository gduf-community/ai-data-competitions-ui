import { redirect, notFound } from "next/navigation";
import { getWebSession } from "@/lib/web-session";
import { getManagedClubs, getManagedClubContent } from "@/lib/web-data";
export default async function LegacyClubPage({ params }: { params: Promise<{ clubSlug: string; id: string }> }) {
  const { clubSlug, id } = await params;
  const target = `/admin/clubs/${clubSlug}/contents/${id}/edit`;
  if (!(await getWebSession())) redirect("/sign-in?callbackUrl=" + encodeURIComponent(target));
  if (!(await getManagedClubs()).some(club => club.slug === clubSlug)) notFound();
  if (!(await getManagedClubContent(clubSlug, id))) notFound();
  redirect(target);
}
