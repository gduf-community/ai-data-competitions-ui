import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: root, encoding: "utf8", ...options });
  if (result.error || result.status !== 0) throw new Error("Release command failed: " + command);
  return result.stdout?.trim();
}
if (process.version !== "v22.23.3" || process.platform !== "linux") throw new Error("Build on Linux with Node.js 22.23.3, matching the target architecture.");
if (run("pnpm", ["--version"]) !== "10.34.5") throw new Error("pnpm 10.34.5 required.");
if (run("git", ["status", "--porcelain"])) throw new Error("Commit the release candidate in a clean checkout first.");
const sha = run("git", ["rev-parse", "HEAD"]);
const companion = process.env.COMPANION_SHA;
if (!/^[a-f0-9]{40}$/.test(companion || "")) throw new Error("Set COMPANION_SHA to the exact paired repository commit.");
for (const name of [".env", ".env.local", ".env.production", ".env.production.local"]) {
  if (fs.existsSync(path.join(root, name))) throw new Error("Build from a checkout without environment files.");
}
// Do not pass backend/provider credentials from the shell into the build.
const env = Object.fromEntries(["PATH", "HOME", "TMPDIR", "PNPM_HOME"].filter(name => process.env[name]).map(name => [name, process.env[name]]));
Object.assign(env, { NEXT_TELEMETRY_DISABLED: "1", WEB_RELEASE_MODE: "public", API_SERVICE_TOKEN: "a".repeat(64),
  GITHUB_SHA: sha, GITHUB_REPOSITORY: "gduf-community/ai-data-competitions-ui", COMPANION_WEB_SHA: companion });
run("pnpm", ["install", "--frozen-lockfile", ...(process.env.ECS_PNPM_STORE_DIR ? ["--store-dir", process.env.ECS_PNPM_STORE_DIR] : [])], { env, stdio: "inherit" });
run("pnpm", ["run", "check:framework"], { env, stdio: "inherit" });
run("pnpm", ["run", "build"], { env, stdio: "inherit" });
run(process.execPath, ["scripts/package-runtime.mjs", "web"], { env, stdio: "inherit" });
