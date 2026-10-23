// Browser capability policy lives in web-transport.ts; recompile chain on policy edits.
import { relayUpload } from "@/lib/upload-relay";
import { getTransportConfig, forwardedHeaders, permittedBrowserRequest, hasBrowserApiCapability, validOfficialAwardDownload } from "@/lib/web-transport";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const hop = new Set(["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "content-length", "content-encoding", "set-cookie"]);
async function checkedDownloadBody(body: ReadableStream<Uint8Array> | null, format: string | null, signal: AbortSignal) {
  if (!body) throw new Error("Missing download body");
  const signature = format === "csv" ? [0xef, 0xbb, 0xbf] : [0x50, 0x4b, 0x03, 0x04];
  const reader = body.getReader(), buffered: Uint8Array[] = [];
  const abort = () => { void reader.cancel(signal.reason).catch(() => {}); };
  const close = () => { signal.removeEventListener("abort", abort); reader.releaseLock(); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    let offset = 0;
    while (offset < signature.length) {
      signal.throwIfAborted();
      const chunk = await reader.read();
      if (chunk.done) throw new Error("Truncated download signature");
      for (const byte of chunk.value) {
        if (offset === signature.length) break;
        if (byte !== signature[offset++]) throw new Error("Invalid download signature");
      }
      if (chunk.value.byteLength) buffered.push(chunk.value);
    }
    signal.throwIfAborted();
    return new ReadableStream<Uint8Array>({
      start(controller) { for (const chunk of buffered) controller.enqueue(chunk); },
      async pull(controller) {
        try { const chunk = await reader.read(); if (chunk.done) { close(); controller.close(); } else controller.enqueue(chunk.value); }
        catch (error) { close(); controller.error(error); }
      },
      async cancel(reason) { try { await reader.cancel(reason); } finally { close(); } },
    });
  } catch (error) {
    try { await reader.cancel(error); } finally { close(); }
    throw error;
  }
}
async function relay(request: Request) {
  const config = getTransportConfig();
  if (!hasBrowserApiCapability(request, config)) return Response.json({ message: "接口不存在。" }, { status: 404, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  if (!permittedBrowserRequest(request, config)) return Response.json({ message: "当前来源不能访问业务接口。" }, { status: 403, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  const target = new URL(request.url); target.protocol = config.api.protocol; target.host = config.api.host;
  try {
    const options: RequestInit & { duplex?: "half" } = {
      method: request.method, headers: forwardedHeaders(request.headers, config), redirect: "manual",
      cache: "no-store", signal: request.signal,
    };
    if (!["GET", "HEAD"].includes(request.method)) { options.body = request.body; options.duplex = "half"; }
    const upstream = request.method === "POST" && target.pathname === "/api/uploads"
      ? await relayUpload(target, request, options.headers as Headers)
      : await fetch(target, options);
    if (upstream.ok && !validOfficialAwardDownload(target, upstream.headers)) {
      await upstream.body?.cancel();
      return Response.json({ message: "下载文件协议不合法，请稍后重试。" }, { status: 502, headers: { "Cache-Control": "private, no-store, max-age=0" } });
    }
    const body = upstream.ok && /^\/api\/admin\/official-awards\/competitions\/[^/]+\/export$/.test(target.pathname)
      ? await checkedDownloadBody(upstream.body as ReadableStream<Uint8Array> | null, target.searchParams.get("format"), request.signal) : upstream.body;
    const responseHeaders = new Headers();
    upstream.headers.forEach((value, name) => { if (!hop.has(name)) responseHeaders.set(name, value); });
    responseHeaders.set("Cache-Control", target.pathname.startsWith("/api/admin/official-awards/") ? "private, no-store, max-age=0" : upstream.headers.get("cache-control") ?? "private, no-store, max-age=0");
    if (config.business) for (const cookie of upstream.headers.getSetCookie()) responseHeaders.append("set-cookie", cookie);
    const location = responseHeaders.get("location");
    if (location) {
      const redirect = new URL(location, target);
      if (redirect.origin === config.api.origin) responseHeaders.set("location", config.web.origin + redirect.pathname + redirect.search + redirect.hash);
    }
    return new Response(body as ReadableStream<Uint8Array> | null, { status: upstream.status, headers: responseHeaders });
  } catch (error) {
    if (request.signal.aborted) throw error;
    return Response.json({ message: "服务暂不可用，请稍后重试。" }, { status: 502, headers: { "Cache-Control": "private, no-store, max-age=0" } });
  }
}
export { relay as GET, relay as HEAD, relay as POST, relay as PUT, relay as PATCH, relay as DELETE, relay as OPTIONS };

