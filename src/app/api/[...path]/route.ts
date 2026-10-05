import { getTransportConfig, forwardedHeaders, permittedBrowserRequest } from "@/lib/web-transport";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const hop = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "content-length", "content-encoding", "set-cookie"]);
async function relay(request: Request) {
  const config = getTransportConfig();
  if (!permittedBrowserRequest(request, config)) return Response.json({ message: "当前来源不能访问业务接口。" }, { status: 403, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  const target = new URL(request.url); target.protocol = config.api.protocol; target.host = config.api.host;
  try {
    const options: RequestInit & { duplex?: "half" } = {
      method: request.method, headers: forwardedHeaders(request.headers, config), redirect: "manual",
      cache: "no-store", signal: request.signal,
    };
    if (!["GET", "HEAD"].includes(request.method)) { options.body = request.body; options.duplex = "half"; }
    const upstream = await fetch(target, options);
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => { if (!hop.has(name)) responseHeaders.set(name, value); });
    responseHeaders.set("Cache-Control", upstream.headers.get("cache-control") ?? "private, no-store, max-age=0");
    if (config.business) for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
    const location = responseHeaders.get("location");
    if (location) {
      const redirect = new URL(location, target);
      if (redirect.origin === config.api.origin) responseHeaders.set("location", config.web.origin + redirect.pathname + redirect.search + redirect.hash);
    }
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    if (request.signal.aborted) throw error;
    return Response.json({ message: "服务暂不可用，请稍后重试。" }, { status: 502, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
}
export { relay as GET, relay as HEAD, relay as POST, relay as PUT, relay as PATCH, relay as DELETE, relay as OPTIONS };
