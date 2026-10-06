import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/web-session";
import { hasRole, isSuperAdminRole } from "@/lib/auth/authorization";

/** 内容审核页仅平台管理员可访问（含 business_admin）。 */
export default async function AdminClubReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!(isSuperAdminRole(sessionUser) || hasRole(sessionUser, "business_admin"))) {
    redirect("/errors/forbidden");
  }

  return children;
}
