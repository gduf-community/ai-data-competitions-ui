import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { galleryHref, awardCompetitionCertificatesSchema, awardYearSummariesSchema } from "../src/lib/award-gallery";
import * as contracts from "../src/lib/contracts/award-gallery";
import { permittedPublicServerRead, permittedBrowserRequest } from "../src/lib/web-transport";

const require = createRequire(import.meta.url);
const competitionId = "11111111-1111-4111-8111-111111111111";
const summary = { competitionId, competitionTitle: "合成比赛完整名称", certificateCount: 200 };
const page: contracts.AwardCompetitionCertificates = { ...summary, year: 2030, levels: [{ level: "一等奖", certificateCount: 200 }],
  awards: [{ id: competitionId, userName: "合成上传者", memberNames: ["合成成员甲", "合成成员乙"], competitionTitle: "历史名称", awardLevel: "一等奖", level: "一等奖", imageUrl: "/synthetic.png" }],
  page: { limit: 24, nextCursor: "next", previousCursor: "previous" } };
function evaluate(file: string, dependencies: Record<string, unknown>) {
  const sandboxModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, { module: sandboxModule, exports: sandboxModule.exports, URLSearchParams, Map, Set, Number, Error,
    require: (name: string) => name in dependencies ? dependencies[name] : require(name) });
  return sandboxModule.exports;
}
const link = ({ children, href }: { children: React.ReactNode; href: string; prefetch?: boolean }) => React.createElement("a", { href }, children);
const Gallery = (evaluate("src/components/marketing/awards-gallery.tsx", {
  "next/link": link,
  "framer-motion": { useReducedMotion: () => true, motion: { article: ({ children, className }: { children: React.ReactNode; className: string }) => React.createElement("article", { className }, children) } },
  "@/components/shared/lazy-fill-image": { LazyFillImage: ({ alt }: { alt: string }) => React.createElement("img", { alt }) },
  "@/lib/contracts/award-gallery": contracts, "@/lib/award-gallery": { galleryHref },
}) as typeof import("../src/components/marketing/awards-gallery")).AwardsGallery;

test("year links are canonical and cursor state is URL encoded", () => {
  assert.equal(galleryHref({}), "/awards");
  assert.equal(galleryHref({ year: 2030 }), "/awards/year/2030");
  assert.equal(galleryHref({ year: 2030, competition: competitionId, cursor: "a+b/=" }), `/awards/year/2030/${competitionId}?cursor=a%2Bb%2F%3D`);
  assert.throws(() => galleryHref({ competition: competitionId }));
});
test("public schemas strip private fields and reject oversized certificate pages", () => {
  const parsed = awardCompetitionCertificatesSchema.parse({ ...page, email: "private-marker", awards: [{ ...page.awards[0], studentNo: "private-marker" }] });
  assert.doesNotMatch(JSON.stringify(parsed), /private-marker/);
  assert.throws(() => awardCompetitionCertificatesSchema.parse({ ...page, awards: Array(25).fill(page.awards[0]) }));
  const a = awardYearSummariesSchema.parse({ totals: { yearCount: 0, competitionCount: 0, certificateCount: 0 }, years: [], awards: [page.awards[0]] });
  assert.ok(!("awards" in a));
});
test("A/B render aggregates without certificate images or selection instructions", () => {
  const overview = renderToStaticMarkup(React.createElement(Gallery, { view: "overview", data: { totals: { yearCount: 1, competitionCount: 1, certificateCount: 200 }, years: [{ year: 2030, competitionCount: 1, certificateCount: 200, competitions: [summary] }] } }));
  const year = renderToStaticMarkup(React.createElement(Gallery, { view: "year", data: { year: 2030, competitionCount: 1, certificateCount: 200, competitions: [{ ...summary, levels: page.levels }] } }));
  for (const html of [overview, year]) { assert.doesNotMatch(html, /<img|选择年份后查看|选择比赛后查看/); assert.match(html, /当前所在/); }
  assert.match(year, /2030年获奖比赛/); assert.match(year, /aria-current="page"/);
});
test("C renders full-event totals, current-page counts, verified members and reversible links", () => {
  const html = renderToStaticMarkup(React.createElement(Gallery, { view: "competition", data: page }));
  assert.match(html, /200份/); assert.match(html, /本页1份/);
  assert.match(html, /合成成员甲、合成成员乙/); assert.doesNotMatch(html, />合成上传者</);
  assert.match(html, /cursor=previous/); assert.match(html, /cursor=next/); assert.match(html, /年度总览/);
  assert.match(html, new RegExp(`/awards/${competitionId}`));
});
test("new public server reads remain precise and are not browser capabilities", () => {
  for (const path of ["/api/awards/years", "/api/awards/years/2030", `/api/awards/years/2030/${competitionId}?cursor=x`]) {
    assert.equal(permittedPublicServerRead(path), true);
    assert.equal(permittedBrowserRequest(new Request("http://localhost:3000" + path), { api: new URL("http://localhost:3001"), web: new URL("http://localhost:3000"), business: false, serviceToken: "a".repeat(64), clientIpHeader: undefined }), false);
  }
  for (const path of ["/api/awards/years/2030/private", `/api/awards/years/2030/${competitionId}/members`, "/api/awards/years/no-year"]) assert.equal(permittedPublicServerRead(path), false);
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

