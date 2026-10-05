"use client";
export default function ErrorPage({reset}: {reset: () => void}) { return <main className="mx-auto max-w-xl px-6 py-32"><h1 className="text-2xl font-semibold">加载失败</h1><p className="my-4">服务暂不可用，请稍后重试。</p><button onClick={reset} className="rounded border px-4 py-2">重新加载</button></main>; }
