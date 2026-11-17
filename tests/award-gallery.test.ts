import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { galleryHref, awardCompetitionCertificatesSchema, awardYearSummariesSchema, permittedAwardGalleryServerRead } from "../src/lib/award-gallery";
import type { AwardCompetitionCertificates } from "../src/lib/contracts/award-gallery";
import { permittedBrowserRequest } from "../src/lib/web-transport";
import { AwardCompetition } from "../src/components/marketing/award-gallery/competition";
import { AwardOverview } from "../src/components/marketing/award-gallery/overview";
import { AwardYear } from "../src/components/marketing/award-gallery/year";

const require = createRequire(import.meta.url);
const competitionId = "11111111-1111-4111-8111-111111111111";
const summary = { competitionId, competitionTitle: "合成比赛完整名称", certificateCount: 200 };
const page: AwardCompetitionCertificates = { ...summary, year: 2030, levels: [{ level: "一等奖", certificateCount: 200 }],
  awards: [{ id: competitionId, userName: "合成上传者", memberNames: ["合成成员甲", "合成成员乙"], competitionTitle: "历史名称", awardLevel: "一等奖", level: "一等奖", imageUrl: "/api/portal/assets?fixture=1" }],
  page: { limit: 24, nextCursor: "next", previousCursor: "previous" } };
function evaluate(file: string, dependencies: Record<string, unknown>) {
  const sandboxModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: sandboxModule, exports: sandboxModule.exports, URLSearchParams, Map, Set, Number, Error,
    require: (name: string) => name in dependencies ? dependencies[name] : require(name) });
  return sandboxModule.exports;
}
const link = ({ children, href }: { children: React.ReactNode; href: string; prefetch?: boolean }) => React.createElement("a", { href }, children);

