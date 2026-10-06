import { redirect } from "next/navigation";

import { canAccessDashboard } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/web-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser.id) {
    redirect("/sign-in?callbackUrl=/admin");
  }

  if (!canAccessDashboard(sessionUser)) {
    redirect("/errors/forbidden");
  }

  return children;
}
