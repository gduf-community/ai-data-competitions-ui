import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { HttpRequestError } from "@/lib/http-client";

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

function mountLifecycle(file: string, context: Record<string, unknown>) {
  const sf = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let effect: ts.CallExpression | undefined;
  function visit(node: ts.Node) {
    if (!effect && ts.isCallExpression(node) && node.expression.getText(sf) === "useLayoutEffect") effect = node;
    ts.forEachChild(node, visit);
  }
  visit(sf);
  assert.ok(effect, "The component must register lifecycle cleanup");
  const setup = vm.runInNewContext(ts.transpileModule(`(${effect.arguments[0].getText(sf)})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  const cleanup = setup();
  assert.equal(typeof cleanup, "function");
  return cleanup;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
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
    baselineRef: { current: { ...values } },
    conflictRef: { current: false }, latestContent: null,
    conflictRequestRef: { current: null as AbortController | null }, conflictLoading: false,
    form: {
      setError(field: string, error: { message: string }) { errors.push({ field, message: error.message }); },
      clearErrors() {}, getValues() { return currentValues; },
      setValue(field: keyof typeof values, value: string) { currentValues = { ...currentValues, [field]: value }; },
    },
    setSubmitting() {}, setVersionConflict() {}, setLatestContent() {}, setConflictLoading() {}, setSavedStatus() {}, setEditorVersion() {}, setHasSavedContent() {},
    document: { getElementById: () => null }, toast: { success() {}, error() {} },
    router: { push(url: string) { navigations.push(url); }, refresh() {} },
    fetchWithCsrf: transport, confirmI18n: () => true,
  };
  return { context, errors, navigations, getValues: () => currentValues };
}

function saveHandler(context: Record<string, unknown>) {
  return handler(editorFile, "save", { ...context, buildPayload: handler(editorFile, "buildPayload", {
    fromDatetimeLocalValue: handler(editorFile, "fromDatetimeLocalValue", {}),
  }) });
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

test("a cover upload blocks saving synchronously before the parent rerenders", async () => {
  let calls = 0;
  const h = editorContext(async () => { calls++; return response({}); });
  h.context.coverUploadingRef.current = true;
  await saveHandler(h.context)(values, true);
  assert.equal(calls, 0);
});

test("club list actions share a synchronous lock and release it after failure", async () => {
  const firstResponse = deferred<void>();
  let calls = 0;
  const action = handler("src/components/clubs-admin/club-content-manage-list.tsx", "handleAction", {
    loading: null, loadingRef: { current: false }, mountedRef: { current: true },
    clubId: "synthetic", contents: [{ id: "one", revision: 1 }, { id: "two", revision: 2 }],
    setLoading() {}, confirmI18n: () => true,
    requestJSON() { calls++; return calls === 1 ? firstResponse.promise : Promise.resolve(); },
    toast: { success() {}, error() {} }, router: { refresh() {} }, HttpRequestError,
  });
  const first = action("one", "publish");
  const second = action("two", "publish");
  assert.equal(calls, 1, "a second row must not bypass the same-render lock");
  firstResponse.reject(new Error("合成首次失败"));
  await Promise.all([first, second]);
  await action("two", "publish");
  assert.equal(calls, 2);
});

test("a save response after unmount cannot trigger publish or navigation", async () => {
  const firstResponse = deferred<unknown>();
  const calls: string[] = [];
  const h = editorContext(async url => { calls.push(url); return firstResponse.promise; });
  const save = saveHandler(h.context);
  const unmount = mountLifecycle(editorFile, h.context);
  const first = save(values, true);
  unmount();
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

test("reviewing the latest club content rebases untouched fields and preserves local changes", async () => {
  let body: Record<string, unknown> | undefined;
  const h = editorContext(async (_url, init) => {
    body = JSON.parse(init.body as string);
    return response({ data: { id: "saved", revision: 5 } });
  });
  h.context.savedRef.current = { id: "saved", revision: 1 };
  h.context.form.setValue("title", "我的标题");
  h.context.conflictRef.current = true;
  const latestContent = { revision: 4, status: "draft", values: { ...values, title: "另一人的标题", content: "<p>他人的新正文</p>" } };
  const accept = handler(editorFile, "acceptLatestContent", { ...h.context, latestContent });
  accept();
  assert.equal(h.getValues().title, "我的标题", "a locally changed field must survive explicit conflict review");
  assert.equal(h.getValues().content, latestContent.values.content, "untouched fields must retain concurrent edits");
  assert.equal(h.context.savedRef.current.revision, 4);
  assert.equal(h.context.conflictRef.current, false);
  await saveHandler(h.context)(h.getValues(), false);
  assert.equal(body?.expectedRevision, 4);
  assert.equal(body?.title, "我的标题");
  assert.equal("content" in body!, false, "an untouched server field must not be sent back as a local edit");
});

test("canceling conflict review retains the previous revision and every local field", () => {
  const h = editorContext(async () => { throw new Error("No write expected"); });
  h.context.savedRef.current = { id: "saved", revision: 1 };
  h.context.conflictRef.current = true;
  const accept = handler(editorFile, "acceptLatestContent", {
    ...h.context, confirmI18n: () => false,
    latestContent: { revision: 4, status: "draft", values: { ...values, content: "另一份正文" } },
  });
  accept();
  assert.equal(h.getValues().content, values.content);
  assert.equal(h.context.savedRef.current.revision, 1);
  assert.equal(h.context.conflictRef.current, true);
});

test("a failed latest-content read can retry without changing local input or revision", async () => {
  let calls = 0;
  let latest: unknown;
  const h = editorContext(async () => ++calls === 1 ? response({ message: "合成读取失败" }, 503) : response({ canEdit: true, data: { ...values, revision: 4, status: "draft" } }));
  h.context.savedRef.current = { id: "saved", revision: 1 };
  const load = handler(editorFile, "loadLatestContent", {
    ...h.context, setLatestContent(value: unknown) { latest = value; },
    toDatetimeLocalValue: handler(editorFile, "toDatetimeLocalValue", {}),
  });
  await load();
  assert.equal(latest, null);
  assert.equal(h.context.savedRef.current.revision, 1);
  assert.equal(h.getValues().content, values.content);
  assert.equal(h.context.conflictRequestRef.current, null);
  await load();
  assert.equal((latest as { revision: number }).revision, 4);
  assert.equal(h.context.savedRef.current.revision, 1, "reading is not permission to update the baseline");
  assert.equal(h.getValues().content, values.content);
});

test("a creation replay conflict recovers the original command ID instead of creating another draft", async () => {
  let calls = 0;
  const h = editorContext(async () => { calls++; return response({ code: "VERSION_CONFLICT", message: "首次创建后的内容已被修改" }, 409); });
  const save = saveHandler(h.context);
  await save(values, true);
  assert.equal(h.context.savedRef.current.id, "command-id");
  assert.equal(h.context.savedRef.current.revision, undefined);
  assert.equal(h.context.conflictRef.current, true);
  await save(values, true);
  assert.equal(calls, 1);
  assert.equal(h.getValues().content, values.content);
});

test("editing a title sends no unchanged content, cover or minute-rounded event dates", async () => {
  let body: Record<string, unknown> | undefined;
  const h = editorContext(async (_url, init) => {
    body = JSON.parse(init.body as string);
    return response({ data: { id: "saved", revision: 2 } });
  });
  h.context.savedRef.current = { id: "saved", revision: 1 };
  const baseline = { ...values, contentType: "activity", eventStartAt: "2026-11-16T10:30" };
  h.context.baselineRef.current = baseline;
  await saveHandler(h.context)({ ...baseline, title: "只改标题" }, false);
  assert.deepEqual(Object.keys(body!).sort(), ["expectedRevision", "title"]);
  assert.equal(body?.title, "只改标题");
});

test("a latest-content response after unmount leaves the editor and its errors untouched", async () => {
  const pending = deferred<unknown>();
  let updates = 0;
  const h = editorContext(async () => pending.promise);
  h.context.savedRef.current = { id: "saved", revision: 1 };
  const load = handler(editorFile, "loadLatestContent", {
    ...h.context, setLatestContent(value: unknown) { if (value) updates++; },
    toDatetimeLocalValue: handler(editorFile, "toDatetimeLocalValue", {}),
  });
  const unmount = mountLifecycle(editorFile, h.context);
  const request = load();
  const signal = h.context.conflictRequestRef.current?.signal;
  unmount();
  assert.equal(signal?.aborted, true);
  pending.resolve(response({ canEdit: true, data: { ...values, revision: 4, status: "draft" } }));
  await request;
  assert.equal(updates, 0);
  assert.equal(h.context.savedRef.current.revision, 1);
  assert.deepEqual(h.errors, []);
});

test("a replacement cover upload aborts the old request and only the newest result changes the cover", async () => {
  const pending = [deferred<unknown>(), deferred<unknown>()];
  const requests: AbortSignal[] = [];
  const covers: string[] = [];
  const upload = handler("src/components/clubs-admin/club-cover-upload-field.tsx", "handleFileChange", {
    FormData, ALLOWED_TYPES: ["image/png"], MAX_SIZE_BYTES: 5 * 1024 * 1024,
    clubId: "synthetic", requestRef: { current: 0 }, uploadAbortRef: { current: null },
    inputRef: { current: { value: "" } }, setUploading() {}, onUploadingChange() {},
    toast: { error() {}, success() {} }, onChange(value: string) { covers.push(value); },
    fetchWithCsrf(_url: string, init: RequestInit) { requests.push(init.signal as AbortSignal); return pending[requests.length - 1].promise; },
  });
  const event = { target: { files: [new File(["synthetic"], "cover.png", { type: "image/png" })] } };
  const first = upload(event);
  const second = upload(event);
  assert.equal(requests[0].aborted, true);
  assert.equal(requests[1].aborted, false);
  pending[1].resolve(response({ files: [{ publicUrl: "latest-cover" }] }));
  await second;
  pending[0].resolve(response({ files: [{ publicUrl: "old-cover" }] }));
  await first;
  assert.deepEqual(covers, ["latest-cover"]);
});

test("unmounting a cover field aborts upload and ignores its late result", async () => {
  const pending = deferred<unknown>();
  const covers: string[] = [];
  let signal: AbortSignal | undefined;
  const file = "src/components/clubs-admin/club-cover-upload-field.tsx";
  const context = {
    FormData, ALLOWED_TYPES: ["image/png"], MAX_SIZE_BYTES: 5 * 1024 * 1024,
    clubId: "synthetic", requestRef: { current: 0 }, uploadAbortRef: { current: null },
    inputRef: { current: { value: "" } }, setUploading() {}, onUploadingChange() {},
    toast: { error() {}, success() {} }, onChange(value: string) { covers.push(value); },
    fetchWithCsrf(_url: string, init: RequestInit) { signal = init.signal as AbortSignal; return pending.promise; },
  };
  const unmount = mountLifecycle(file, context);
  const upload = handler(file, "handleFileChange", context);
  const request = upload({ target: { files: [new File(["synthetic"], "cover.png", { type: "image/png" })] } });
  unmount();
  assert.equal(signal?.aborted, true);
  pending.resolve(response({ files: [{ publicUrl: "late-cover" }] }));
  await request;
  assert.deepEqual(covers, []);
});
