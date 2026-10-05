"use client";

import { fetchWithCsrf } from "@/lib/security/csrf-client";

export class HttpRequestError extends Error {
  constructor(message: string, public readonly status: number, public readonly payload?: unknown) {
    super(message);
    this.name = "HttpRequestError";
  }
}

export function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

type RequestOptions = RequestInit & { json?: unknown };
export function requestJSON<T>(input: RequestInfo | URL, options?: RequestOptions & { expect?: "json" }): Promise<T>;
export function requestJSON(input: RequestInfo | URL, options: RequestOptions & { expect: "empty" }): Promise<void>;
export async function requestJSON<T>(input: RequestInfo | URL, options: RequestOptions & { expect?: "json" | "empty" } = {}): Promise<T | void> {
  const { json, expect = "json", ...init } = options;
  if ("json" in options) {
    if (init.body != null) throw new TypeError("json 与 body 不能同时使用");
    const headers = new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined));
    if (!headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    init.headers = headers;
    init.body = JSON.stringify(json);
  }
  const response = await fetchWithCsrf(input, init);
  const text = await response.text();
  const signal = init.signal ?? (input instanceof Request ? input.signal : undefined);
  // Safari 15 supports AbortSignal but lacks throwIfAborted (and early versions lack reason).
  if (signal?.aborted) throw signal.reason ?? new DOMException("请求已取消", "AbortError");
  let payload: unknown;
  try { payload = text.trim() ? JSON.parse(text) : undefined; }
  catch {
    throw new HttpRequestError(response.ok ? "服务器返回了无效 JSON" : `请求失败（HTTP ${response.status}）`, response.status);
  }
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
      ? payload.message : `请求失败（HTTP ${response.status}）`;
    throw new HttpRequestError(message, response.status, payload);
  }
  if (expect === "empty") return;
  if (payload === undefined) throw new HttpRequestError("服务器返回了空响应", response.status);
  return payload as T;
}
