import { redirect } from "next/navigation";
import { getWebSession } from "@/lib/web-session";
import { canAccessDashboard } from "@/lib/auth/authorization";
import DashboardOverview from "@/components/admin/dashboard-overview";
export default async function AdminPage() {
  const session = await getWebSession();
  if (session && !canAccessDashboard(session.user)) redirect("/admin/clubs");
  return <DashboardOverview />;
}
