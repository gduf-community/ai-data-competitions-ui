import assert from "node:assert/strict";
import { test } from "node:test";
import { HttpRequestError, isAbortError, requestJSON } from "@/lib/http-client";
import { fetchClientSessionUser } from "@/lib/auth/client-session";

test("missing throwIfAborted preserves success and late cancellation on older browsers", async t => {
  const previous = Object.getOwnPropertyDescriptor(AbortSignal.prototype, "throwIfAborted");
  Object.defineProperty(AbortSignal.prototype, "throwIfAborted", { configurable: true, value: undefined });
  t.after(() => { if (previous) Object.defineProperty(AbortSignal.prototype, "throwIfAborted", previous); else Reflect.deleteProperty(AbortSignal.prototype, "throwIfAborted"); });
  const controller = new AbortController();
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ ok: true }));
  assert.deepEqual(await requestJSON("/api/items", { signal: controller.signal }), { ok: true });
  // Emulate Safari versions which also lack AbortSignal.reason.
  Object.defineProperty(controller.signal, "reason", { configurable: true, value: undefined });
  fetchMock.mock.mockImplementation(async () => { controller.abort(); return Response.json({ stale: true }); });
  await assert.rejects(requestJSON("/api/items", { signal: controller.signal }), isAbortError);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("JSON writes inject same-origin CSRF, preserve request options and execute once", async t => {
  for (const [name, value] of Object.entries({ window: { location: { href: "https://campus.test/admin", origin: "https://campus.test" } }, document: { cookie: "competition_csrf_token=local-token" } })) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    t.after(() => { if (previous) Object.defineProperty(globalThis, name, previous); else Reflect.deleteProperty(globalThis, name); });
  }
  const controller = new AbortController();
  const fetchMock = t.mock.method(globalThis, "fetch", async (_input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(init?.method, "POST");
    assert.equal(init?.signal, controller.signal);
    assert.equal(new Headers(init?.headers).get("x-csrf-token"), "local-token");
    assert.equal(new Headers(init?.headers).get("content-type"), "application/json");
    assert.equal(init?.body, '{"title":"保留输入"}');
    return Response.json({ id: "created" }, { status: 201 });
  });
  assert.deepEqual(await requestJSON("/api/items", { method: "POST", json: { title: "保留输入" }, signal: controller.signal }), { id: "created" });
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("HTTP errors preserve status/message without converting failures into empty data", async t => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ message: "状态已经改变", details: "conflict" }, { status: 409 }));
  await assert.rejects(requestJSON("/api/items", { method: "PATCH" }), error => error instanceof HttpRequestError && error.status === 409 && error.message === "状态已经改变");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("invalid and empty JSON are explicit errors; empty responses require explicit opt-in", async t => {
  const replies = [new Response("<html>failure</html>", { status: 502 }), new Response("broken"), new Response(null, { status: 204 }), new Response(null, { status: 204 })];
  t.mock.method(globalThis, "fetch", async () => replies.shift()!);
  await assert.rejects(requestJSON("/api/items"), error => error instanceof HttpRequestError && error.status === 502 && !error.message.includes("<html>"));
  await assert.rejects(requestJSON("/api/items"), /无效 JSON/);
  await assert.rejects(requestJSON("/api/items"), /空响应/);
  assert.equal(await requestJSON("/api/items", { method: "DELETE", expect: "empty" }), undefined);
});

test("late aborted responses are not delivered and write failures are never retried", async t => {
  const controller = new AbortController();
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { controller.abort(); return Response.json({ stale: true }); });
  await assert.rejects(requestJSON(new Request("https://campus.test/api/items", { signal: controller.signal })), isAbortError);
  assert.equal(fetchMock.mock.callCount(), 1);
  fetchMock.mock.mockImplementation(async () => { throw new TypeError("network unavailable"); });
  await assert.rejects(requestJSON("/api/items", { method: "POST", json: {} }), /network unavailable/);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("session absence and service failure remain distinguishable", async t => {
  const replies = [Response.json({ message: "Unauthorized" }, { status: 401 }), Response.json({ message: "Unavailable" }, { status: 503 })];
  t.mock.method(globalThis, "fetch", async () => replies.shift()!);
  assert.equal(await fetchClientSessionUser(), null);
  await assert.rejects(fetchClientSessionUser(), error => error instanceof HttpRequestError && error.status === 503);
});
