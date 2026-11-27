import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
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
