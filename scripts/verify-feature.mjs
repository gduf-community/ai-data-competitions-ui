// Standalone caller-side runner. Distributed unchanged to project scripts/verify-feature.mjs.
// It runs repository-owned commands only when explicitly invoked in that checkout.
import { createHash } from "node:crypto";
import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, writeFile, open } from "node:fs/promises";
import { resolve, join, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";

const hash = text => createHash("sha256").update(text).digest("hex");
const git = (root, args) => execFileSync("git", args, {cwd:root,encoding:"utf8",stdio:["pipe","pipe","pipe"]}).trim();
const sorted = object => Object.fromEntries(Object.entries(object).sort(([a],[b]) => a.localeCompare(b,"en")));

export async function verifyProject(args = process.argv.slice(2), root = process.cwd()) {
  const features = [], components = {}, inputVersions = {};
  let output, planOnly = false, baseRevision;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--plan") { planOnly = true; continue; }
    if (arg === "--output") { output = resolve(args[++index]); continue; }
    if (arg === "--base") { baseRevision = args[++index]; if (!/^[a-f0-9]{40}$/.test(baseRevision ?? "")) throw Error("Use a full base commit"); continue; }
    if (arg === "--component" || arg === "--input") {
      const value = args[++index], at = value?.indexOf("=");
      if (!(at > 0)) throw Error("Use name=value for components and input versions");
      const key = value.slice(0,at), content = value.slice(at+1);
      if (!/^[a-z][a-z0-9_.-]{0,99}$/.test(key) || !content) throw Error("Invalid component or input version");
      const target = arg === "--component" ? components : inputVersions;
      if (Object.hasOwn(target,key)) throw Error("Duplicate component or input");
      target[key] = content;
      continue;
    }
    if (arg.startsWith("--")) throw Error(`Unknown option: ${arg}`);
    features.push(arg);
  }
  const raw = await readFile(join(root,"governance.json"),"utf8"), manifest = JSON.parse(raw);
  if (manifest.outputDirectory !== undefined && (typeof manifest.outputDirectory !== "string" ||
    !/^[\w./-]{1,200}$/.test(manifest.outputDirectory) || manifest.outputDirectory.startsWith("/") ||
    manifest.outputDirectory.split("/").some(part => ["..",".git",""].includes(part)))) throw Error("Use a repository-relative output directory");
  output ??= resolve(root,manifest.outputDirectory ?? ".verification/feature");
  if (manifest.version !== 1 || !Array.isArray(manifest.features) || !Array.isArray(manifest.checks)) throw Error("Expected governance.json version 1");
  if (new Set(features).size !== features.length || features.some(id => !manifest.features.some(feature => feature.id === id))) throw Error("Unknown or duplicate feature");
  if (Object.keys(components).some(name => !Object.hasOwn(manifest.components ?? {},name))) throw Error("Unknown component");
  const selected = (features.length ? features : manifest.features.map(feature => feature.id)).sort();
  const chosen = manifest.features.filter(feature => selected.includes(feature.id));
  const checks = manifest.checks.filter(check => chosen.some(feature => feature.checks.includes(check.id)));
  if (!checks.length) throw Error("The feature has no checks");
  const targets = {}, workspaces = {target:root}, issues = [];
  const capture = (name, directory, expectedRepository) => {
    const origin = git(directory,["remote","get-url","origin"]);
    const match = origin.match(/(?:github\.com[:/])([^/]+\/[^/]+?)(?:\.git)?$/);
    if (!match) throw Error("Expected a GitHub origin");
    const repository = match[1];
    if (expectedRepository && repository.toLowerCase() !== expectedRepository.toLowerCase()) throw Error(`Wrong repository for ${name}`);
    targets[name] = {repository,revision:git(directory,["rev-parse","HEAD"])};
    if (git(directory,["status","--porcelain","--untracked-files=normal"])) issues.push(`Uncommitted ${name} workspace; commit before claiming coverage of a remote revision`);
  };
  capture("target",root);
  if (baseRevision) targets.target.baseRevision = baseRevision;
  for (const [name, declaration] of Object.entries(manifest.components ?? {})) {
    if (!components[name] || !isAbsolute(components[name])) {
      issues.push(`Missing --component ${name}=absolute-checkout-path`);
      continue;
    }
    workspaces[name] = components[name];
    capture(name,components[name],declaration.repository);
  }
  for (const name of manifest.inputs ?? []) if (!inputVersions[name]) issues.push(`Missing --input ${name}=version`);
  const identity = {manifestSha256:hash(raw),targets:sorted(targets),features:selected,inputVersions:sorted(inputVersions)};
  const plan = {...identity,identity:hash(JSON.stringify(identity)),checks,issues};
  if (planOnly) return {plan};
  await mkdir(output,{recursive:true});
  const results = [];
  const environment = `platform=${process.platform}/${process.arch}; node=${process.version}; runner=${hash(await readFile(new URL(import.meta.url)))}; inputs=${JSON.stringify(sorted(inputVersions))}`;
  // Secrets are inherited by the child, never serialized or printed by this runner.
  const env = {...process.env};
  if (workspaces.web) env.TEST_WEB_DIRECTORY = workspaces.web;
  if (workspaces.api) env.TEST_API_DIRECTORY = workspaces.api;
  for (const check of checks) {
    if (!/^[a-z][a-z0-9_.-]{0,99}$/.test(check.id) || !Array.isArray(check.command) || !check.command.length ||
      !check.command.every(value => typeof value === "string" && value.length > 0) || !Array.isArray(check.properties) || !check.properties.length ||
      !Number.isInteger(check.timeoutSeconds) || check.timeoutSeconds < 1 || check.timeoutSeconds > 7200) throw Error("Invalid check definition");
    const missing = (check.requires ?? []).filter(key => !env[key]);
    const platformUnavailable = check.platforms && !check.platforms.includes(process.platform);
    const log = join(output,`${check.id}.log`);
    let exitCode = null, failureType, status = "incomplete";
    if (issues.some(issue => !issue.startsWith("Uncommitted ")) || missing.length || platformUnavailable) {
      failureType = "environment";
      await writeFile(log,[...issues,...missing.map(name => `Missing environment ${name}`),
        ...(platformUnavailable ? [`Required platforms: ${check.platforms.join(",")}; actual: ${process.platform}`] : [])].join("\n")+"\n");
    } else {
      const file = await open(log,"w");
      const [program,...commandArgs] = check.command;
      const executable = program === "node" ? process.execPath : program === "python3" ? env.PYTHON ?? program : program;
      const result = await new Promise(resolveResult => {
        const child = spawn(executable,commandArgs,{cwd:root,env,stdio:["ignore",file.fd,file.fd],windowsHide:true,timeout:check.timeoutSeconds*1000,killSignal:"SIGKILL"});
        child.once("error",error => resolveResult({error}));
        child.once("close",(code,signal) => resolveResult({code,signal}));
      });
      await file.close();
      if (result.error || result.signal) {
        failureType = "environment";
        await writeFile(log,`\nExecution unavailable: ${result.error?.code ?? result.signal}\n`,{flag:"a"});
      } else {
        exitCode = result.code;
        const text = await readFile(log,"utf8");
        // Zero tests, explicit skips, neutral and missing environments do not discharge obligations.
        const skipped = /(?:#|ℹ)\s*(?:skipped|todo|cancelled)\s+[1-9]\d*|# tests 0\b|ℹ tests 0\b|test result: ok\. 0 passed|Ran 0 tests\b|OK \(skipped=[1-9]/.test(text);
        status = exitCode === 0 && !skipped ? "passed" : exitCode === 0 || exitCode === 78 ? "incomplete" : "failed";
        if (status !== "passed") failureType = exitCode === 78 ? "environment" : exitCode === 0 ? "not_run" : "product";
      }
    }
    results.push({check:check.id,status,source:"caller_reported",command:check.command,environment,exitCode,
      ...(failureType ? {failureType} : {}),assertions:check.properties.map(property => ({property,status,evidence:[log]})),artifacts:[log]});
    process.stdout.write(`${check.id}: ${status}\n`);
  }
  // Changes during execution invalidate every result, including companion updates.
  for (const [name,directory] of Object.entries(workspaces)) {
    if (git(directory,["rev-parse","HEAD"]) !== targets[name]?.revision || git(directory,["status","--porcelain","--untracked-files=normal"])) {
      for (const result of results) { result.status = "incomplete"; result.failureType = "environment"; for (const assertion of result.assertions) assertion.status = "incomplete"; }
      issues.push(`${name} changed while checks ran`);
    }
  }
  const report = {summary:"Project verification execution; read individual checks and logs.",execution:{identity:plan.identity,checks:results}};
  const artifact = {plan,report,executionFile:join(output,"execution.json"),status:results.every(result => result.status === "passed") ? "passed" : results.some(result => result.status === "failed") ? "failed" : "incomplete"};
  await writeFile(join(output,"execution.json"),JSON.stringify(artifact,null,2)+"\n");
  return artifact;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  verifyProject().then(result => {
    if (result.plan && !result.report) process.stdout.write(JSON.stringify(result,null,2)+"\n");
    else process.stdout.write(`Evidence: ${result.executionFile} (${result.status})\n`);
    if (result.status && result.status !== "passed") process.exitCode = 1;
  }).catch(error => { console.error(error.message); process.exitCode = 1; });
}
