import { redirect } from "next/navigation";

import { hasRole } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/web-session";

/** 社团详情含管理员姓名与邮箱，仅 super_admin / temporary_admin 可访问。 */
export default async function AdminClubDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (
    !hasRole(sessionUser, "super_admin") &&
    !hasRole(sessionUser, "temporary_admin")
  ) {
    redirect("/errors/forbidden");
  }

  return children;
}
