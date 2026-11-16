// Run shipped components/hooks with controlled effect cleanup and deferred HTTP.
// This verifies ordering and callbacks; Radix/React DOM and browser acceptance are separate.
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import * as contracts from "../src/lib/contracts/official-awards.ts";
import * as members from "../src/lib/official-awards/members.ts";

const require = createRequire(import.meta.url);
const turn = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

function mount(file, name, initialProps, dependencies = {}, globals = {}) {
  let cursor = 0, dirty = false, props = initialProps, tree;
  const slots = [], effects = [], layouts = [];
  const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial;
      return [slots[i], value => { slots[i] = typeof value === "function" ? value(slots[i]) : value; dirty = true; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(callback, deps) {
      const i = cursor++;
      if (same(slots[i]?.deps, deps)) return;
      effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; });
    },
    useLayoutEffect(callback, deps) {
      const i = cursor++;
      if (same(slots[i]?.deps, deps)) return;
      layouts.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: callback() }; });
    },
    useMemo(callback, deps) {
      const i = cursor++;
      if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: callback() };
      return slots[i].value;
    },
    useCallback(callback, deps) { return hooks.useMemo(() => callback, deps); },
  };
  const loaded = new Map();
  function evaluate(path) {
    if (loaded.has(path)) return loaded.get(path);
    const evaluated = { exports: {} };
    loaded.set(path, evaluated.exports);
    const code = ts.transpileModule(fs.readFileSync(new URL("../" + path, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(code, { module: evaluated, exports: evaluated.exports, Error, AbortController, ...globals, require: id => {
      if (id === "react") return hooks;
      if (id === "react/jsx-runtime") return { jsx: (type, props, key) => ({ type, props, key }), jsxs: (type, props, key) => ({ type, props, key }) };
      if (id in dependencies) return dependencies[id];
      if (id === "@/lib/contracts/official-awards") return contracts;
      if (id === "@/lib/official-awards/members") return members;
      if (id.startsWith("@/hooks/")) return evaluate("src/" + id.slice(2) + ".ts");
      if (id.startsWith("@/components/") || id === "lucide-react") return new Proxy({}, { get: (_, value) => String(value) });
      return require(id);
    } });
    return evaluated.exports;
  }
  const component = evaluate(file)[name];
  const draw = () => {
    cursor = 0;
    let value = Array.isArray(props) ? component(...props) : component(props);
    while (typeof value?.type === "function") value = value.type(value.props);
    while (layouts.length) layouts.shift()();
    return value;
  };
  return {
    render(next = props) {
      props = next;
      do {
        dirty = false; tree = draw();
        while (effects.length) effects.shift()();
      } while (dirty);
      return tree;
    },
    renderBeforeEffects(next) { props = next; return draw(); },
    unmount() { for (const slot of slots) slot?.cleanup?.(); },
  };
}
function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
function node(tree, predicate) {
  const value = nodes(tree).find(predicate); assert.ok(value, "expected rendered control"); return value;
}
const row = (awardId = "award-a", version = 1) => ({
  awardId, version, levelCode: "second", teamName: "原团队", subTrack: null,
  members: [{ memberId: "member-a", name: "甲", grade: null, college: null, major: null }], advisors: [],
});
function dialog(kind, transport) {
  let submitted = 0, conflicts = 0;
  const messages = [];
  const props = { award: row(), baseline: row(), waiting: false, conflict: false, conflictLost: false,
    onClose() {}, onSubmitted: () => submitted++, onConflict: () => conflicts++ };
  const ui = mount(`src/components/admin/official-awards/${kind}-dialog.tsx`,
    kind === "correction" ? "OfficialAwardCorrectionDialog" : "OfficialAwardVoidDialog", props, {
      "@/lib/i18n/toast": { toast: { error: message => messages.push(message), success: message => messages.push(message) } },
      "@/lib/security/csrf-client": { fetchWithCsrf: transport },
    });
  ui.render();
  node(ui.render(), n => n.props?.id === (kind === "correction" ? "reason" : "voidReason")).props.onChange({ target: { value: "核对官方原文" } });
  const submit = () => node(ui.render(), n => n.type === "Button" && n.props.loading !== undefined).props.onClick();
  return { ui, props, submit, messages, submitted: () => submitted, conflicts: () => conflicts };
}

for (const kind of ["correction", "void"]) {
  test(`${kind}: two callbacks before a render send only one command`, async () => {
    const pending = deferred(); let calls = 0;
    const d = dialog(kind, () => { calls++; return pending.promise; });
    const click = node(d.ui.render(), n => n.type === "Button" && n.props.loading !== undefined).props.onClick;
    click(); click();
    assert.equal(calls, 1);
    pending.resolve({ ok: true, status: 200 }); await turn();
    assert.equal(d.submitted(), 1);
  });

  test(`${kind}: a late command cannot close another record or report its conflict`, async () => {
    for (const status of [200, 409, 500]) {
      const pending = deferred();
      const d = dialog(kind, () => pending.promise);
      d.submit();
      // The next UI has committed, but passive effect cleanup has not run yet.
      d.ui.renderBeforeEffects({ ...d.props, award: row("award-b"), baseline: row("award-b") });
      pending.resolve({ ok: status === 200, status, json: async () => ({ message: "旧请求错误" }) });
      await turn();
      assert.equal(d.submitted(), 0);
      assert.equal(d.conflicts(), 0);
      assert.equal(d.messages.length, 0);
      assert.equal(node(d.ui.render(), n => n.type === "Button" && n.props.loading !== undefined).props.loading, false);
    }
  });

  test(`${kind}: failure and 409 preserve input and allow a deliberate retry`, async () => {
    let calls = 0;
    const d = dialog(kind, async () => ({ ok: false, status: ++calls === 1 ? 500 : 409, json: async () => ({ message: "请重试" }) }));
    d.submit(); await turn();
    assert.equal(node(d.ui.render(), n => n.props?.id === (kind === "correction" ? "reason" : "voidReason")).props.value, "核对官方原文");
    d.submit(); await turn();
    assert.equal(calls, 2); assert.equal(d.conflicts(), 1);
    d.ui.unmount();
  });

  test(`${kind}: unmount suppresses all late callbacks and notifications`, async () => {
    const pending = deferred();
    const d = dialog(kind, () => pending.promise);
    d.submit(); d.ui.unmount();
    pending.resolve({ ok: true, status: 200 }); await turn();
    assert.equal(d.submitted(), 0); assert.deepEqual(d.messages, []);
  });
}

test("list: refresh is pending in its first render, before the effect runs", async () => {
  const responses = [];
  const list = mount("src/hooks/use-official-award-list.ts", "useOfficialAwardList", ["a", "limit=20", "a-list", 0], {
    "@/lib/contracts/official-awards": { parseOfficialAwardList: value => value },
  }, {
    fetch: () => { const pending = deferred(); responses.push(pending); return pending.promise; },
  });
  list.render();
  responses[0].resolve({ ok: true, status: 200, json: async () => ({ competitionId: "a", items: [row()] }) });
  await turn();
  assert.equal(list.render().loading, false);
  assert.equal(list.renderBeforeEffects(["a", "limit=20", "a-list", 1]).loading, true);
  list.unmount();
});

test("list: switched queries ignore old success, error and finally even if abort is ignored", async () => {
  for (const status of [200, 403, 500]) {
  const requests = [];
  const list = mount("src/hooks/use-official-award-list.ts", "useOfficialAwardList", ["a", "q=old", "old", 0], {
    "@/lib/contracts/official-awards": { parseOfficialAwardList: value => value },
  }, {
    fetch: (_url, init) => { const pending = deferred(); requests.push({ ...pending, signal: init.signal }); return pending.promise; },
  });
  list.render();
  list.render(["b", "q=new", "new", 0]);
  assert.equal(requests[0].signal.aborted, true);
  requests[0].resolve({ ok: status === 200, status, json: async () => ({ competitionId: "a", items: [row()], message: "旧错误" }) });
  await turn();
  assert.equal(list.render().loading, true); assert.equal(list.render().data, null);
  requests[1].resolve({ ok: true, status: 200, json: async () => ({ competitionId: "b", items: [row("b")] }) });
  await turn();
  assert.equal(list.render().loading, false); assert.equal(list.render().data.competitionId, "b");
  list.unmount();
  }
});

test("correction: loading the latest values rebases subsequent edits and keeps the reason", async () => {
  const payloads = [];
  const d = dialog("correction", async (_url, init) => { payloads.push(JSON.parse(init.body)); return { ok: true, status: 200 }; });
  d.ui.render({ ...d.props, award: { ...row(), version: 2, teamName: "他人团队" }, conflict: true });
  node(d.ui.render(), n => n.type === "Button" && n.props.children === "载入最新值").props.onClick();
  node(d.ui.render(), n => n.props?.id === "teamName").props.onChange({ target: { value: "原团队" } });
  d.submit(); await turn();
  assert.equal(payloads[0].expectedVersion, 2);
  assert.equal(payloads[0].fields.teamName, "原团队");
  assert.equal(payloads[0].reason, "核对官方原文");
});

test("page: conflict waits for its own refresh; closing releases the wait and read failures retain the dialog", () => {
  let requestedRefresh = 0;
  let currentList = { loading: false, kind: "ok", data: { items: [row()] }, rows: [row()], settledRefreshKey: 0 };
  const page = mount("src/app/(dashboard)/admin/official-awards/competitions/[competitionId]/page.tsx", "default", {}, {
    "next/navigation": { useParams: () => ({ competitionId: "competition-a" }) },
    "@/hooks/use-official-award-query": { useOfficialAwardQuery: () => ({ filters: {}, query: "", identity: "a", filterQuery: "" }) },
    "@/hooks/use-official-award-export": { useOfficialAwardExport: () => ({ exporting: null }) },
    "@/hooks/use-official-award-list": { useOfficialAwardList: (_competition, _query, _identity, refreshKey) => { requestedRefresh = refreshKey; return currentList; } },
  });
  const correction = () => node(page.render(), n => n.type === "OfficialAwardCorrectionDialog");
  node(page.render(), n => n.type === "OfficialAwardTable").props.onCorrect(row());
  const oldConflictCallback = correction().props.onConflict;
  node(page.render(), n => n.type === "OfficialAwardTable").props.onRetry();
  oldConflictCallback();
  assert.equal(correction().props.waiting, true, "the previous list response is not a conflict refresh");
  assert.equal(requestedRefresh, 2, "conflict refresh must not reuse a captured generation");
  currentList = { loading: false, kind: "forbidden", data: null, rows: [], settledRefreshKey: 2 };
  assert.equal(correction().props.award.awardId, "award-a", "a failed read must not hide the user's form");
  assert.equal(correction().props.conflictLost, true);
  correction().props.onRetryConflict();
  assert.equal(correction().props.waiting, true);
  correction().props.onClose();
  currentList = { loading: false, kind: "ok", data: { items: [row("award-b")] }, rows: [row("award-b")], settledRefreshKey: 3 };
  node(page.render(), n => n.type === "OfficialAwardTable").props.onCorrect(row("award-b"));
  assert.equal(correction().props.waiting, false);
  assert.equal(correction().props.conflictLost, false);
  page.unmount();
});
