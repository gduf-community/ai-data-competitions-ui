import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import tar from "next/dist/compiled/tar/index.js";
import { browserArtifactCredentials } from "./check-web-boundaries.mjs";

const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
function copyDirectory(source, destination) {
  fs.mkdirSync(destination, {recursive:true});
  for (const entry of fs.readdirSync(source, {withFileTypes:true})) {
    const from = path.join(source, entry.name), to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
    else throw new Error("Unexpected link in runtime assets: " + from);
  }
}
export function packageRuntime(root, unit, sha, repository, companion = "") {
  root = fs.realpathSync(root);
  if (!["web", "api"].includes(unit) || !/^[a-f0-9]{40}$/.test(sha) || repository !== "gduf-community/" + (unit === "web" ? "ai-data-competitions-ui" : "competition-Q-A-website") || companion && !/^[a-f0-9]{40}$/.test(companion)) throw new Error("Invalid runtime identity");
  const next = path.join(root, unit === "web" ? ".next" : "build/api/.next");
  const standalone = path.join(next, "standalone");
  const serverDirectory = path.join(standalone, unit === "web" ? "" : "build/api");
  if (!fs.existsSync(path.join(serverDirectory, "server.js"))) throw new Error("Standalone server missing");
  // Web Next tracing is rooted in this checkout. API already copies its runtime assets.
  if (unit === "web") {
    const assets = [path.join(next, "static")];
    for (const directory of assets) for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) assets.push(file);
      else if (/\.[cm]?js$/.test(file) && browserArtifactCredentials.test(fs.readFileSync(file,"utf8"))) throw new Error("Server credential/configuration in Web browser artifact: " + file);
    }
    copyDirectory(path.join(next, "static"), path.join(serverDirectory, ".next/static"));
    if (fs.existsSync(path.join(root, "public"))) copyDirectory(path.join(root, "public"), path.join(serverDirectory, "public"));
  }
  const pending = [standalone], links = [], visited = new Set();
  for (let i = 0; i < pending.length; i++) {
    if (visited.has(pending[i])) continue;
    visited.add(pending[i]);
    for (const entry of fs.readdirSync(pending[i], {withFileTypes:true})) {
    const file = path.join(pending[i], entry.name);
    if (/^\.env(?:\.|$)/.test(entry.name)) throw new Error("Environment file in runtime: " + file);
    if (entry.isSymbolicLink()) {
      links.push(file);
      let target;
      try { target = fs.realpathSync(file); }
      catch (error) {
        const declared = path.resolve(path.dirname(file), fs.readlinkSync(file));
        if (error.code !== "ENOENT" || !declared.startsWith(standalone + path.sep)) throw error;
        target = fs.realpathSync(path.join(root, path.relative(standalone, declared)));
      }
      if (!target.startsWith(standalone + path.sep)) {
        // Next emits source junctions (Windows) or partial pnpm links. Complete from this frozen install.
        const internal = path.join(standalone, path.relative(root, target));
        if (!target.startsWith(path.join(root, "node_modules") + path.sep) || !fs.existsSync(path.join(target, "package.json"))) throw new Error("External runtime dependency link: " + file);
        if (internal === file) { fs.unlinkSync(file); copyDirectory(target, file); pending.push(file); continue; }
        if (!fs.existsSync(internal)) copyDirectory(target, internal);
        pending.push(internal);
        fs.unlinkSync(file);
        fs.symlinkSync(path.relative(path.dirname(file), internal), file, process.platform === "win32" ? "junction" : "dir");
      }
    } else if (entry.isDirectory()) pending.push(file);
  }
  }
  for (const file of links) if (!fs.realpathSync(file).startsWith(standalone + path.sep)) throw new Error("External runtime dependency link: " + file);
  const output = path.resolve(root, "build/release");
  if (path.dirname(output) !== path.join(root, "build")) throw new Error("Unexpected release directory");
  fs.mkdirSync(output, {recursive:true});
  const payload = path.join(output, "runtime.tar.gz");
  const linkTargets = new Map(links.filter(file => fs.lstatSync(file).isSymbolicLink()).map(file => [path.relative(standalone,file).replaceAll(path.sep,"/"),path.relative(path.dirname(file),fs.realpathSync(file)).replaceAll(path.sep,"/")]));
  const intermediate = path.join(output,"runtime-source.tar");
  try {
    // Use Next's pinned tar library. Preserve pnpm's graph; dereferencing changes Node resolution.
    tar.c({file:intermediate,cwd:standalone,sync:true,portable:true},["."]);
    tar.c({file:payload,gzip:true,sync:true,portable:true,filter:(name,entry)=>{
      if (entry.type === "SymbolicLink") {
        const target = linkTargets.get(name.replace(/^\.\//,""));
        if (!target) throw new Error("Unknown runtime link: " + name);
        entry.linkpath = target;
      }
      return true;
    }},["@"+intermediate]);
  } finally { if (fs.existsSync(intermediate)) fs.unlinkSync(intermediate); }
  const manifest = {version:1, unit, repository, sha, companionSha:companion || null, lockSha256:sha256(fs.readFileSync(path.join(root, "pnpm-lock.yaml"))), payloadSha256:sha256(fs.readFileSync(payload)), server:path.relative(standalone, path.join(serverDirectory, "server.js")).replaceAll(path.sep, "/"), node:process.version, platform:process.platform, arch:process.arch};
  fs.writeFileSync(path.join(output, "runtime-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(JSON.stringify(manifest));
  return manifest;
}
async function verifyRuntime(root, manifest) {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "competition-runtime-verify-"));
  let child;
  try {
    const links = [];
    tar.x({file:path.join(root,"build/release/runtime.tar.gz"),cwd:temporary,sync:true,filter:(name,entry)=>{
      if (process.platform === "win32" && entry.type === "SymbolicLink") {links.push({name,target:entry.linkpath});return false;}
      return true;
    }});
    // Windows without developer mode can create junctions; Linux extracts ordinary relative symlinks.
    for (const link of links) {
      const file = path.resolve(temporary,link.name), target = path.resolve(path.dirname(file),link.target);
      if (!file.startsWith(temporary+path.sep) || !target.startsWith(temporary+path.sep)) throw new Error("Archive link escapes runtime");
      fs.mkdirSync(path.dirname(file),{recursive:true});fs.symlinkSync(target,file,"junction");
    }
    const env = Object.fromEntries(["PATH","SystemRoot","ComSpec","TEMP","TMP"].filter(name=>process.env[name]).map(name=>[name,process.env[name]]));
    let output = "";
    child = spawn(process.execPath,[path.join(temporary,manifest.server)],{cwd:temporary,windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...env,NODE_ENV:"production",HOSTNAME:"127.0.0.1",PORT:"55447",WEB_RELEASE_MODE:"public",API_SERVICE_TOKEN:"a".repeat(64),NEXT_TELEMETRY_DISABLED:"1"}});
    for (const stream of [child.stdout,child.stderr]) stream.on("data",data=>{output=(output+String(data)).slice(-8000);});
    let response;
    for (let attempt=0;attempt<100;attempt++) {
      if (child.exitCode !== null) throw new Error("Detached runtime failed: " + output);
      try {response=await fetch("http://127.0.0.1:55447"+(manifest.unit === "web" ? "/sign-in" : "/api/health"),{signal:AbortSignal.timeout(1000)});break;}
      catch {await delay(100);}
    }
    if (!response || response.status !== (manifest.unit === "web" ? 503 : 200)) throw new Error("Detached runtime probe failed: " + output);
    if (manifest.unit === "api" && (await response.json()).status !== "ok") throw new Error("API health payload differs");
    if (manifest.unit === "web" && (await fetch("http://127.0.0.1:55447/api/me/session",{method:"POST"})).status !== 404) throw new Error("Detached public Web admitted a private write");
    console.log("Verified detached " + manifest.unit + " runtime: " + manifest.sha);
  } finally {
    if (child && child.exitCode === null) {const stopped=new Promise(resolve=>child.once("exit",resolve));child.kill();await Promise.race([stopped,delay(5000).then(()=>{throw new Error("Runtime did not stop");})]);}
    if (path.dirname(temporary)!==path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith("competition-runtime-verify-")) throw new Error("Unexpected runtime cleanup directory");
    fs.rmSync(temporary,{recursive:true,force:true});
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const head = spawnSync("git", ["rev-parse", "HEAD"], {encoding:"utf8", windowsHide:true});
  const clean = spawnSync("git", ["diff", "--exit-code", "HEAD", "--"], {encoding:"utf8", windowsHide:true});
  if (head.status !== 0 || head.stdout.trim() !== process.env.GITHUB_SHA || clean.status !== 0) throw new Error("Runtime source must be the unchanged exact candidate SHA");
  const manifest = packageRuntime(process.cwd(), process.argv[2], process.env.GITHUB_SHA, process.env.GITHUB_REPOSITORY, process.env.COMPANION_WEB_SHA);
  await verifyRuntime(process.cwd(), manifest);
}
