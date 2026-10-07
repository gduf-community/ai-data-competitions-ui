import { isIP } from "node:net";

// Transport policy only. Identity, authorization and transactions remain in the API.
export function getTransportConfig() {
  const api = new URL(process.env.API_ORIGIN || "http://127.0.0.1:3001");
  const web = new URL(process.env.WEB_TRUSTED_ORIGIN || "http://localhost:3000");
  if ([api, web].some(url => !["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash)) throw new Error("Invalid transport origin");
  const business = process.env.WEB_RELEASE_MODE === "trusted";
  const serviceToken = process.env.API_SERVICE_TOKEN;
  if (!serviceToken || !/^[a-f0-9]{64}$/.test(serviceToken)) throw new Error("API_SERVICE_TOKEN must be 64 lowercase hex characters");
  if (business && (!process.env.API_ORIGIN || !process.env.WEB_TRUSTED_ORIGIN)) throw new Error("Trusted release requires explicit origins");
  const clientIpHeader = process.env.WEB_CLIENT_IP_HEADER;
  if (clientIpHeader && !["x-forwarded-for", "x-real-ip", "cf-connecting-ip"].includes(clientIpHeader)) throw new Error("Invalid client IP header");
  if (business && process.env.NODE_ENV === "production" && !clientIpHeader) throw new Error("Trusted production requires a verified ingress client IP header");
  return { api, web, business, clientIpHeader, serviceToken };
}
export type TransportConfig = ReturnType<typeof getTransportConfig>;
export function permittedPublicServerRead(pathname: string) {
  const url = new URL(pathname, "http://web.invalid");
  const path = url.pathname;
  return path === "/api/competitions" || path === "/api/homepage" || path === "/api/hall-of-fame" || path === "/api/awards" || path === "/api/notices/published" ||
    /^\/api\/portal\/competitions\/[^/]+$/.test(path) ||
    /^\/api\/competitions\/[^/]+\/(showcase|official-link)$/.test(path) ||
    /^\/api\/awards\/[^/]+$/.test(path) ||
    /^\/api\/profiles\/[^/]+(?:\/experiences\/[^/]+)?$/.test(path) ||
    /^\/api\/clubs\/[^/]+(?:\/contents(?:\/[^/]+)?)?$/.test(path) ||
    /^\/api\/questions(?:\/[^/]+)?$/.test(path);
}
// Browser capabilities are separate from server-only public DTO reads. Every method is explicit.
const browserApiPolicy: Array<{ path: RegExp; methods: string[]; public?: boolean }> = [
  { path: /^\/api\/portal\/assets$/, methods: ["GET", "HEAD"], public: true },
  { path: /^\/api\/uploads$/, methods: ["GET", "HEAD", "POST"], public: true },
  { path: /^\/api\/competitions\/[A-Za-z0-9_-]+\/official-link$/, methods: ["GET", "HEAD"], public: true },
  { path: /^\/api\/notices\/[A-Za-z0-9_-]+\/open$/, methods: ["GET", "HEAD"], public: true },
  { path: /^\/api\/auth\/(?:csrf|session|providers|signin|error)$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/auth\/(?:callback\/credentials|signout)$/, methods: ["POST"] },
  { path: /^\/api\/auth\/(?:register(?:\/(?:teacher|send-code))?|forgot-password|reset-password)$/, methods: ["POST"] },
  { path: /^\/api\/applications$/, methods: ["POST"] },
  { path: /^\/api\/applications\/[A-Za-z0-9_-]+$/, methods: ["PUT"] },
  { path: /^\/api\/applications\/[A-Za-z0-9_-]+\/withdraw$/, methods: ["POST"] },
  { path: /^\/api\/questions\/commands$/, methods: ["POST"] },
  { path: /^\/api\/me\/session$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/me\/applications$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/me\/applications\/[A-Za-z0-9_-]+$/, methods: ["GET", "HEAD", "DELETE"] },
  { path: /^\/api\/me\/profile$/, methods: ["GET", "HEAD", "PUT"] },
  { path: /^\/api\/me\/avatar$/, methods: ["POST"] },
  { path: /^\/api\/me\/notices\/read$/, methods: ["GET", "HEAD", "POST"] },
  { path: /^\/api\/me\/competition-options$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/me\/award-certificates$/, methods: ["GET", "HEAD", "POST"] },
  { path: /^\/api\/me\/award-certificates\/[A-Za-z0-9_-]+$/, methods: ["DELETE"] },
  { path: /^\/api\/me\/hall-of-fame$/, methods: ["GET", "HEAD", "POST", "PUT", "DELETE"] },
  { path: /^\/api\/me\/experience-posts$/, methods: ["GET", "HEAD", "POST"] },
  { path: /^\/api\/me\/experience-posts\/[A-Za-z0-9_-]+$/, methods: ["GET", "HEAD", "PUT", "DELETE"] },
  { path: /^\/api\/me\/experience-posts\/[A-Za-z0-9_-]+\/(?:submit|withdraw|offline)$/, methods: ["POST"] },
  { path: /^\/api\/me\/clubs$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/me\/clubs\/[A-Za-z0-9_-]+\/contents$/, methods: ["GET", "HEAD", "POST"] },
  { path: /^\/api\/me\/clubs\/[A-Za-z0-9_-]+\/contents\/[A-Za-z0-9_-]+$/, methods: ["GET", "HEAD", "PATCH", "DELETE"] },
  { path: /^\/api\/me\/clubs\/[A-Za-z0-9_-]+\/contents\/[A-Za-z0-9_-]+\/(?:submit|withdraw|offline)$/, methods: ["POST"] },
  { path: /^\/api\/security\/events\/client$/, methods: ["POST"] },
  { path: /^\/api\/admin\/(?:dashboard|search|analytics|users|award-certificates|experience-posts|clubs)$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/admin\/(?:competitions|applications|notices|hall-of-fame)$/, methods: ["GET", "HEAD", "POST"] },
  { path: /^\/api\/admin\/competitions\/[A-Za-z0-9_-]+$/, methods: ["GET", "HEAD", "PATCH", "DELETE"] },
  { path: /^\/api\/admin\/(?:users|award-certificates|notices)\/[A-Za-z0-9_-]+$/, methods: ["PATCH", "DELETE"] },
  { path: /^\/api\/admin\/hall-of-fame\/[A-Za-z0-9_-]+$/, methods: ["GET", "HEAD", "PUT", "DELETE"] },
  { path: /^\/api\/admin\/applications\/(?:export|[A-Za-z0-9_-]+)$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/admin\/(?:applications|award-certificates|experience-posts)\/[A-Za-z0-9_-]+\/review$/, methods: ["POST"] },
  { path: /^\/api\/admin\/experience-posts\/invite$/, methods: ["POST"] },
  { path: /^\/api\/admin\/clubs\/[A-Za-z0-9_-]+\/contacts$/, methods: ["GET", "HEAD", "PUT"] },
  { path: /^\/api\/admin\/clubs\/[A-Za-z0-9_-]+\/admins$/, methods: ["GET", "HEAD", "POST"] },
  { path: /^\/api\/admin\/clubs\/[A-Za-z0-9_-]+\/admins\/[A-Za-z0-9_-]+$/, methods: ["DELETE"] },
  { path: /^\/api\/admin\/clubs\/contents$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/admin\/clubs\/contents\/[A-Za-z0-9_-]+\/(?:review|offline|archive)$/, methods: ["POST"] },
  { path: /^\/api\/admin\/security\/(?:events|alerts)$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/admin\/security\/(?:events|alerts|actions)\/[A-Za-z0-9_-]+$/, methods: ["GET", "HEAD"] },
  { path: /^\/api\/admin\/security\/alerts\/[A-Za-z0-9_-]+\/(?:ack|resolve|ignore)$/, methods: ["POST"] },
  { path: /^\/api\/admin\/security\/(?:actions|ip-whitelist)$/, methods: ["GET", "HEAD", "POST"] },
  { path: /^\/api\/admin\/security\/actions\/[A-Za-z0-9_-]+\/(?:execute|rollback)$/, methods: ["POST"] },
  { path: /^\/api\/admin\/security\/ip-whitelist\/[A-Za-z0-9_-]+$/, methods: ["DELETE"] },
  { path: /^\/api\/admin\/security\/access-policy$/, methods: ["GET", "HEAD", "PATCH"] },
  { path: /^\/api\/admin\/security\/situation\/(?:overview|map|events|live)$/, methods: ["GET", "HEAD"] },
];
export function hasBrowserApiCapability(request: Request, config: TransportConfig) {
  const url = new URL(request.url);
  if (!config.business && !["GET", "HEAD"].includes(request.method)) return false;
  if (!browserApiPolicy.some(rule => rule.path.test(url.pathname) && rule.methods.includes(request.method) && (config.business || rule.public))) return false;
  if (!config.business && url.pathname === "/api/uploads") {
    return ["GET", "HEAD"].includes(request.method) && url.searchParams.size === 1 && /^uploads\/(?:public\/)?(?:award|club|competition|notice)\/[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(url.searchParams.get("key") ?? "");
  }
  return true;
}
const forwarded = ["accept", "accept-language", "content-type", "origin", "referer", "user-agent", "range", "if-range", "last-event-id", "x-csrf-token", "x-auth-return-redirect"];
export function forwardedHeaders(incoming: Headers, config: TransportConfig) {
  const outgoing = new Headers();
  for (const name of forwarded) { const value = incoming.get(name); if (value) outgoing.set(name, value); }
  if (config.clientIpHeader) {
    const raw = incoming.get(config.clientIpHeader)?.trim();
    if (raw && !isIP(raw)) throw new Error("Ingress must overwrite the selected header with one valid IP");
    if (!raw && config.business && process.env.NODE_ENV === "production") throw new Error("Verified ingress client IP is missing");
    if (raw) outgoing.set("x-forwarded-for", raw);
  }
  // Authority comes from deployment configuration, never browser-controlled forwarded headers.
  outgoing.set("x-forwarded-host", config.web.host);
  outgoing.set("x-forwarded-proto", config.web.protocol.slice(0, -1));
  // Never forward the browser's Authorization, even for an otherwise permitted route.
  outgoing.set("authorization", "Bearer " + config.serviceToken);
  if (config.business && incoming.get("cookie")) outgoing.set("cookie", incoming.get("cookie")!);
  return outgoing;
}
export function permittedBrowserRequest(request: Request, config: TransportConfig) {
  if (!hasBrowserApiCapability(request, config)) return false;
  if (!config.business) return ["GET", "HEAD"].includes(request.method);
  // Host is checked against the canonical release. Proxy header spoofing cannot select a different origin.
  if (request.headers.get("host") !== config.web.host) return false;
  if (["GET", "HEAD"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (origin) return origin === config.web.origin;
  try { return new URL(request.headers.get("referer") || "").origin === config.web.origin; } catch { return false; }
}
