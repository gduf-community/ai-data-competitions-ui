import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTransportConfig, forwardedHeaders, permittedPublicServerRead } from "@/lib/web-transport";

export class WebApiError extends Error {
  constructor(public status: number) { super("服务暂不可用，请稍后重试。"); }
  publicMessage = this.status === 429 ? "搜索过于频繁，请稍后重试。" : "服务暂不可用，请稍后重试。";
}
export async function readAPI<T>(pathname: string): Promise<T> {
  const config = getTransportConfig();
  if (!pathname.startsWith("/api/") || pathname.includes("\\")) throw new Error("Invalid API path");
  if (!config.business && !permittedPublicServerRead(pathname)) throw new WebApiError(503);
  const incoming = await headers();
  const response = await fetch(new URL(pathname, config.api), {
    headers: forwardedHeaders(incoming, config), cache: "no-store", redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const error = new WebApiError(response.status);
    if (pathname.startsWith("/api/competitions?") || pathname.startsWith("/api/questions?")) {
      const body = await response.json().catch(() => null) as { code?: string } | null;
      if (body?.code === "REGEX_CAPACITY_EXCEEDED") error.publicMessage = "正则搜索范围过大或服务繁忙，请缩小条件后重试。";
      if (body?.code === "REGEX_TIMEOUT") error.publicMessage = "正则搜索超时，请缩小条件后重试。";
      if (body?.code === "SEARCH_NOT_READY") error.publicMessage = "搜索数据正在准备，请稍后重试。";
    }
    throw error;
  }
  return response.json() as Promise<T>;
}
export async function readOptionalAPI<T>(pathname: string): Promise<T | null> {
  try { return await readAPI<T>(pathname); }
  catch (error) { if (error instanceof WebApiError && error.status === 404) return null; throw error; }
}
export async function requiredAPI<T>(pathname: string): Promise<T> {
  const value = await readOptionalAPI<T>(pathname);
  if (!value) notFound();
  return value;
}
