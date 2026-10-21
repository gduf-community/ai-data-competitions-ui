import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import * as tar from "tar";

const unit = "web";
test("ECS staging verifies exact bytes, preserves internal links, rejects overwrite and escaping links without activation", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "competition-ecs-test-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const source = path.join(root, "source"), releases = path.join(root, "releases");
  fs.mkdirSync(source); fs.mkdirSync(releases);
  const server = unit === "api" ? "build/api/server.js" : "server.js";
  fs.mkdirSync(path.dirname(path.join(source, server)), { recursive: true });
  fs.writeFileSync(path.join(source, server), "// synthetic runtime");
  fs.writeFileSync(path.join(source, "ecs-start.mjs"), "// synthetic entrypoint");
  fs.symlinkSync("ecs-start.mjs", path.join(source, "internal-link"));
  const payload = path.join(root, "runtime.tar.gz"), manifestFile = path.join(root, "runtime-manifest.json");
  const sha = "a".repeat(40);
  function archive() {
    tar.c({ file: payload, cwd: source, gzip: true, sync: true }, ["."]);
    const digest = createHash("sha256").update(fs.readFileSync(payload)).digest("hex");
    const manifest = { version: 1, unit, sha, payloadSha256: digest, platform: process.platform, arch: process.arch,
      node: "v22.23.3", repository: "gduf-community/" + (unit === "api" ? "competition-Q-A-website" : "ai-data-competitions-ui"), server };
    fs.writeFileSync(manifestFile, JSON.stringify(manifest));
    return digest;
  }
  function stage(digest) {
    return spawnSync("python3", ["deploy/ecs/stage-release.py", "--unit", unit, "--sha", sha, "--digest", digest,
      "--payload", payload, "--manifest", manifestFile, "--releases", releases], { encoding: "utf8" });
  }
  const digest = archive();
  assert.notEqual(stage("b".repeat(64)).status, 0);
  assert.deepEqual(fs.readdirSync(releases), []);
  const result = stage(digest);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(releases, sha, "internal-link"), "utf8"), "// synthetic entrypoint");
  assert.equal(fs.existsSync(path.join(releases, "current")), false);
  assert.notEqual(stage(digest).status, 0);
  fs.rmSync(path.join(releases, sha), { recursive: true });
  fs.symlinkSync("../../outside", path.join(source, "escape"));
  assert.notEqual(stage(archive()).status, 0);
  assert.deepEqual(fs.readdirSync(releases), []);
  assert.equal(fs.existsSync(path.join(root, "outside")), false);
});
