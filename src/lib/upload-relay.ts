import { Agent, fetch as uploadFetch } from "undici";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
let active = false;
let agent: Agent | undefined;
let configuredTimeout: number | undefined;
export async function relayUpload(target: URL, request: Request, headers: Headers) {
  if (active) return new Response(JSON.stringify({ code: "UPLOAD_BUSY" }), { status: 503, headers: { "content-type": "application/json", "Retry-After": "5" } });
  const seconds = Number(process.env.BFF_UPLOAD_TIMEOUT_SECONDS ?? "1260");
  if (!Number.isInteger(seconds) || seconds < 60 || seconds > 1800) throw new Error("Invalid upload timeout configuration");
  const timeout = seconds * 1000;
  if (configuredTimeout !== undefined && configuredTimeout !== timeout) throw new Error("Upload timeout requires process restart");
  configuredTimeout = timeout;
  agent ??= new Agent({ connections: 1, pipelining: 1, headersTimeout: timeout, bodyTimeout: 60_000, connect: { timeout: 10_000 } });
  active = true;
  let body: Readable | undefined;
  try {
    body = request.body ? Readable.fromWeb(request.body as NodeReadableStream<Uint8Array>) : undefined;
    return await uploadFetch(target, { method: "POST", headers: Object.fromEntries(headers), body,
      duplex: "half", redirect: "manual", dispatcher: agent,
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(timeout)]),
    });
  } finally { body?.destroy(); active = false; }
}
