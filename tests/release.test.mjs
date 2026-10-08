import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { test } from "node:test";
import * as tar from "tar";
import { packageRuntime } from "../scripts/package-runtime.mjs";

const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8").replaceAll("\r\n", "\n");
const candidate = "a".repeat(40);

test("CI validates and uploads runtime artifacts without any deployment capability", () => {
  assert.match(workflow, /permissions:\s*\n  contents: read/);
  assert.match(workflow, /persist-credentials: false/);
  assert.match(workflow, /uses: actions\/upload-artifact@/);
  assert.doesNotMatch(workflow, /\b(?:promote|deploy|deployment|environment):|contents: write|actions: write|heads\/production|updateRef|secrets\.|pull_request_target|workflow_run:/);
  assert.doesNotMatch(workflow, /cache: pnpm/);
});

test("Web CI runs automatically for pull requests and every pushed branch", () => {
  const trigger = workflow.split("\npermissions:")[0];
  assert.match(trigger, /^  pull_request:$/m);
  assert.match(trigger, /^  push:$/m);
  assert.match(trigger, /^  workflow_dispatch:$/m);
  assert.doesNotMatch(trigger, /branches:|paths:|inputs:|deploy:/);
  assert.match(workflow, /WEB_RELEASE_MODE: public/);
  assert.match(workflow, /run: pnpm run ci/);
});

test("runtime packaging produces verifiable payload and refuses environment contamination or external links", t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"competition-runtime-package-"));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const role of ["web","api"]){
    const next=path.join(root,role==="web"?".next":"build/api/.next");
    const standalone=path.join(next,"standalone");
    const server=path.join(standalone,role==="web"?"":"build/api");
    fs.mkdirSync(server,{recursive:true}); fs.writeFileSync(path.join(server,"server.js"),"console.log('synthetic')");
    fs.mkdirSync(path.join(next,"static"),{recursive:true});fs.writeFileSync(path.join(next,"static/fixture.js"),"synthetic");
    fs.writeFileSync(path.join(root,"pnpm-lock.yaml"),"synthetic lock");
    const repo="gduf-community/"+(role==="web"?"ai-data-competitions-ui":"competition-Q-A-website");
    const manifest=packageRuntime(root,role,candidate,repo);
    if (role === "web") {
      const asset=path.join(next,"static/fixture.js");
      for (const name of ["API_SERVICE_TOKEN","DATABASE_URL","PGPASSWORD","S3_SECRET_ACCESS_KEY","MINIO_SECRET_KEY"]) {
        fs.writeFileSync(asset,"console.log(process.env."+name+")");
        assert.throws(()=>packageRuntime(root,role,candidate,repo),/Web browser artifact/);
      }
      fs.writeFileSync(asset,"synthetic");
    }
    const bytes=fs.readFileSync(path.join(root,"build/release/runtime.tar.gz"));
    assert.equal(manifest.payloadSha256,createHash("sha256").update(bytes).digest("hex"));
    const listed=[];tar.t({file:path.join(root,"build/release/runtime.tar.gz"),sync:true,onentry:entry=>listed.push(entry.path)});
    assert.ok(listed.some(name=>name.endsWith("/server.js")));
    assert.throws(()=>packageRuntime(root,role,"bad",repo),/identity/);
    fs.writeFileSync(path.join(server,".env.local"),"synthetic contamination");
    assert.throws(()=>packageRuntime(root,role,candidate,repo),/Environment file/);
    fs.rmSync(path.join(server,".env.local"));
    // Reproduce Next's source junction/partial pnpm link without carrying source paths into the tar.
    const installed=path.join(root,"node_modules/.pnpm/synthetic@1/node_modules/synthetic-package");fs.mkdirSync(installed,{recursive:true});
    fs.writeFileSync(path.join(installed,"package.json"),'{"name":"synthetic-package"}');fs.writeFileSync(path.join(installed,"index.js"),"synthetic");
    const traced=path.join(standalone,"node_modules/synthetic-package");fs.mkdirSync(path.dirname(traced),{recursive:true});
    fs.symlinkSync(installed,traced,process.platform==="win32"?"junction":"dir");
    packageRuntime(root,role,candidate,repo);
    const portable=[];tar.t({file:path.join(root,"build/release/runtime.tar.gz"),sync:true,onentry:entry=>portable.push(entry.path)});
    assert.ok(portable.some(name=>name.endsWith("/synthetic-package/index.js")));
    const entries=[];tar.t({file:path.join(root,"build/release/runtime.tar.gz"),sync:true,onentry:entry=>{if(entry.type==="SymbolicLink")entries.push({name:entry.path,target:entry.linkpath});}});
    assert.ok(entries.some(entry=>entry.name.endsWith("/node_modules/synthetic-package")&&entry.target.startsWith(".pnpm/")));
    assert.ok(entries.every(entry=>!path.isAbsolute(entry.target)&&!entry.target.includes(root)));
    const external=path.join(root,"outside");fs.mkdirSync(external,{recursive:true});
    const link=path.join(standalone,"outside-link");fs.symlinkSync(external,link,process.platform==="win32"?"junction":"dir");
    assert.throws(()=>packageRuntime(root,role,candidate,repo),/External runtime/);fs.unlinkSync(link);
  }
});
