"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";

export default function HallOfFameError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen flex-col bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf8_38%,#f5f1e8_100%)]">
      <PortalNavbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-12 md:px-6">
        <div className="rounded-xl border border-red-200/70 bg-white/95 p-8 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-950">
            名人堂数据暂时无法加载
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            获取名人堂成员信息时服务返回异常，并非当前名单为空。请稍后点击重新加载。
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  router.refresh();
                  reset();
                })
              }
              className="min-h-11 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50"
            >
              {pending ? "正在加载…" : "重新加载"}
            </button>
            <Link
              href="/hall-of-fame"
              className="inline-flex min-h-11 items-center px-2 text-sm text-slate-700 underline hover:text-slate-950"
            >
              返回名人堂总览
            </Link>
          </div>
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}
