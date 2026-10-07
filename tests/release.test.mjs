import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { test } from "node:test";
import tar from "next/dist/compiled/tar/index.js";
import { packageRuntime } from "../scripts/package-runtime.mjs";

const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8").replaceAll("\r\n", "\n");
const promote = workflow.split("\n  promote:\n")[1];
const code = promote.match(/          script: \|\n([\s\S]*)$/)[1].split("\n").map(line => line.replace(/^ {12}/, "")).join("\n");
const Gate = Object.getPrototypeOf(async function () {}).constructor;
const gate = new Gate("github", "core", "context", code);
const repository = workflow.match(/EXPECTED_REPOSITORY: (\S+)/)[1];
const unit = workflow.match(/RUNTIME_UNIT: (\S+)/)[1];
const validationJob = workflow.match(/VALIDATION_JOB: (.+)/)[1];
const candidate = "a".repeat(40), old = "b".repeat(40), digest = "c".repeat(64);

function fixture() {
  const state = {main:candidate, production:old, comparison:"ahead", updates:[], reads:0,
    run:{id:41,repository:{id:12,full_name:repository},head_sha:candidate,head_branch:"main",event:"workflow_dispatch"},
    artifact:{id:42,name:`${unit}-runtime-${candidate}`,expired:false,expires_at:"2999-01-01T00:00:00Z",workflow_run:{id:41,head_sha:candidate,repository_id:12},digest:`sha256:${digest}`},
    jobs:{total_count:1,jobs:[{name:validationJob,status:"completed",conclusion:"success"}]},race:false};
  const github = {rest:{actions:{getWorkflowRun:async()=>({data:state.run}),getArtifact:async()=>({data:state.artifact}),listJobsForWorkflowRun:async()=>({data:state.jobs})},
    git:{getRef:async({ref})=>({data:{object:{sha:ref==="heads/main" ? (++state.reads > 1 && state.race ? old : state.main) : state.production}}}),updateRef:async input=>{assert.equal(input.force,false);state.updates.push(input);state.production=input.sha;}},
    repos:{compareCommitsWithBasehead:async()=>({data:{status:state.comparison}})}}};
  const context = {repo:{owner:"gduf-community",repo:repository.split("/")[1]},eventName:"workflow_dispatch",ref:"refs/heads/main",sha:candidate,runId:41};
  let receipt = "";
  const core = {summary:{addRaw:text=>{receipt+=text;return {write:async()=>{}};}}};
  return {state,github,context,core,receipt:()=>receipt};
}

test("actual inline promotion gate binds successful validation to immutable artifact and exact SHA", async t => {
  const names = {CANDIDATE_SHA:candidate,ARTIFACT_ID:"42",ARTIFACT_DIGEST:digest,EXPECTED_REPOSITORY:repository,RUNTIME_UNIT:unit,VALIDATION_JOB:validationJob};
  const previous = Object.fromEntries(Object.keys(names).map(name=>[name,process.env[name]]));
  Object.assign(process.env,names);
  t.after(()=>{for(const [name,value] of Object.entries(previous))if(value===undefined)delete process.env[name];else process.env[name]=value;});
  const normal=fixture(); await gate(normal.github,normal.core,normal.context);
  assert.equal(normal.state.updates.length,1); assert.equal(normal.state.production,candidate);
  assert.match(normal.receipt(),new RegExp(digest)); assert.match(normal.receipt(),/does not confirm provider deployment/);
  const same=fixture(); same.state.production=candidate; await gate(same.github,same.core,same.context); assert.equal(same.state.updates.length,0);
  const negatives = [
    item=>{item.state.main=old;},
    item=>{item.state.race=true;},
    item=>{item.state.comparison="diverged";},
    item=>{item.state.run.head_sha=old;},
    item=>{item.state.run.repository.full_name="attacker/repository";},
    item=>{item.state.run.event="pull_request";},
    item=>{item.state.artifact.workflow_run.id=40;},
    item=>{item.state.artifact.workflow_run.repository_id=13;},
    item=>{item.state.artifact.workflow_run.head_sha=old;},
    item=>{item.state.artifact.digest="sha256:"+"d".repeat(64);},
    item=>{item.state.artifact.name="contaminated-runtime";},
    item=>{item.state.artifact.expired=true;},
    item=>{item.state.artifact.expires_at="2000-01-01T00:00:00Z";},
    item=>{item.state.jobs.jobs[0].conclusion="failure";},
    item=>{item.state.jobs.jobs[0].conclusion="cancelled";},
    item=>{item.state.jobs.jobs[0].conclusion="skipped";},
    item=>{item.context.eventName="pull_request";},
    item=>{item.context.ref="refs/heads/codex/preview";},
  ];
  for(const change of negatives){const item=fixture();change(item);await assert.rejects(gate(item.github,item.core,item.context));assert.equal(item.state.updates.length,0);}
});

test("workflow grants writes only to explicit successful main promotion and executes no repository code there", () => {
  for(const condition of ["github.event_name == 'workflow_dispatch'","inputs.deploy == true","github.ref == 'refs/heads/main'",".result == 'success'"])assert.ok(promote.includes(condition));
  assert.match(promote,/contents: write/); assert.match(promote,/actions: read/);
  assert.doesNotMatch(promote,/uses: actions\/(?:checkout|download-artifact)|run:|pnpm |secrets\./);
  assert.doesNotMatch(workflow.split("\n  promote:\n")[0],/contents: write|secrets\.|pull_request_target|workflow_run:/);
  assert.match(workflow,/default: false/); assert.match(workflow,/persist-credentials: false/);
  assert.doesNotMatch(workflow,/cache: pnpm/);
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
