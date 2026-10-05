import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { getTransportConfig, forwardedHeaders } from "@/lib/web-transport";
import { CSRF_COOKIE_NAME } from "@/lib/security/csrf-shared";
export async function proxy(request: NextRequest) {
  const config = getTransportConfig();
  const path = request.nextUrl.pathname;
  if (!config.business && (/^\/(me|admin|sign-in|sign-up|forgot-password|reset-password)(?:\/|$)/.test(path) || /\/apply$/.test(path))) return new NextResponse("公开预览不接入真实身份。", {status: 503, headers: {"Cache-Control": "private, no-store, max-age=0"}});
  if (path === "/login" || path === "/register") {
    const response = NextResponse.redirect(new URL(path === "/login" ? "/sign-in" : "/sign-up", request.url));
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    if (config.business && !request.cookies.has(CSRF_COOKIE_NAME)) response.cookies.set(CSRF_COOKIE_NAME, randomBytes(32).toString("base64url"), {httpOnly: false, secure: config.web.protocol === "https:", sameSite: "strict", path: "/"});
    return response;
  }
  if (!path.startsWith("/api/") && !path.startsWith("/errors/")) {
    try {
      const gate = await fetch(new URL("/api/web/access?path=" + encodeURIComponent(path), config.api), {headers: forwardedHeaders(request.headers, config), cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(10_000)});
      if (gate.status === 403) { const denied = NextResponse.redirect(new URL("/errors/forbidden?mode=regional-policy", request.url)); denied.headers.set("Cache-Control", "private, no-store, max-age=0"); return denied; }
      if (!gate.ok) return new NextResponse("服务暂不可用，请稍后重试。",{status:503, headers:{"Cache-Control":"private, no-store, max-age=0"}});
    } catch { return new NextResponse("服务暂不可用，请稍后重试。",{status:503, headers:{"Cache-Control":"private, no-store, max-age=0"}}); }
  }
  const response = NextResponse.next();
  if (config.business && !path.startsWith("/api/") && !request.cookies.has(CSRF_COOKIE_NAME)) response.cookies.set(CSRF_COOKIE_NAME, randomBytes(32).toString("base64url"), {httpOnly: false, secure: config.web.protocol === "https:", sameSite: "strict", path: "/"});
  return response;
}
export const config = {matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.[^/]+$).*)"]};
