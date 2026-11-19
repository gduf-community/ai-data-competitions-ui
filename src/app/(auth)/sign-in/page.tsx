import Link from "next/link";
import { redirect } from "next/navigation";

import { Logo } from "@/components/logo";
import { getWebSession as auth } from "@/lib/web-session";
import { LoginForm1 } from "./components/login-form-1";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string | string[] }>;
}) {
  const query = await searchParams;
  const rawCallback = Array.isArray(query.callbackUrl)
    ? query.callbackUrl[0]
    : query.callbackUrl;
  const callbackUrl =
    rawCallback && rawCallback.startsWith("/") && !rawCallback.startsWith("//")
      ? rawCallback
      : "/me";
  const session = await auth();
  if (session?.user?.id) {
    redirect(callbackUrl);
  }

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <Logo size={36} />
          学院竞赛平台
        </Link>
        {callbackUrl !== "/me" ? (
          <p className="text-center text-sm text-muted-foreground">
            此页面需要登录。登录成功后将返回你刚才访问的页面。
          </p>
        ) : null}
        <LoginForm1 />
      </div>
    </div>
  );
}
