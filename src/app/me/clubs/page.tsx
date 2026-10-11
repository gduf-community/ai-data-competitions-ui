import { redirect } from "next/navigation";
import { getWebSession } from "@/lib/web-session";
export default async function LegacyClubsPage() {
  const session = await getWebSession();
  if (!session) redirect("/sign-in?callbackUrl=%2Fadmin%2Fclubs");
  if (!session.user.capabilities?.canAccessClubManagement) redirect("/errors/forbidden");
  redirect("/admin/clubs");
}
