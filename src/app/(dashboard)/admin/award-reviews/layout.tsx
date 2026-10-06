import { redirect } from "next/navigation";

import { canAccessDashboard } from "@/lib/auth/authorization";
import { getSessionUser } from "@/lib/web-session";

export default async function AwardReviewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser.id) {
    redirect("/sign-in?callbackUrl=/admin/award-reviews");
  }

  if (!canAccessDashboard(sessionUser)) {
    redirect("/admin");
  }

  return <>{children}</>;
}
