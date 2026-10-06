import { redirect } from "next/navigation";

import { hasRole, isSuperAdminRole } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/web-session";

export default async function ExperienceReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser.id) {
    redirect("/sign-in?callbackUrl=/admin/experience-reviews");
  }

  if (!isSuperAdminRole(sessionUser) && !hasRole(sessionUser, "supervisor")) {
    redirect("/admin");
  }

  return <>{children}</>;
}
