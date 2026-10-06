import { redirect } from "next/navigation";

import { canManageSecurityCenter } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/web-session";

export default async function SecurityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();
  if (!sessionUser.id) {
    redirect("/sign-in?callbackUrl=/admin/security");
  }

  if (!canManageSecurityCenter({ role: sessionUser.role })) {
    redirect("/admin");
  }

  return <>{children}</>;
}
