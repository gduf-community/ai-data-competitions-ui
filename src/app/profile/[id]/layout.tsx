import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";

export default async function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {


  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f8fd_40%,#eef4fb_100%)]">
      <NewNavbar />
      <main className="mx-auto max-w-5xl px-4 pb-12 pt-28 md:px-6 md:pt-32">
        {children}
      </main>
      <NewFooter />
    </div>
  );
}
