import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { controls, matrix, revisionFiles, sourceGraph, checkInheritance, checkAudit, checkSarif } from "../scripts/check-security.mjs";

test("security baseline reads real git blobs and refuses option-like revisions", () => {
  const root = process.cwd(), head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const files = revisionFiles(root, head);
  assert.ok(files.size > 0);
  const first = files.keys().next().value;
  assert.equal(files.get(first), execFileSync("git", ["show", `${head}:${first}`], { encoding: "utf8" }).replaceAll("\r\n", "\n"));
  assert.throws(() => revisionFiles(root, "--output=unsafe"), /complete commit SHA/);
});

const entry = "src/app/api/sample/route.ts";
const guard = "src/lib/security/api-guard.ts#withApiGuard";
const negative = { file: "tests/unit/sample.test.ts", name: "denies anonymous and foreign objects" };
const waiver = "not-applicable: This isolated read-only synthetic fixture has no business data or state to mutate.";
function fixture(route = 'import { withApiGuard as guarded } from "@/lib/security/api-guard"; export async function POST(request) { return guarded(request,{auth:true},async()=>new Response("ok")); }') {
  const files = new Map([[entry, route], ["src/lib/security/api-guard.ts", "export async function withApiGuard(request, options, handler) { return handler(); }"], [negative.file, `import {test} from "node:test"; test(${JSON.stringify(negative.name)},()=>{});`]]);
  const proof = { controls: { ...Object.fromEntries(controls.map(name => [name, waiver])), authentication: guard } };
  const policy = { version: 1, unit: "api", baseline: {}, regressionMatrix: Object.fromEntries(matrix.api.map(name => [name, [negative]])), reviews: [{ entry, sha256: sourceGraph(files).entries.get(entry).digest, handlers: { POST: proof }, negativeTests: [negative] }] };
  return { files, policy, proof };
}

test("security inheritance rejects uncovered entries and self-approved baselines", () => {
  const { files, policy } = fixture();
  policy.reviews = [];
  policy.baseline = Object.fromEntries([...sourceGraph(files).entries].map(([name, value]) => [name, value.digest]));
  assert.ok(checkInheritance(files, policy, {}, "api").some(message => /needs current security evidence/.test(message)));
});

test("security inheritance follows actual imported aliases and delegated wrappers", () => {
  const { files, policy } = fixture();
  assert.deepEqual(checkInheritance(files, policy, {}, "api"), []);
  files.set("src/app/api/command.ts", 'import {withApiGuard} from "@/lib/security/api-guard"; export function clubContentCommand(){return async request=>withApiGuard(request,{auth:true},async()=>new Response("ok"));}');
  files.set(entry, 'import {clubContentCommand as command} from "../command"; export const POST=command();');
  policy.reviews[0].sha256 = sourceGraph(files).entries.get(entry).digest;
  policy.reviews[0].handlers.POST.controls.authentication = "src/app/api/command.ts#clubContentCommand";
  assert.deepEqual(checkInheritance(files, policy, {}, "api"), []);
});

test("security inheritance rejects commented guards, unused functions and auth false", () => {
  for (const route of [
    `// ${guard}\nexport function POST(){return new Response("ok");}`,
    'import {withApiGuard} from "@/lib/security/api-guard"; function unused(){return withApiGuard(null,{auth:true},()=>{});} export function POST(){return new Response("ok");}',
    'import {withApiGuard} from "@/lib/security/api-guard"; export function POST(request){return withApiGuard(request,{auth:false},()=>new Response("ok"));}',
  ]) {
    const { files, policy } = fixture(route);
    assert.ok(checkInheritance(files, policy, {}, "api").some(message => /authentication evidence/.test(message)));
  }
});

