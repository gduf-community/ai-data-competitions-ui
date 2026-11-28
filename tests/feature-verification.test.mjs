import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { verifyProject } from "../scripts/verify-feature.mjs";

test("club browser verification refuses missing explicit synthetic environment before launch", () => {
  const env = {...process.env};
  for (const key of ["TEST_API_DIRECTORY","TEST_DATABASE_URL","TEST_BROWSER_EXECUTABLE"]) delete env[key];
  const result=spawnSync(process.execPath,["scripts/verify-club-browser.mjs"],{env,encoding:"utf8",timeout:5000});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/Set TEST_API_DIRECTORY/);
});

test("feature evidence rejects skipped commands missing environments and dirty revisions", async () => {
  const root = await mkdtemp(join(tmpdir(),"feature-evidence-"));
  const git = args => execFileSync("git",args,{cwd:root,stdio:["pipe","pipe","pipe"],
    env:{...process.env,GIT_AUTHOR_NAME:"Synthetic fixture",GIT_AUTHOR_EMAIL:"fixture@example.invalid",GIT_COMMITTER_NAME:"Synthetic fixture",GIT_COMMITTER_EMAIL:"fixture@example.invalid"}});
  git(["init"]); git(["remote","add","origin","https://github.com/example/project.git"]);
  const manifest = {version:1,features:[{id:"flow",description:"Synthetic behavior",documentation:["README.md"],checks:["behavior"]}],
    checks:[{id:"behavior",kind:"command",command:["node","check.mjs"],properties:["flow.assertion"],requires:[],timeoutSeconds:10}]};
  await writeFile(join(root,"governance.json"),JSON.stringify(manifest));
  await writeFile(join(root,".gitignore"),".verification/\n");
  await writeFile(join(root,"check.mjs"),"console.log('# tests 1\\n# skipped 1');\n");
  git(["add","."]); git(["commit","-m","synthetic fixture"]);
  assert.equal((await verifyProject([],root)).status,"incomplete");
  manifest.checks[0].requires=["GOVERNANCE_SYNTHETIC_REQUIRED_ENV"];
  await writeFile(join(root,"governance.json"),JSON.stringify(manifest));
  git(["add","."]); git(["commit","-m","synthetic environment requirement"]);
  const missing = await verifyProject([],root);
  assert.equal(missing.status,"incomplete"); assert.equal(missing.report.execution.checks[0].failureType,"environment");
  manifest.checks[0].requires=[];
  await writeFile(join(root,"governance.json"),JSON.stringify(manifest));
  await writeFile(join(root,"check.mjs"),"console.log('real assertion completed');\n");
  git(["add","."]); git(["commit","-m","synthetic passing command"]);
  assert.equal((await verifyProject([],root)).status,"passed");
  await writeFile(join(root,"uncommitted.txt"),"new source");
  assert.equal((await verifyProject([],root)).status,"incomplete");
});

test("official awards feature binds to shipped Web consumers, not personal certificates", async () => {
  const manifest = JSON.parse(await readFile(new URL("../governance.json", import.meta.url), "utf8"));
  const feature = manifest.features.find(item => item.id === "official_awards.contract");
  assert.ok(feature, "official awards must have a dedicated verification feature");
  assert.deepEqual(feature.checks, ["boundaries", "official-awards-web"]);
  const check = manifest.checks.find(item => item.id === "official-awards-web");
  assert.ok(check, "official awards must resolve to a runnable check");
  assert.equal(check.kind, "command");
  assert.deepEqual(check.properties, ["official_awards.web_consumer_regressions"]);

  // Bind the feature to actual official-awards Web source and lifecycle tests.
  // Personal award-certificate tests are a different feature and cannot discharge this claim.
  const sources = new Map([
    ["tests/official-awards.test.ts", ["../src/lib/contracts/official-awards", "../src/lib/official-awards/members"]],
    ["tests/official-awards-flow.test.ts", ["../src/lib/official-awards/query", "../src/lib/official-awards/members"]],
    ["tests/official-awards-bff.test.ts", ["../src/lib/web-transport", "/api/admin/official-awards/"]],
    ["tests/official-awards-lifecycle.test.mjs", ["src/components/admin/official-awards/", "src/hooks/use-official-award-list.ts"]],
    ["tests/official-awards-export-lifecycle.test.ts", ["src/hooks/use-official-award-export.ts"]],
  ]);
  assert.deepEqual(check.command, ["node", "--import", "tsx", "--test", ...sources.keys()]);
  for (const [path, requiredSources] of sources) {
    const source = await readFile(new URL("../" + path, import.meta.url), "utf8");
    for (const required of requiredSources) {
      assert.ok(source.includes(required), `${path} must exercise ${required}`);
    }
  }
});


test("feature preflight rejects wrong Node missing tests and unproven consumer coverage", async () => {
  for (const scenario of ["valid", "wrong-node", "missing-test", "consumer-coverage"]) {
    const root = await mkdtemp(join(tmpdir(),"feature-preflight-"));
    const git = args => execFileSync("git",args,{cwd:root,stdio:["pipe","pipe","pipe"],
      env:{...process.env,GIT_AUTHOR_NAME:"Synthetic fixture",GIT_AUTHOR_EMAIL:"fixture@example.invalid",GIT_COMMITTER_NAME:"Synthetic fixture",GIT_COMMITTER_EMAIL:"fixture@example.invalid"}});
    git(["init"]); git(["remote","add","origin","https://github.com/example/project.git"]);
    await writeFile(join(root,".gitignore"),".verification/\n");
    await writeFile(join(root,".node-version"),scenario==="wrong-node" ? `${Number(process.versions.node.split(".")[0])+1}.0.0` : process.versions.node);
    await writeFile(join(root,"check.mjs"),"import {writeFileSync} from 'node:fs'; writeFileSync('.verification/executed','yes');\n");
    await writeFile(join(root,"present.test.mjs"),"import test from 'node:test'; import {writeFileSync} from 'node:fs'; test('observed execution',()=>writeFileSync('.verification/executed','yes'));\n");
    await mkdir(join(root,"src"));
    await writeFile(join(root,"src/consumer.mjs"),"export const consume = () => true;\n");
    const check={id:"behavior",kind:"command",command:["node","check.mjs"],properties:["flow.assertion"],requires:[],timeoutSeconds:10};
    if(scenario==="missing-test") check.command=["node","--test","present.test.mjs","missing.test.mjs"];
    if(scenario==="consumer-coverage") check.coverage=[{property:"flow.assertion",targets:["src/consumer.mjs#consume"],tests:["present.test.mjs"]}];
    await writeFile(join(root,"governance.json"),JSON.stringify({version:1,features:[{id:"flow",description:"Synthetic behavior",documentation:["README.md"],checks:["behavior"]}],checks:[check]}));
    git(["add","."]); git(["commit","-m","synthetic preflight fixture"]);
    const result=await verifyProject([],root), execution=result.report.execution.checks[0];
    assert.equal(result.status,scenario==="valid"?"passed":"incomplete",scenario);
    if(["wrong-node","missing-test"].includes(scenario)) {
      assert.equal(execution.exitCode,null,scenario);
      assert.equal(execution.failureType,"environment",scenario);
      await assert.rejects(readFile(join(root,".verification/executed")),{code:"ENOENT"});
    } else {
      assert.equal(execution.exitCode,0,scenario);
      assert.equal(await readFile(join(root,".verification/executed"),"utf8"),"yes");
    }
    if(scenario==="consumer-coverage") {
      assert.equal(execution.assertions[0].status,"incomplete");
      assert.equal(execution.failureType,"not_run");
    }
  }
});
