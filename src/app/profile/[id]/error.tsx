"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function PublicProfileError({ reset }: { reset: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-xl border border-red-200/70 bg-white/95 p-8 shadow-sm">
      <h1 className="text-2xl font-semibold text-slate-950">
        人物档案暂时无法加载
      </h1>
      <p className="mt-3 text-sm text-slate-600">
        加载人物资料或入选进阶履历时发生服务异常，请点击重新加载后再试。
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
          返回名人堂
        </Link>
      </div>
    </div>
  );
}
