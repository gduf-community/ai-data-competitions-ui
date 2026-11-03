"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function AwardsError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-14 md:px-6 md:pt-8">
    <h1 className="text-2xl font-semibold">荣誉数据暂时无法加载</h1>
    <p className="mt-3 text-sm text-muted-foreground">请重试或稍后再查看。</p>
    <div className="mt-6 flex flex-wrap gap-4"><button disabled={pending} onClick={() => startTransition(() => { router.refresh(); reset(); })} className="min-h-11 rounded-md border px-4 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50">{pending ? "正在加载…" : "重新加载"}</button><Link href="/awards" className="inline-flex min-h-11 items-center px-4 underline">返回年度总览</Link></div>
  </main>;
}
