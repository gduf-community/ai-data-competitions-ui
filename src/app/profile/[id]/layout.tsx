import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { getWebSession as auth } from "@/lib/web-session";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const currentUser = session?.user
    ? {
        name: session.user.name ?? "未命名用户",
        role: session.user.role,
      }
    : null;

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f8fd_40%,#eef4fb_100%)]">
      <NewNavbar currentUser={currentUser} />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-28 md:px-6 md:pt-32">
        {children}
      </main>
      <NewFooter />
    </div>
  );
}
