import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTransportConfig, forwardedHeaders, isPublicRead } from "@/lib/web-transport";

export class WebApiError extends Error {
  constructor(public status: number) { super("服务暂不可用，请稍后重试。"); }
}
export async function readAPI<T>(pathname: string): Promise<T> {
  const config = getTransportConfig();
  if (!pathname.startsWith("/api/") || pathname.includes("\\")) throw new Error("Invalid API path");
  if (!config.business && !isPublicRead(pathname)) throw new WebApiError(503);
  const incoming = await headers();
  const response = await fetch(new URL(pathname, config.api), {
    headers: forwardedHeaders(incoming, config), cache: "no-store", redirect: "manual",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new WebApiError(response.status);
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
