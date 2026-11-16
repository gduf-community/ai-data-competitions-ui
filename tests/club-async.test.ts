import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Execute the shipped handlers with deferred transport. React/DOM/IME are separate checks.
function handler(file: string, name: string, context: Record<string, unknown>) {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let declaration: ts.FunctionDeclaration | undefined;
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) declaration = node;
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(declaration, `Missing shipped handler ${name}`);
  return vm.runInNewContext(ts.transpileModule(`(${declaration.getText(sf)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, { Error, JSON, AbortController, crypto: { randomUUID: () => "command-id" }, ...context });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const editorFile = "src/components/clubs-admin/club-content-editor.tsx";
const values = {
  contentType: "announcement", title: "合成标题", content: "<p>保留正文</p>",
  coverImage: "/api/uploads?key=uploads/club/synthetic/cover.png",
  recruitmentStartAt: "", recruitmentEndAt: "", registrationUrl: "",
  eventStartAt: "", eventEndAt: "", eventLocation: "",
};
const response = (body: unknown, status = 200) => ({ ok: status < 400, status, json: async () => body });

function editorContext(transport: (url: string, init: RequestInit) => Promise<unknown>) {
  const errors: Array<{ field: string; message: string }> = [];
  const navigations: string[] = [];
  let currentValues = { ...values };
  const context = {
    coverUploading: false, submitting: false, clubId: "synthetic", mode: "create",
    savedRef: { current: { id: undefined as string | undefined, revision: undefined as number | undefined } },
    commandRef: { current: null }, pendingPublishRef: { current: null },
    submittingRef: { current: false }, coverUploadingRef: { current: false }, mountedRef: { current: true },
    baselineRef: { current: { ...values } }, creationPayloadRef: { current: null },
    conflictRef: { current: false }, latestContent: null,
    form: {
      setError(field: string, error: { message: string }) { errors.push({ field, message: error.message }); },
      clearErrors() {}, getValues() { return currentValues; },
      setValue(field: keyof typeof values, value: string) { currentValues = { ...currentValues, [field]: value }; },
    },
    setSubmitting() {}, setVersionConflict() {}, setLatestContent() {}, setConflictLoading() {}, setSavedStatus() {},
    document: { getElementById: () => null }, toast: { success() {}, error() {} },
    router: { push(url: string) { navigations.push(url); }, refresh() {} },
    fetchWithCsrf: transport, confirmI18n: () => true,
  };
  return { context, errors, navigations, getValues: () => currentValues };
}

function saveHandler(context: Record<string, unknown>) {
  return handler(editorFile, "save", { ...context, buildPayload: handler(editorFile, "buildPayload", {}) });
}

test("club saves take one synchronous lock before any response or rerender", async () => {
  const firstResponse = deferred<unknown>();
  const calls: string[] = [];
  const h = editorContext(async url => { calls.push(url); return firstResponse.promise; });
  const save = saveHandler(h.context);
  const first = save(values, false);
  const second = save(values, false);
  assert.equal(calls.length, 1, "two clicks in one render must not issue two writes");
  firstResponse.resolve(response({ data: { id: "saved", revision: 1 } }));
  await Promise.all([first, second]);
});

test("club list actions share a synchronous lock and release it after failure", async () => {
  const firstResponse = deferred<void>();
  let calls = 0;
  const action = handler("src/components/clubs-admin/club-content-manage-list.tsx", "handleAction", {
    loading: null, loadingRef: { current: false }, mountedRef: { current: true },
    clubId: "synthetic", contents: [{ id: "one", revision: 1 }, { id: "two", revision: 2 }],
    setLoading() {}, confirmI18n: () => true,
    requestJSON() { calls++; return calls === 1 ? firstResponse.promise : Promise.resolve(); },
    toast: { success() {}, error() {} }, router: { refresh() {} },
  });
  const first = action("one", "publish");
  const second = action("two", "publish");
  assert.equal(calls, 1, "a second row must not bypass the same-render lock");
  firstResponse.resolve();
  await Promise.all([first, second]);
  await action("two", "publish");
  assert.equal(calls, 2);
});

test("a save response after unmount cannot trigger publish or navigation", async () => {
  const firstResponse = deferred<unknown>();
  const calls: string[] = [];
  const h = editorContext(async url => { calls.push(url); return firstResponse.promise; });
  const save = saveHandler(h.context);
  const first = save(values, true);
  h.context.mountedRef.current = false;
  firstResponse.resolve(response({ data: { id: "saved", revision: 1 } }));
  await first;
  assert.deepEqual(calls, ["/api/admin/clubs/synthetic/contents"]);
  assert.deepEqual(h.navigations, []);
});

test("a later saved payload invalidates the failed-publish shortcut", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  let revision = 0;
  let failPublish = true;
  const h = editorContext(async (url, init) => {
    calls.push({ url, body: JSON.parse(init.body as string) });
    if (url.endsWith("/publish")) {
      if (failPublish) { failPublish = false; return response({ message: "合成发布失败" }, 503); }
      return response({ data: { id: "saved", revision: ++revision } });
    }
    return response({ data: { id: "saved", revision: ++revision } });
  });
  const save = saveHandler(h.context);
  await save(values, true);
  await save({ ...values, content: "<p>第二稿</p>" }, false);
  await save(values, true);
  const writes = calls.filter(call => !call.url.endsWith("/publish"));
  assert.equal(writes.length, 3, "restoring the first draft still requires saving it after a different draft was saved");
  assert.equal(writes.at(-1)?.body.content, values.content);
});

test("a version conflict retains input and blocks blind retries until latest content is reviewed", async () => {
  let calls = 0;
  const h = editorContext(async () => { calls++; return response({ code: "VERSION_CONFLICT", message: "冲突" }, 409); });
  h.context.savedRef.current = { id: "saved", revision: 1 };
  const save = saveHandler(h.context);
  await save(values, false);
  await save(values, false);
  assert.equal(calls, 1, "a stale revision must not be sent repeatedly without recovery");
  assert.equal(h.getValues().content, values.content);
  assert.ok(h.errors.some(error => error.field === "root"));
});
