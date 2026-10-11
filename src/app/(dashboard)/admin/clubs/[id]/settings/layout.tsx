import { redirect } from "next/navigation";
import { hasRole } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/web-session";
export default async function ClubSettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!hasRole(user, "super_admin") && !hasRole(user, "temporary_admin")) redirect("/errors/forbidden");
  return children;
}