test("security inheritance checks each HTTP method and changed helper closure", () => {
  const { files, policy, proof } = fixture();
  const baseline = Object.fromEntries([...sourceGraph(files).entries].map(([name, state]) => [name, state.digest]));
  files.set("src/lib/security/api-guard.ts", files.get("src/lib/security/api-guard.ts") + "\n// changed authorization");
  assert.ok(checkInheritance(files, policy, baseline, "api").some(message => /needs current/.test(message)));
  files.set(entry, files.get(entry) + '\nexport function GET(){return new Response("unguarded");}');
  policy.reviews[0].sha256 = sourceGraph(files).entries.get(entry).digest;
  policy.reviews[0].handlers.GET = proof;
  assert.ok(checkInheritance(files, policy, {}, "api").some(message => /#GET: authentication/.test(message)));
});

test("security inheritance rejects missing tests, skipped evidence and Server Actions", () => {
  for (const replacement of ["", `test(${JSON.stringify(negative.name)},{skip:true},()=>{});`, `test(${JSON.stringify(negative.name)},{skip:"later"},()=>{});`]) {
    const { files, policy } = fixture(); files.set(negative.file, replacement);
    assert.ok(checkInheritance(files, policy, {}, "api").some(message => /regression|test evidence/.test(message)));
  }
  const { files, policy } = fixture('"use server"; export async function POST(){}');
  assert.ok(checkInheritance(files, policy, {}, "api").some(message => /Server Actions/.test(message)));
});

test("dependency gate fails closed and exceptions bind advisory, package, version and expiry", () => {
  const report = { metadata: { vulnerabilities: {} }, advisories: { one: { github_advisory_id: "GHSA-test-case-only", module_name: "synthetic", severity: "high", findings: [{ version: "1.0.0" }] } } };
  assert.ok(checkAudit({ error: "offline" }, {}).length);
  assert.ok(checkAudit({ metadata: { vulnerabilities: { high: 1 } }, advisories: {} }, {}).length);
  assert.ok(checkAudit({ metadata: { vulnerabilities: {} }, advisories: { one: { severity: "high" } } }, {}).length);
  assert.ok(checkAudit(report, {}).length);
  const policy = { auditExceptions: [{ id: "GHSA-test-case-only", package: "synthetic", version: "1.0.0", expires: "2026-11-26", reason: "Synthetic existing dependency tracked for a controlled compatibility replacement." }] };
  assert.deepEqual(checkAudit(report, policy, "2026-10-26"), []);
  report.advisories.one.findings[0].version = "1.0.1";
  assert.ok(checkAudit(report, policy, "2026-10-26").length);
  assert.ok(checkAudit(report, policy, "2026-12-26").some(message => /Expired/.test(message)));
});

test("SAST gate rejects high findings, failed analysis and malformed reports", () => {
  assert.ok(checkSarif({}, {}).length);
  assert.ok(checkSarif({ runs: [{}] }, {}).length);
  const report = { runs: [{ tool: { driver: { name: "CodeQL", rules: [{ id: "js/synthetic", properties: { "security-severity": "8.1" } }] } }, results: [{ ruleId: "js/synthetic", level: "warning", locations: [{ physicalLocation: { artifactLocation: { uri: "src/sample.ts" }, region: { startLine: 3 } } }] }] }] };
  assert.ok(checkSarif(report, {}).some(message => /Unaccepted SAST/.test(message)));
  report.runs[0].results = [];
  assert.deepEqual(checkSarif(report, {}), []);
  report.runs[0].invocations = [{ executionSuccessful: false }];
  assert.ok(checkSarif(report, {}).length);
});

test("PR security workflow has isolated credentials, immutable scanners and required failures", () => {
  const workflow = fs.readFileSync(".github/workflows/ci.yml", "utf8");
  assert.match(workflow, /pull_request:/);
  assert.doesNotMatch(workflow, /pull_request_target|secrets\.|contents: write|id-token: write|self-hosted/);
  assert.match(workflow, /security-events: write/);
  assert.match(workflow, /gitleaks_8\.30\.1_linux_x64/);
  assert.match(workflow, /551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb/);
  assert.match(workflow, /check-security\.mjs sarif/);
  assert.match(workflow, /SECURITY_RESULT/);
  assert.match(workflow, /SAST_RESULT/);
  for (const [, ref] of workflow.matchAll(/uses:\s+[^\s@]+@([^\s#]+)/g)) assert.match(ref, /^[a-f0-9]{40}$/);
});
