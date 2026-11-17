// Execute shipped pages/effects with isolated HTTP and visual dependencies.
// This checks public output and async ordering, not a real browser lifecycle.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
function evaluate(file, dependencies, globals = {}) {
  const sandbox = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(new URL("../" + file, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { module: sandbox, exports: sandbox.exports, ...globals,
    require: name => name in dependencies ? dependencies[name] : require(name) });
  return sandbox.exports;
}
const turn = () => new Promise(resolve => setImmediate(resolve));
const block = ({ children }) => React.createElement("section", null, children);
const empty = () => null;
const notice = { id: "notice-1", title: "公开通知", content: "<p>公开正文</p>", priority: "normal", deliveryScope: "global", competitionId: "competition-1" };
function notifications(session, list = async () => [notice]) {
  return evaluate("src/app/notifications/page.tsx", {
    "lucide-react": { Bell: empty, Megaphone: empty },
    "@/components/marketing/portal-navbar": { PortalNavbar: empty },
    "@/components/marketing/portal-footer": { PortalFooter: empty },
    "@/components/marketing/section": { Section: block },
    "@/components/notifications/notifications-read-sync": { NotificationsReadSync: empty,
      NoticeCompetitionLink: ({ noticeId }) => React.createElement("a", { href: `/api/notices/${noticeId}/open` }, "查看关联比赛") },
    "@/components/shared/rich-text-content": { RichTextContent: ({ html }) => React.createElement("div", { dangerouslySetInnerHTML: { __html: html } }) },
    "@/components/ui/card": { Card: block, CardContent: block },
    "@/lib/web-session": { getOptionalWebSession: session },
    "@/lib/web-data": { listPublishedNotices: list },
    "@/lib/notice-format": { formatNoticeDate: () => "2026-11-16" },
  }).default;
}

test("public notifications render the same body without waiting for optional identity", async () => {
  let expected;
  for (const identity of [async () => null, () => new Promise(() => {}), async () => { throw Error("session unavailable"); }]) {
    const Page = notifications(identity, async limit => { assert.equal(limit, 100); return [notice]; });
    const outcome = await Promise.race([Page().then(tree => ({ tree })), turn().then(() => null)]);
    assert.ok(outcome, "optional session must not hold the public page pending");
    const html = renderToStaticMarkup(outcome.tree);
    assert.match(html, /通知中心/); assert.match(html, /公开正文/);
    assert.match(html, /\/api\/notices\/notice-1\/open/);
    if (expected === undefined) expected = html;
    else assert.equal(html, expected);
  }
});

test("required public notice failures still reach the page error boundary", async () => {
  const Page = notifications(async () => null, async () => { throw Error("notices unavailable"); });
  await assert.rejects(Page(), /notices unavailable/);
});

function readSync(session, props, mark) {
  const writes = [];
  let effect, sessionReads = 0;
  const { NotificationsReadSync } = evaluate("src/components/notifications/notifications-read-sync.tsx", {
    react: { useEffect: callback => { effect = callback; } },
    "@/lib/auth/client-session": { fetchClientSessionUser: () => { sessionReads++; return session(); } },
    "@/lib/notice-read-state": { markNoticesRead: mark ?? ((...args) => writes.push(args)) },
    "@/lib/http-client": { requestJSON: () => assert.fail("read sync must use its existing read-state helper") },
  });
  NotificationsReadSync(props);
  const cleanup = effect();
  return { writes, cleanup, sessionReads: () => sessionReads };
}

test("notification enhancement resolves identity on the client and skips anonymous or unavailable sessions", async () => {
  for (const [session, expected] of [
    [async () => ({ id: "user-1" }), [[ ["notice-1"], "user-1" ]]],
    [async () => null, []],
    [async () => { throw Error("session unavailable"); }, []],
  ]) {
    const sync = readSync(session, { noticeIds: ["notice-1"] });
    await turn();
    assert.equal(sync.sessionReads(), 1);
    assert.equal(JSON.stringify(sync.writes), JSON.stringify(expected));
    sync.cleanup?.();
  }
  for (const userId of [null, "explicit-user"]) {
    const sync = readSync(() => assert.fail("explicit identity must not be fetched again"), { noticeIds: ["notice-1"], userId });
    await turn();
    assert.equal(sync.sessionReads(), 0);
    assert.equal(JSON.stringify(sync.writes), JSON.stringify(userId ? [[ ["notice-1"], userId ]] : []));
    sync.cleanup?.();
  }
});

test("an unmounted notification enhancement cannot mark notices for a late session", async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const sync = readSync(() => pending, { noticeIds: ["notice-1"] });
  sync.cleanup?.();
  resolve({ id: "old-user" });
  await turn();
  assert.deepEqual(sync.writes, []);
});

test("client notification enhancement preserves user-scoped storage and the read POST", async () => {
  const storage = new Map(), requests = [];
  const { markNoticesRead } = evaluate("src/lib/notice-read-state.ts", {
    "@/lib/http-client": { requestJSON: async (...args) => { requests.push(args); } },
    "@/lib/safe-storage": { getSafeStorageItem: key => storage.get(key) ?? null,
      setSafeStorageItem: (key, value) => { storage.set(key, value); return true; } },
  }, { window: { dispatchEvent() {} }, Event });
  const sync = readSync(async () => ({ id: "user-1" }), { noticeIds: ["notice-1"] }, markNoticesRead);
  await turn();
  assert.equal(storage.get("read_notice_ids:user-1"), '["notice-1"]');
  assert.equal(storage.has("read_notice_ids"), false);
  assert.equal(JSON.stringify(requests), JSON.stringify([["/api/me/notices/read", { method: "POST", json: { noticeIds: ["notice-1"] }, keepalive: true }]]));
  sync.cleanup?.();
});

test("late server read snapshots cannot undo local reads or cross user boundaries", () => {
  const storage = new Map(), requests = [];
  const state = evaluate("src/lib/notice-read-state.ts", {
    "@/lib/http-client": { requestJSON: async (...args) => { requests.push(args); } },
    "@/lib/safe-storage": { getSafeStorageItem: key => storage.get(key) ?? null,
      setSafeStorageItem: (key, value) => { storage.set(key, value); return true; } },
  }, { window: { dispatchEvent() {} }, Event });
  state.markNoticesRead(["local-read"], "user-a");
  state.mergeReadNoticeIdsFromServer([], "user-a");
  assert.equal(storage.get("read_notice_ids:user-a"), '["local-read"]');
  state.mergeReadNoticeIdsFromServer(["server-read", "server-read"], "user-a");
  assert.equal(storage.get("read_notice_ids:user-a"), '["local-read","server-read"]');
  state.mergeReadNoticeIdsFromServer(["other-user-read"], "user-b");
  assert.equal(storage.get("read_notice_ids:user-b"), '["other-user-read"]');
  assert.equal(storage.get("read_notice_ids:user-a"), '["local-read","server-read"]');
  state.mergeReadNoticeIdsFromServer(["anonymous"], null);
  assert.equal(storage.has("read_notice_ids"), false);
  assert.equal(requests.length, 1, "merging server state must not replay read writes");
});
