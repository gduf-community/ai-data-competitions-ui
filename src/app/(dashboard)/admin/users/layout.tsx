import { redirect } from "next/navigation";

import { canReadUserManagement } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/web-session";

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!canReadUserManagement(sessionUser)) {
    redirect("/errors/forbidden");
  }

  return children;
}