test("year links are canonical and cursor state is URL encoded", () => {
  assert.equal(galleryHref({}), "/awards");
  assert.equal(galleryHref({ year: 2030 }), "/awards/year/2030");
  assert.equal(galleryHref({ year: 2030, competition: competitionId, cursor: "a+b/=" }), `/awards/year/2030/${competitionId}?cursor=a%2Bb%2F%3D`);
  assert.equal(galleryHref({ year: 2030, competition: competitionId, page: 1 }), `/awards/year/2030/${competitionId}`);
  assert.equal(galleryHref({ year: 2030, competition: competitionId, page: 4 }), `/awards/year/2030/${competitionId}?page=4`);
  assert.throws(() => galleryHref({ year: 2030, competition: competitionId, page: 0 }));
  assert.throws(() => galleryHref({ year: 2030, competition: competitionId, page: 2, cursor: "a" }));
  assert.throws(() => galleryHref({ competition: competitionId }));
});
test("public schemas strip private fields and reject oversized certificate pages", () => {
  const parsed = awardCompetitionCertificatesSchema.parse({ ...page, email: "private-marker", awards: [{ ...page.awards[0], studentNo: "private-marker" }] });
  assert.doesNotMatch(JSON.stringify(parsed), /private-marker/);
  assert.throws(() => awardCompetitionCertificatesSchema.parse({ ...page, awards: Array(25).fill(page.awards[0]) }));
  assert.doesNotThrow(() => awardCompetitionCertificatesSchema.parse({ ...page, page: { ...page.page, nextCursor: "a".repeat(1536) } }));
  assert.throws(() => awardCompetitionCertificatesSchema.parse({ ...page, page: { ...page.page, nextCursor: "a".repeat(1537) } }));
  const a = awardYearSummariesSchema.parse({ totals: { yearCount: 0, competitionCount: 0, certificateCount: 0 }, years: [], awards: [page.awards[0]] });
  assert.ok(!("awards" in a));
});
test("A/B render aggregates without certificate images or selection instructions", () => {
  const overview = renderToStaticMarkup(React.createElement(AwardOverview, { data: { totals: { yearCount: 1, competitionCount: 1, certificateCount: 200 }, years: [{ year: 2030, competitionCount: 1, certificateCount: 200, competitions: [summary] }] } }));
  const year = renderToStaticMarkup(React.createElement(AwardYear, { data: { year: 2030, competitionCount: 1, certificateCount: 200, competitions: [{ ...summary, levels: page.levels }] } }));
  for (const html of [overview, year]) { assert.doesNotMatch(html, /<img|选择年份后查看|选择比赛后查看/); assert.match(html, /当前所在/); }
  assert.match(year, /2030年获奖比赛/); assert.match(year, /aria-current="page"/);
});
test("overview year directory ascends, scrolls without hashes and marks the current year", () => {
  const otherId = "55555555-5555-4555-8555-555555555555";
  const other = { ...summary, competitionId: otherId, competitionTitle: "合成另一比赛" };
  const html = renderToStaticMarkup(React.createElement(AwardOverview, { data: {
    totals: { yearCount: 2, competitionCount: 3, certificateCount: 600 },
    years: [
      { year: 2030, competitionCount: 2, certificateCount: 400, competitions: [summary, other] },
      { year: 2029, competitionCount: 1, certificateCount: 200, competitions: [{ ...summary, competitionId: "66666666-6666-4666-8666-666666666666" }] },
    ],
  } }));
  assert.match(html, /aria-label="获奖年份目录"/);
  assert.match(html, /<button type="button"/);
  assert.doesNotMatch(html, /href="#award-year-/);
  assert.match(html, /id="award-year-2030"/);
  assert.match(html, /id="award-year-2029"/);
  assert.ok(html.indexOf("2029年") < html.indexOf("2030年"), "directory years must ascend");
  assert.ok(html.indexOf('id="award-year-2029"') < html.indexOf('id="award-year-2030"'), "year sections must ascend");
  assert.equal((html.match(/aria-current="location"/g) ?? []).length, 1);
  const firstButton = html.slice(html.indexOf("<button"), html.indexOf("</button>"));
  assert.match(firstButton, /aria-current="location"/);
  assert.match(firstButton, /2029年/);
  assert.doesNotMatch(html, /获奖比赛分类目录|创新创业/);
  assert.doesNotMatch(renderToStaticMarkup(React.createElement(AwardOverview, { data: { totals: { yearCount: 0, competitionCount: 0, certificateCount: 0 }, years: [] } })), /获奖年份目录/);
});
test("C renders full-event totals, current-page counts, verified members and reversible links", () => {
  const html = renderToStaticMarkup(React.createElement(AwardCompetition, { data: page }));
  assert.match(html, /200份/); assert.match(html, /本页1份/);
  assert.match(html, /合成成员甲、合成成员乙/); assert.doesNotMatch(html, />合成上传者</);
  assert.match(html, /cursor=previous/); assert.match(html, /cursor=next/); assert.match(html, /年度总览/);
  assert.match(html, new RegExp(`/awards/${competitionId}`));
});
test("numbered pagination shows a window, the current page and a jump form", () => {
  const html = renderToStaticMarkup(React.createElement(AwardCompetition, { data: {
    ...page, certificateCount: 336,
    page: { limit: 24, nextCursor: "next", previousCursor: "previous", pageNumber: 4, pageCount: 14 },
  } }));
  const base = `/awards/year/2030/${competitionId}`;
  assert.match(html, /aria-label="获奖证书分页"/);
  assert.match(html, new RegExp(`href="${base}\\?page=3"`));
  assert.match(html, new RegExp(`href="${base}\\?page=5"`));
  assert.match(html, new RegExp(`href="${base}\\?page=14"`));
  assert.match(html, /上一页/); assert.match(html, /下一页/);
  assert.match(html, />4\/14页</);
  assert.match(html, /aria-current="page"[^>]*>4</);
  assert.match(html, /…/);
  assert.match(html, new RegExp(`action="${base}"`));
  assert.match(html, /name="page"/); assert.match(html, /max="14"/);
  assert.doesNotMatch(html, /cursor=/);
});
test("level buttons toggle multi-select filters and keep them while paging", () => {
  const base = `/awards/year/2030/${competitionId}`;
  const data: AwardCompetitionCertificates = {
    ...page, certificateCount: 260,
    levels: [{ level: "一等奖", certificateCount: 200 }, { level: "二等奖", certificateCount: 50 }, { level: "三等奖", certificateCount: 10 }],
    page: { limit: 24, nextCursor: null, previousCursor: null, pageNumber: 2, pageCount: 9 },
  };
  const filtered = renderToStaticMarkup(React.createElement(AwardCompetition, { data, selectedLevels: ["一等奖", "二等奖"] }))
    .replace(/<!-- -->/g, "");
  const second = encodeURIComponent("二等奖");
  const first = encodeURIComponent("一等奖");
  assert.match(filtered, /aria-label="按奖项等级筛选"/);
  assert.match(filtered, /aria-current="true"[^>]*>一等奖/);
  assert.match(filtered, /当前筛选<span[^>]*>250份/);
  assert.match(filtered, /2\/9页/);
  // Removing a level keeps the remaining filter; adding the third level resets to all.
  assert.match(filtered, new RegExp(`href="${base}\\?levels=${second}"`));
  assert.match(filtered, new RegExp(`href="${base}\\?page=3&amp;levels=${first}&amp;levels=${second}"`));
  assert.match(filtered, /name="levels" value="一等奖"/); assert.match(filtered, /name="levels" value="二等奖"/);
  const all = renderToStaticMarkup(React.createElement(AwardCompetition, { data }));
  assert.doesNotMatch(all, /当前筛选/);
  // Paging and the jump form stay unfiltered while every level is selected; only a pill's own toggle links carry `levels`.
  assert.match(all, new RegExp(`href="${base}\\?page=3"`));
  assert.doesNotMatch(all, /[?&]page=\d+&amp;levels=/);
  assert.doesNotMatch(all, /name="levels"/);
  assert.equal((all.match(/aria-current="true"/g) ?? []).length, 3);
});
test("C preserves the API order when a level appears in multiple runs", () => {
  const awards = [
    { ...page.awards[0], id: "33333333-3333-4333-8333-333333333333", level: "二等奖" },
    page.awards[0],
    { ...page.awards[0], id: "44444444-4444-4444-8444-444444444444", level: "二等奖" },
  ];
  const html = renderToStaticMarkup(React.createElement(AwardCompetition, { data: { ...page, awards } }));
  const certificateLinks = [...html.matchAll(/href="\/awards\/([0-9a-f-]+)"/g)].map(match => match[1]);
  assert.deepEqual(certificateLinks, awards.map(award => award.id));
});
test("new public server reads remain precise and are not browser capabilities", () => {
  for (const path of ["/api/awards/years", "/api/awards/years/2030", `/api/awards/years/2030/${competitionId}?cursor=x`]) {
    assert.equal(permittedAwardGalleryServerRead(path), true);
    assert.equal(permittedBrowserRequest(new Request("http://localhost:3000" + path), { api: new URL("http://localhost:3001"), web: new URL("http://localhost:3000"), business: false, serviceToken: "a".repeat(64), clientIpHeader: undefined }), false);
  }
  for (const path of ["/api/awards/years/2030/private", `/api/awards/years/2030/${competitionId}/members`, "/api/awards/years/no-year"]) assert.equal(permittedAwardGalleryServerRead(path), false);
});

test("data error retry refreshes server data before resetting its boundary", () => {
  const actions: string[] = [];
  const ErrorPage = (evaluate("src/app/awards/error.tsx", {
    react: { useTransition: () => [false, (callback: () => void) => callback()] },
    "next/navigation": { useRouter: () => ({ refresh: () => actions.push("refresh") }) },
    "next/link": link,
  }) as { default: (props: { reset: () => void }) => React.ReactElement }).default;
  const tree = ErrorPage({ reset: () => actions.push("reset") });
  function clickRetry(node: React.ReactNode): boolean {
    if (!React.isValidElement<{ children?: React.ReactNode; onClick?: () => void }>(node)) return false;
    if (node.type === "button") { node.props.onClick!(); return true; }
    return React.Children.toArray(node.props.children).some(clickRetry);
  }
  assert.equal(clickRetry(tree), true);
  assert.deepEqual(actions, ["refresh", "reset"]);
});
