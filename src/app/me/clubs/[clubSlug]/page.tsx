import { redirect, notFound } from "next/navigation";
import { getWebSession } from "@/lib/web-session";
import { getManagedClubs } from "@/lib/web-data";
export default async function LegacyClubPage({ params }: { params: Promise<{ clubSlug: string }> }) {
  const { clubSlug } = await params;
  const target = `/admin/clubs/${clubSlug}/contents`;
  if (!(await getWebSession())) redirect("/sign-in?callbackUrl=" + encodeURIComponent(target));
  if (!(await getManagedClubs()).some(club => club.slug === clubSlug)) notFound();
  redirect(target);
}
