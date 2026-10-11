import { notFound } from "next/navigation";
import { getManagedClubs } from "@/lib/web-data";
export default async function ClubLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await getManagedClubs()).some(club => club.slug === id)) notFound();
  return children;
}
