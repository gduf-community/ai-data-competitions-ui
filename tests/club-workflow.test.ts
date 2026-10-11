import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { sanitizeRichTextHtml } from "@/lib/security/html-sanitize";

// Execute shipped handlers with synthetic transport/DOM. Browser/real IME evidence is separate.
function source(file: string) { return ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX); }
function find(sf: ts.SourceFile, predicate: (node: ts.Node) => boolean) {
  let result: ts.Node | undefined;
  function visit(node: ts.Node) { if (predicate(node)) result = node; ts.forEachChild(node, visit); }
  visit(sf); assert.ok(result); return result;
}
function evaluate(code: string, context: Record<string, unknown>) { return vm.runInNewContext(ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText, { Error, JSON, crypto: { randomUUID: () => "synthetic-command" }, ...context }); }
const form = source("src/components/clubs-admin/club-content-editor.tsx");
const functionText = (name: string) => find(form, node => ts.isFunctionDeclaration(node) && node.name?.text === name).getText(form);
const values = { contentType: "announcement", title: "合成文章", content: "<p>正文</p>", coverImage: "/api/uploads?key=uploads/club/synthetic/cover.png" };

test("a failed publish retry preserves the saved draft and reuses its revision without duplicate creation", async () => {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  const savedRef = { current: { id: undefined as string | undefined, revision: undefined as number | undefined } };
  let failPublish = true;
  const save = evaluate(`(${functionText("save")})`, {
    coverUploading: false, submitting: false, clubId: "synthetic", mode: "create", savedRef,
    commandRef: { current: null }, pendingPublishRef: { current: null },
    buildPayload: evaluate(`(${functionText("buildPayload")})`, {}), setSubmitting() {},
    form: { setError() {} }, document: { getElementById: () => null }, toast: { success() {}, error() {} }, router: { push() {}, refresh() {} },
    fetchWithCsrf: async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string) });
      if (url.endsWith("/publish")) { const ok = !failPublish; failPublish = false; return { ok, json: async () => ok ? { data: { revision: 2 } } : { message: "合成发布响应丢失" } }; }
      return { ok: true, json: async () => ({ data: { id: "saved-id", revision: 1 } }) };
    },
  });
  await save(values, true); await save(values, true);
  assert.equal(calls.length, 3); assert.equal(calls.filter(call => !call.url.endsWith("/publish")).length, 1);
  assert.equal(savedRef.current.id, "saved-id");
  assert.equal(calls[1].body.expectedRevision, 1); assert.equal(calls[2].body.expectedRevision, 1);
});

test("cover upload in progress blocks both save and publish before transport", async () => {
  const save = evaluate(`(${functionText("save")})`, { coverUploading: true, submitting: false, fetchWithCsrf() { throw new Error("Transport must not run"); } });
  await save(values, false); await save(values, true);
});

const editor = source("src/components/forms/rich-text-editor.tsx");
const effect = find(editor, node => ts.isCallExpression(node) && node.expression.getText(editor) === "useEffect") as ts.CallExpression;
test("local editor echoes, composition and late external values preserve the existing DOM", () => {
  let writes = 0;
  const dom = { get innerHTML() { return "<div>合成&nbsp;  文本</div>"; }, set innerHTML(_value: string) { writes++; } };
  for (const state of [{ local: true, composing: false, dirty: true }, { local: false, composing: true, dirty: true }, { local: false, composing: false, dirty: true }]) {
    const sync = evaluate(`(${effect.arguments[0].getText(editor)})`, {
      value: state.local ? dom.innerHTML : "<p>外部晚到版本</p>", editorRef: { current: dom },
      lastSyncedValueRef: { current: dom.innerHTML }, isComposingRef: { current: state.composing }, dirtyRef: { current: state.dirty },
      normalizeHtml: sanitizeRichTextHtml, toast: { error() {} },
    });
    sync();
  }
  assert.equal(writes, 0);
});

test("plain-text paste preserves angle brackets as text", () => {
  const declaration = find(editor, node => ts.isVariableDeclaration(node) && node.name.getText(editor) === "insertSanitizedHtml") as ts.VariableDeclaration;
  let inserted = "";
  const paste = evaluate(`(${declaration.initializer!.getText(editor)})`, { editorRef: { current: {} }, normalizeHtml: sanitizeRichTextHtml, insertHtmlAtCursor(_dom: unknown, html: string) { inserted = html; }, commitEditor() {} });
  paste("", "<script>alert(1)</script> & <b>字面文本</b>");
  assert.ok(inserted.includes("&lt;script&gt;")); assert.ok(inserted.includes("&lt;b&gt;")); assert.ok(!inserted.includes("<script>"));
});
