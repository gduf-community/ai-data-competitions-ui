import Link from "next/link";

import { Logo } from "@/components/logo";

import { ResetPasswordForm1 } from "./components/reset-password-form-1";

export default function ResetPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-md">
            <Logo size={24} />
          </div>
          学院竞赛平台
        </Link>
        <ResetPasswordForm1 />
      </div>
    </div>
  );
}
