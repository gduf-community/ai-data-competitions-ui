import { redirect } from "next/navigation";

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

  if (!("capabilities" in sessionUser) || !sessionUser.capabilities.canAccessDashboard) {
    redirect("/errors/forbidden");
  }

  return children;
}
