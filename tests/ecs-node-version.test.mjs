import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

function runWithPreviousNode(entry, env = {}) {
  // Change only the reported version in a fresh process. Keep real CLI guards active.
  return spawnSync(process.execPath, ["--input-type=module", "--eval",
    'Object.defineProperty(process, "version", { value: "v22.23.3" }); await import(process.argv[1]);',
    entry], { encoding: "utf8", env });
}

test("offline build rejects the previous Node before invoking build tools", () => {
  const result = runWithPreviousNode("./scripts/release-ecs.mjs", { PATH: "" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Build on Linux with Node\.js 22\.23\.5/);
});

test("Web launcher rejects the previous Node before starting the server", () => {
  const result = runWithPreviousNode("./deploy/ecs/start-runtime.mjs", {
    API_SERVICE_TOKEN: "a".repeat(64), WEB_RELEASE_MODE: "trusted",
    API_ORIGIN: "http://127.0.0.1:13001", WEB_TRUSTED_ORIGIN: "http://127.0.0.1:13000",
    WEB_CLIENT_IP_HEADER: "x-real-ip",
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Runtime requires Node\.js 22\.23\.5/);
});
