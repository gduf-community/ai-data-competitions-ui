export class SignupCodeError extends Error {
  readonly retryAfter: number;
  constructor(message: string, retryAfter = 60) { super(message); this.retryAfter = retryAfter; }
}

/** One browser confirmation budget, including HTTP connection, body and every provider poll. */
export async function requestSignupCode(email: string, onStarted: () => void, outerSignal: AbortSignal) {
  const timeout = new AbortController();
  const signal = AbortSignal.any([outerSignal, timeout.signal]);
  const timer = setTimeout(() => timeout.abort(), 10_000);
  let abort = () => {};
  const expired = new Promise<never>((_, reject) => {
    abort = () => reject(new SignupCodeError("发送失败：10秒内未确认发出，请稍后重试。迟到邮件中的验证码可能已失效。"));
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
  const receive = async () => {
    signal.throwIfAborted();
    const response = await fetch("/api/auth/register/send-code", {
      method: "POST", headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: JSON.stringify({ email }), signal,
    });
    const check = (event: { state?: string; message?: string; retryAfter?: string | null }) => {
      signal.throwIfAborted();
      if (event.state === "sending") { onStarted(); return false; }
      if (event.state === "sent") return true;
      const retryAfter = Number(event.retryAfter);
      throw new SignupCodeError(event.message ?? "发送验证码失败", Number.isFinite(retryAfter) && retryAfter > 0 ? Math.ceil(retryAfter) : 60);
    };
    if (!response.ok) {
      const payload = await response.json();
      throw new SignupCodeError(payload.message ?? "发送验证码失败", Number(response.headers.get("Retry-After")) || 60);
    }
    if (!response.headers.get("content-type")?.includes("application/x-ndjson") || !response.body) {
      throw new SignupCodeError("发送状态暂不可确认，请稍后重试");
    }
    const reader = response.body.getReader();
    const cancel = () => { void reader.cancel().catch(() => {}); };
    signal.addEventListener("abort", cancel, { once: true });
    if (signal.aborted) cancel();
    const decoder = new TextDecoder();
    let buffer = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        signal.throwIfAborted();
        buffer += decoder.decode(value, { stream: !done });
        if (buffer.length > 16_384) throw new SignupCodeError("发送状态响应异常");
        let newline;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          if (line && check(JSON.parse(line))) return;
        }
        if (done) throw new SignupCodeError("发送状态中断，请稍后重试");
      }
    } finally { signal.removeEventListener("abort", cancel); cancel(); }
  };
  try { await Promise.race([receive(), expired]); }
  finally { clearTimeout(timer); signal.removeEventListener("abort", abort); }
}
