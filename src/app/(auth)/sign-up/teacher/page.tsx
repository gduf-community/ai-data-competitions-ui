import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { getWebSession as auth } from "@/lib/web-session";
import { TeacherSignupForm } from "./components/teacher-signup-form";

export default async function TeacherSignUpPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/me");
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <Logo size={36} />
          学院竞赛平台
        </Link>
        <TeacherSignupForm />
      </div>
    </div>
  );
}
