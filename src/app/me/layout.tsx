import { redirect } from "next/navigation";

import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { MeSidebar } from "@/components/profile/me-sidebar";
import { getSessionUser } from "@/lib/web-session";

export const dynamic = "force-dynamic";

export default async function MeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionUser = await getSessionUser();

  if (!sessionUser.id) {
    redirect("/sign-in?callbackUrl=/me");
  }

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f8fd_40%,#eef4fb_100%)]">
      <NewNavbar
        currentUser={{ name: sessionUser.name, role: sessionUser.role }}
      />
      <div className="mx-auto max-w-7xl px-4 pb-10 pt-28 md:px-6 md:pt-32">
        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="hidden w-60 shrink-0 md:block">
            <MeSidebar />
          </aside>
          <div className="md:hidden">
            <MeSidebar variant="tabs" />
          </div>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <NewFooter />
    </div>
  );
}
