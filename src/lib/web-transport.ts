// Transport policy only. Identity, authorization and transactions remain in the API.
export function getTransportConfig() {
  const api = new URL(process.env.API_ORIGIN || "http://127.0.0.1:3001");
  const web = new URL(process.env.WEB_TRUSTED_ORIGIN || "http://localhost:3000");
  if ([api, web].some(url => !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash)) throw new Error("Invalid transport origin");
  const business = process.env.WEB_RELEASE_MODE === "trusted";
  if (business && (!process.env.API_ORIGIN || !process.env.WEB_TRUSTED_ORIGIN)) throw new Error("Trusted release requires explicit origins");
  const clientIpHeader = process.env.WEB_CLIENT_IP_HEADER;
  if (clientIpHeader && !["x-forwarded-for", "x-real-ip", "cf-connecting-ip"].includes(clientIpHeader)) throw new Error("Invalid client IP header");
  if (business && process.env.NODE_ENV === "production" && !clientIpHeader) throw new Error("Trusted production requires a verified ingress client IP header");
  return { api, web, business, clientIpHeader };
}
export type TransportConfig = ReturnType<typeof getTransportConfig>;
export function isPublicRead(pathname: string) {
  const url = new URL(pathname, "http://web.invalid");
  const path = url.pathname;
  if (path === "/api/portal/assets") return true; // API checks canonical key, live references and version.
  if (path === "/api/uploads") return url.searchParams.size === 1 && /^uploads\/(?:public\/)?(?:award|club|competition|notice)\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(url.searchParams.get("key") ?? "");
  return path === "/api/competitions" || path === "/api/homepage" || path === "/api/hall-of-fame" || path === "/api/awards" || path === "/api/notices/published" ||
    /^\/api\/portal\/competitions\/[^/]+$/.test(path) ||
    /^\/api\/competitions\/[^/]+\/(showcase|official-link)$/.test(path) ||
    /^\/api\/awards\/[^/]+$/.test(path) ||
    /^\/api\/profiles\/[^/]+(?:\/experiences\/[^/]+)?$/.test(path) ||
    /^\/api\/clubs\/[^/]+(?:\/contents(?:\/[^/]+)?)?$/.test(path) ||
    /^\/api\/questions(?:\/[^/]+)?$/.test(path);
}
const forwarded = ["accept", "accept-language", "content-type", "origin", "referer", "user-agent", "range", "if-range", "last-event-id", "x-csrf-token", "x-auth-return-redirect"];
export function forwardedHeaders(incoming: Headers, config: TransportConfig) {
  const outgoing = new Headers();
  for (const name of forwarded) { const value = incoming.get(name); if (value) outgoing.set(name, value); }
  if (config.clientIpHeader) {
    const raw = incoming.get(config.clientIpHeader)?.split(",")[0]?.trim();
    if (raw) outgoing.set("x-forwarded-for", raw);
  }
  // Authority comes from deployment configuration, never browser-controlled forwarded headers.
  outgoing.set("x-forwarded-host", config.web.host);
  outgoing.set("x-forwarded-proto", config.web.protocol.slice(0, -1));
  if (config.business && incoming.get("cookie")) outgoing.set("cookie", incoming.get("cookie")!);
  return outgoing;
}
export function permittedBrowserRequest(request: Request, config: TransportConfig) {
  const url = new URL(request.url);
  const path = url.pathname + url.search;
  if (!config.business) return ["GET", "HEAD"].includes(request.method) && isPublicRead(path);
  // Host is checked against the canonical release. Proxy header spoofing cannot select a different origin.
  if (request.headers.get("host") !== config.web.host) return false;
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (origin) return origin === config.web.origin;
  try { return new URL(request.headers.get("referer") || "").origin === config.web.origin; } catch { return false; }
}
