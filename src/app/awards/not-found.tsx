import Link from "next/link";

export default function AwardNotFound() {
  return <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-14 md:px-6 md:pt-8">
    <h1 className="text-2xl font-semibold">未找到对应的公开荣誉记录</h1>
    <p className="mt-3 text-sm text-muted-foreground">请检查年份、比赛或分页链接，也可能是记录已撤回。</p>
    <Link href="/awards" className="mt-6 inline-flex min-h-11 items-center underline">返回年度总览</Link>
  </main>;
}
