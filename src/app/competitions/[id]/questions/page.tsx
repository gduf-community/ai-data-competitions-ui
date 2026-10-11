import Link from "next/link";
import { ChevronRight, LogIn } from "lucide-react";
import { notFound } from "next/navigation";
import { parseSearchQuery, searchParameter, serializeSearchQuery, SearchQueryError } from "@/lib/search";
import { SearchQueryForm } from "@/components/shared/search-query-form";

import { getWebSession as auth } from "@/lib/web-session";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { Section } from "@/components/marketing/section";
import { AskQuestionForm } from "@/components/questions/ask-question-form";
import { QuestionList } from "@/components/questions/question-list";
import { Button } from "@/components/ui/button";
import { getPublicCompetition as getCompetitionById, listQuestionPage } from "@/lib/web-data";

export default async function QuestionsPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const [competition, session] = await Promise.all([
    getCompetitionById(id),
    auth(),
  ]);

  if (!competition) {
    notFound();
  }
  const isLoggedIn = Boolean(session?.user);
  const currentUser = session?.user
    ? {
        name: session.user.name ?? "未命名用户",
        role: session.user.role,
      }
    : null;
  const urlParams = new URLSearchParams();
  for (const [key, entry] of Object.entries(await searchParams)) for (const value of Array.isArray(entry) ? entry : entry === undefined ? [] : [entry]) urlParams.append(key, value);
  let query;
  let status: "open" | "closed" | undefined;
  try {
    query = parseSearchQuery(urlParams);
    const rawStatus = searchParameter(urlParams, "status");
    const requestedCompetition = searchParameter(urlParams, "competitionId");
    if (requestedCompetition !== null && requestedCompetition !== id) throw new SearchQueryError("INVALID_QUERY", "比赛范围与当前页面不一致。");
    if (rawStatus !== null && rawStatus !== "open" && rawStatus !== "closed") throw new SearchQueryError("INVALID_QUERY", "无效的问答状态。");
    status = rawStatus ?? undefined;
  } catch (error) { return <main role="alert" className="p-8">{error instanceof SearchQueryError ? error.message : "无效搜索参数"}<Link href={`/competitions/${id}/questions`}>重置搜索</Link></main>; }
  const page = query.page;
  const {questions, hasMore, total} = await listQuestionPage(id, query, status);
  const href = (page: number) => `/competitions/${id}/questions?` + serializeSearchQuery({ ...query, page }, urlParams);

  return (
    <div className="min-h-screen bg-background">
      <PortalNavbar currentUser={currentUser} />
      <Section className="pb-10">
        <div className="mx-auto max-w-3xl space-y-6">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground">
            <Link href="/competitions" className="hover:text-foreground">
              比赛列表
            </Link>
            <ChevronRight className="size-3.5" />
            <Link href={`/competitions/${id}`} className="hover:text-foreground">
              {competition.title}
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-foreground">问答讨论</span>
          </nav>

          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">问答讨论</h1>
          </div>

          <SearchQueryForm key={JSON.stringify(query) + status} path={`/competitions/${id}/questions`} query={query} parameters={urlParams.toString()}
            placeholder="搜索问题标题或正文" status={status ?? "all"} statuses={[{ value: "open", label: "讨论中" }, { value: "closed", label: "已关闭" }]} />
          <QuestionList questions={questions} emptyLabel={query.q || status ? "当前搜索没有匹配的问题，可以调整关键词或状态。" : undefined} />
          <nav aria-label="问答分页" className="flex items-center justify-between text-sm">
            {page > 1 ? <Link href={href(page - 1)}>上一页</Link> : <span />}
            <span role="status">共 {total} 个问题 · 第 {page} 页</span>
            {hasMore ? <Link href={href(page + 1)}>下一页</Link> : <span />}
          </nav>

          {isLoggedIn ? (
            <div className="rounded-xl border border-border/70 p-5">
              <h2 className="mb-4 font-medium">我要提问</h2>
              <AskQuestionForm competitionId={id} />
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-xl border border-dashed border-border/70 px-5 py-4">
              <p className="text-sm text-muted-foreground">登录后可参与讨论</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/sign-in">
                  <LogIn className="mr-1.5 size-3.5" />
                  登录
                </Link>
              </Button>
            </div>
          )}
        </div>
      </Section>
      <PortalFooter />
    </div>
  );
}
