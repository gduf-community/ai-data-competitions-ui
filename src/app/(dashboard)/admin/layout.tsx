import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getSessionUser } from "@/lib/web-session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser.id) {
    const path = (await headers()).get("x-web-current-path") ?? "/admin";
    redirect("/sign-in?callbackUrl=" + encodeURIComponent(path.startsWith("/admin/") ? path : "/admin"));
  }

  if (!("capabilities" in sessionUser) || !sessionUser.capabilities.canAccessDashboard) {
    redirect("/errors/forbidden");
  }

  return children;
}
