// Pure policy shared by Next config and response adapters. No server or client imports.
export function getSecurityHeaders(production: boolean): Record<string, string> {
  return {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "X-Permitted-Cross-Domain-Policies": "none",
    "Content-Security-Policy": [
      "default-src 'self'",
      production ? "script-src 'self' 'unsafe-inline'" : "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "object-src 'none'", "frame-src 'none'", "frame-ancestors 'none'",
      "base-uri 'self'", "form-action 'self'",
    ].join("; "),
    ...(production ? { "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload" } : {}),
  };
}

export const PRIVATE_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export const CACHE_HEADERS = {
  privateNoStore: PRIVATE_NO_STORE_HEADERS,
  privateDownload: { "Cache-Control": "private, max-age=60" },
  eventStream: {
    ...PRIVATE_NO_STORE_HEADERS,
    "Cache-Control": "private, no-store, no-cache, no-transform, max-age=0",
    "X-Accel-Buffering": "no",
  },
} as const;
export type ResponseCachePolicy = keyof typeof CACHE_HEADERS;

export const PRIVATE_API_PATHS = ["/api/admin", "/api/me"] as const;
// Next path headers take precedence over route cache headers. Put exact overrides last.
export const PATH_CACHE_OVERRIDES: Record<string, ResponseCachePolicy> = {
  "/api/admin/security/situation/live": "eventStream",
};

export function toConfigHeaders(headers: Record<string, string>) {
  return Object.entries(headers).map(([key, value]) => ({ key, value }));
}

export function applyHeaderPolicy<T extends Response>(response: T, production: boolean, cache?: ResponseCachePolicy): T {
  const headers: Record<string, string> = { ...getSecurityHeaders(production), ...(cache ? CACHE_HEADERS[cache] : {}) };
  for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
  return response;
}
