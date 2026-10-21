import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
if (!/^[a-f0-9]{64}$/.test(process.env.API_SERVICE_TOKEN || "")) throw new Error("API_SERVICE_TOKEN must be 64 lowercase hex characters.");
if (process.env.WEB_RELEASE_MODE !== "trusted") throw new Error("ECS business runtime requires WEB_RELEASE_MODE=trusted.");
for (const name of ["API_ORIGIN", "WEB_TRUSTED_ORIGIN"]) {
  const url = new URL(process.env[name] || "invalid");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid " + name);
}
if (!["x-real-ip", "x-forwarded-for", "cf-connecting-ip"].includes(process.env.WEB_CLIENT_IP_HEADER)) throw new Error("Verified ingress IP header required.");
if (process.version !== "v22.23.3") throw new Error("Runtime requires Node.js 22.23.3.");
const root = path.dirname(fileURLToPath(import.meta.url));
// Loopback only. Reverse proxy / service isolation remains an explicit host-side operation.
const child = spawn(process.execPath, [path.join(root, "server.js")], {
  cwd: root, stdio: "inherit", env: { ...process.env, NODE_ENV: "production", HOSTNAME: "127.0.0.1", PORT: process.env.ECS_PORT || "13000" },
});
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
child.on("error", () => { console.error("Failed to start web runtime"); process.exitCode = 1; });
child.on("exit", (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
