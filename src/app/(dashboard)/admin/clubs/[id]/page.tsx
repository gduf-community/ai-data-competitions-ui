import { redirect } from "next/navigation";
export default async function ClubPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/clubs/${encodeURIComponent(id)}/contents`);
}
