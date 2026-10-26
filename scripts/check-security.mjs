import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export const controls = ["authentication", "authorization", "currentPermissions", "origin", "rateLimit", "schema", "bodyLimit", "responseLimit", "cache", "sensitiveData", "audit", "stateMachine"];
export const matrix = {
  api: ["anonymous", "ordinary-user", "revoked-expired", "competition-scope", "club-scope", "other-object", "invalid-state", "replay-concurrency", "large-body", "upload-download", "sensitive-export"],
  web: ["anonymous", "origin", "public-trusted", "upload-download", "sensitive-data"],
};
const policyPath = ".github/security-policy.json";
const code = /\.(?:[cm]?[jt]sx?)$/;
const sha256 = value => createHash("sha256").update(value).digest("hex");
const safePath = name => typeof name === "string" && !name.startsWith("/") && !/[\r\n\\:]/.test(name) && !name.split("/").includes("..");
const git = (root, args, options = {}) => execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024, ...options });

export function workingFiles(root) {
  const names = git(root, ["ls-files", "-z", "--cached", "--others", "--exclude-standard"]).split("\0").filter(Boolean);
  return new Map([...new Set(names)].filter(name => safePath(name) && /\.(?:[cm]?[jt]sx?|sh|ps1)$/.test(name) && fs.existsSync(path.join(root, name)))
    .map(name => {
      if (fs.lstatSync(path.join(root, name)).isSymbolicLink()) throw new Error("Source links cannot enter security analysis: " + name);
      return [name, fs.readFileSync(path.join(root, name), "utf8").replaceAll("\r\n", "\n")];
    }));
}

export function revisionFiles(root, revision) {
  if (!/^[a-f0-9]{40}$/.test(revision)) throw new Error("Security base must be a complete commit SHA");
  const names = git(root, ["ls-tree", "-r", "--name-only", "-z", revision]).split("\0")
    .filter(name => name && safePath(name) && /\.(?:[cm]?[jt]sx?|sh|ps1)$/.test(name));
  const output = git(root, ["cat-file", "--batch"], { encoding: null, input: names.map(name => `${revision}:${name}\n`).join("") });
  let offset = 0;
  return new Map(names.map(name => {
    const end = output.indexOf(10, offset), header = output.subarray(offset, end).toString("utf8");
    const match = /^[a-f0-9]+ blob (\d+)$/.exec(header);
    if (!match) throw new Error("Cannot read security base blob");
    const length = Number(match[1]); offset = end + 1;
    const value = output.subarray(offset, offset + length).toString("utf8").replaceAll("\r\n", "\n");
    offset += length + 1;
    return [name, value];
  }));
}

function bindings(name) {
  return ts.isIdentifier(name) ? [name.text] : name.elements.flatMap(item => ts.isBindingElement(item) ? bindings(item.name) : []);
}

export function sourceGraph(files) {
  const modules = new Map();
  const resolve = (file, value) => {
    const base = value.startsWith("@/") ? "src/" + value.slice(2) : value.startsWith(".") ? path.posix.normalize(path.posix.join(path.posix.dirname(file), value)) : null;
    return base && [base, ...[".ts", ".tsx", ".mjs", ".js", "/index.ts", "/index.tsx", "/index.mjs"].map(ext => base + ext)].find(name => files.has(name));
  };
  for (const [name, text] of files) {
    if (!code.test(name) || name.startsWith("tests/")) continue;
    const ast = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true);
    const imports = new Map(), exports = new Map(), declarations = new Map(), dependencies = new Set(), stars = [];
    let serverAction = false;
    const imported = (node, local, symbol) => {
      const target = resolve(name, node.moduleSpecifier.text);
      if (target) { imports.set(local, { file: target, symbol }); dependencies.add(target); }
    };
    const exported = node => node.modifiers?.some(mod => mod.kind === ts.SyntaxKind.ExportKeyword);
    for (const node of ast.statements) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const clause = node.importClause;
        if (clause?.name) imported(node, clause.name.text, "default");
        if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) imported(node, clause.namedBindings.name.text, "*");
        for (const item of clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : []) imported(node, item.name.text, (item.propertyName ?? item.name).text);
        const target = resolve(name, node.moduleSpecifier.text); if (target) dependencies.add(target);
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
        const target = resolve(name, node.moduleSpecifier.text);
        if (target) {
          dependencies.add(target);
          if (!node.exportClause) stars.push(target);
          else if (ts.isNamespaceExport(node.exportClause)) {
            imports.set(node.exportClause.name.text, { file: target, symbol: "*" });
            exports.set(node.exportClause.name.text, node.exportClause.name.text);
          }
        }
      }
      if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause)) for (const item of node.exportClause.elements) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) imported(node, item.name.text, (item.propertyName ?? item.name).text);
        exports.set(item.name.text, node.moduleSpecifier ? item.name.text : (item.propertyName ?? item.name).text);
      }
      if (ts.isFunctionDeclaration(node) && node.name) { declarations.set(node.name.text, node); if (exported(node)) exports.set(node.name.text, node.name.text); }
      if (ts.isVariableStatement(node)) for (const declaration of node.declarationList.declarations) for (const symbol of bindings(declaration.name)) {
        if (declaration.initializer) declarations.set(symbol, declaration.initializer);
        if (exported(node)) exports.set(symbol, symbol);
      }
    }
    function visit(node) {
      if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === "use server") serverAction = true;
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === "require") && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) {
        const target = resolve(name, node.arguments[0].text); if (target) dependencies.add(target);
      }
      ts.forEachChild(node, visit);
    }
    visit(ast);
    modules.set(name, { ast, imports, exports, declarations, dependencies, stars, serverAction });
  }
  // Expand barrel exports after parsing all files, including chains and cycles.
  for (let pass = 0; pass < modules.size; pass++) {
    let changed = false;
    for (const sourceModule of modules.values()) for (const target of sourceModule.stars) for (const symbol of modules.get(target)?.exports.keys() ?? []) {
      if (symbol === "default" || sourceModule.exports.has(symbol)) continue;
      sourceModule.exports.set(symbol, symbol);
      sourceModule.imports.set(symbol, { file: target, symbol });
      changed = true;
    }
    if (!changed) break;
  }
  function closure(entry, visited = new Set()) {
    if (visited.has(entry)) return visited;
    visited.add(entry); for (const dependency of modules.get(entry)?.dependencies ?? []) closure(dependency, visited);
    return visited;
  }
  const entries = new Map();
  for (const [name, text] of files) {
    const sourceModule = modules.get(name);
    const http = [...(sourceModule?.exports.keys() ?? [])].filter(symbol => /^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS|middleware|proxy)$/.test(symbol));
    if (sourceModule?.serverAction || /^src\/app\/.*\/route\.[jt]s$/.test(name) || name === "src/proxy.ts" || !name.startsWith("src/") && !name.startsWith("tests/") && /\.(?:[cm]?[jt]sx?|sh|ps1)$/.test(name)) {
      const dependencies = [...closure(name)].sort();
      entries.set(name, { methods: http, action: sourceModule?.serverAction ?? false,
        digest: sha256(dependencies.map(file => file + "\0" + (files.get(file) ?? "")).join("\0")), text });
    }
  }
  function witnesses(entry, method) {
    const seen = new Set(), found = new Map();
    function follow(file, symbol) {
      const ref = `${file}#${symbol}`; if (seen.has(ref)) return; seen.add(ref);
      const sourceModule = modules.get(file); if (!sourceModule) return;
      const local = sourceModule.exports.get(symbol) ?? symbol;
      const external = sourceModule.imports.get(local);
      if (external) { follow(external.file, external.symbol); return; }
      const node = symbol === "*" ? sourceModule.ast : sourceModule.declarations.get(local);
      if (!node) return;
      found.set(ref, new Set(controls));
      if (ts.isIdentifier(node)) follow(file, node.text);
      if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
        const binding = sourceModule.imports.get(node.expression.text);
        if (binding) follow(binding.file, binding.symbol === "*" ? node.name.text : binding.symbol);
      }
      const shadowed = new Set();
      for (const parameter of node.parameters ?? []) for (const name of bindings(parameter.name)) shadowed.add(name);
      function visit(current) {
        if (current !== node && ts.isFunctionDeclaration(current)) return;
        if (ts.isCallExpression(current)) {
          const callee = current.expression;
          const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) ? callee.expression.text : null;
          if (name && !shadowed.has(name)) {
            const binding = sourceModule.imports.get(name);
            const target = binding ? { file: binding.file, symbol: binding.symbol === "*" && ts.isPropertyAccessExpression(callee) ? callee.name.text : binding.symbol } : { file, symbol: name };
            follow(target.file, target.symbol);
            if (target.file === "src/lib/security/api-guard.ts" && target.symbol === "withApiGuard") {
              const caps = new Set(["origin", "cache"]), options = current.arguments[1];
              for (const property of options && ts.isObjectLiteralExpression(options) ? options.properties : []) if (ts.isPropertyAssignment(property)) {
                const key = property.name.getText(sourceModule.ast);
                if (key === "auth" && property.initializer.kind === ts.SyntaxKind.TrueKeyword) caps.add("authentication");
                if (key === "requireCurrentAuthorization" && property.initializer.kind === ts.SyntaxKind.TrueKeyword) caps.add("currentPermissions");
                if (key === "rateLimit" && ts.isObjectLiteralExpression(property.initializer)) caps.add("rateLimit");
              }
              found.set(`${target.file}#${target.symbol}`, caps);
            }
          }
        }
        ts.forEachChild(current, visit);
      }
      visit(node);
    }
    const methods = method ? [method] : entries.get(entry)?.methods ?? [];
    if (methods.length) for (const method of methods) follow(entry, method); else follow(entry, "*");
    return found;
  }
  return { entries, witnesses };
}

function testEvidence(files, evidence) {
  if (!evidence || !safePath(evidence.file) || !/^tests\/.+\.test\.(ts|mjs)$/.test(evidence.file) || typeof evidence.name !== "string") return false;
  const source = files.get(evidence.file); if (!source) return false;
  const ast = ts.createSourceFile(evidence.file, source, ts.ScriptTarget.Latest, true);
  let found = false;
  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && ["test", "it"].includes(node.expression.text) && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0]) && node.arguments[0].text === evidence.name) {
      const options = node.arguments[1];
      const skipped = options && ts.isObjectLiteralExpression(options) && options.properties.some(item => ts.isPropertyAssignment(item) && ["skip", "todo"].includes(item.name.getText(ast)) && item.initializer.kind !== ts.SyntaxKind.FalseKeyword);
      if (!skipped) found = true;
    }
    ts.forEachChild(node, visit);
  }
  visit(ast); return found;
}

export function checkInheritance(files, policy, baseline, unit) {
  const problems = [], graph = sourceGraph(files);
  if (policy.version !== 1 || !matrix[unit]) return ["Invalid security policy/unit"];
  for (const category of matrix[unit]) if (!policy.regressionMatrix?.[category]?.length || !policy.regressionMatrix[category].every(item => testEvidence(files, item))) problems.push(`Missing executable negative regression: ${category}`);
  for (const [entry, state] of graph.entries) {
    if (state.action) { problems.push(`${entry}: Server Actions are forbidden by the repository boundary`); continue; }
    if (baseline[entry] === state.digest) continue; // Legacy baseline is not a claim that every control is proven.
    const review = policy.reviews?.find(item => item.entry === entry && item.sha256 === state.digest);
    if (!review) { problems.push(`${entry}: new/affected entry needs current security evidence (${state.digest})`); continue; }
    for (const method of state.methods.length ? state.methods : ["*"]) {
      const witnesses = graph.witnesses(entry, method === "*" ? undefined : method);
      const evidence = method === "*" ? review : review.handlers?.[method];
      for (const control of controls) {
        const proof = evidence?.controls?.[control];
        if (typeof proof !== "string") { problems.push(`${entry}#${method}: missing ${control}`); continue; }
        if (proof.startsWith("not-applicable: ") && proof.slice(16).trim().length >= 20) continue;
        if (!witnesses.get(proof)?.has(control)) problems.push(`${entry}#${method}: ${control} evidence is not an executed/delegated symbol: ${proof}`);
      }
    }
    if (!review.negativeTests?.length || !review.negativeTests.every(item => testEvidence(files, item))) problems.push(`${entry}: missing executable negative test evidence`);
  }
  return problems;
}

function validException(item, now) {
  return typeof item.reason === "string" && item.reason.trim().length >= 20 && /^\d{4}-\d{2}-\d{2}$/.test(item.expires) && item.expires >= now && new Date(item.expires).getTime() - new Date(now).getTime() <= 91 * 86400000;
}
export function checkAudit(report, policy, now = new Date().toISOString().slice(0, 10)) {
  if (report.error || !report.metadata?.vulnerabilities || !report.advisories || Array.isArray(report.advisories)) return ["Dependency audit unavailable or malformed; refusing to pass"];
  const errors = [];
  for (const exception of policy.auditExceptions ?? []) if (!validException(exception, now)) errors.push("Expired/invalid dependency exception");
  for (const advisory of Object.values(report.advisories)) {
    if (!advisory || !["info", "low", "moderate", "high", "critical"].includes(advisory.severity) || !Array.isArray(advisory.findings) || !advisory.findings.length) { errors.push("Malformed dependency advisory"); continue; }
    if (!["moderate", "high", "critical"].includes(advisory.severity)) continue;
    const ghsa = advisory.github_advisory_id ?? /GHSA-[\w-]+/.exec(advisory.url ?? "")?.[0];
    for (const finding of advisory.findings) if (!finding.version || !(policy.auditExceptions ?? []).some(item => item.id === ghsa && item.package === advisory.module_name && item.version === finding.version && validException(item, now))) errors.push(`Unaccepted dependency advisory: ${ghsa ?? advisory.id} ${advisory.module_name}@${finding.version}`);
  }
  if (["moderate", "high", "critical"].some(level => report.metadata.vulnerabilities[level] > 0) && !Object.keys(report.advisories).length) errors.push("Dependency audit counts have no advisory evidence");
  return errors;
}
export function checkSarif(report, policy, now = new Date().toISOString().slice(0, 10)) {
  if (!Array.isArray(report.runs) || !report.runs.length) return ["SAST results missing; refusing to pass"];
  const errors = [];
  for (const exception of policy.sastExceptions ?? []) if (!validException(exception, now)) errors.push("Expired/invalid SAST exception");
  for (const run of report.runs) {
    if (!run.tool?.driver?.name || !Array.isArray(run.results) || run.invocations?.some(item => item.executionSuccessful === false)) errors.push("SAST analysis failed or is malformed");
    for (const result of run.results ?? []) {
      const rule = run.tool?.driver?.rules?.find(item => item.id === result.ruleId);
      if (result.level !== "error" && Number(rule?.properties?.["security-severity"] ?? 0) < 7) continue;
      const location = result.locations?.[0]?.physicalLocation;
      const uri = location?.artifactLocation?.uri ?? "unknown", line = location?.region?.startLine ?? 0;
      const id = sha256(`${result.ruleId}:${uri}:${result.partialFingerprints?.primaryLocationLineHash ?? line}`);
      if (!(policy.sastExceptions ?? []).some(item => item.id === id && validException(item, now))) errors.push(`Unaccepted SAST finding: ${result.ruleId} ${uri}:${line} fingerprint=${id}`);
    }
  }
  return errors;
}

export function main(root, args = process.argv.slice(2)) {
  const policy = JSON.parse(fs.readFileSync(path.join(root, policyPath), "utf8"));
  if (args[0] === "snapshot") return console.log(JSON.stringify(Object.fromEntries([...sourceGraph(workingFiles(root)).entries].map(([name, state]) => [name, state.digest])), null, 2));
  let errors;
  if (args[0] === "audit") errors = checkAudit(JSON.parse(fs.readFileSync(path.resolve(root, args[1]), "utf8")), policy);
  else if (args[0] === "sarif") {
    const directory = path.resolve(root, args[1]);
    const names = fs.readdirSync(directory).filter(name => name.endsWith(".sarif"));
    errors = names.length ? names.flatMap(name => checkSarif(JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")), policy)) : ["No SAST result files"];
  } else {
    const base = process.env.SECURITY_BASE_SHA || git(root, ["rev-parse", "HEAD"]).trim();
    if (!/^[a-f0-9]{40}$/.test(base)) throw new Error("Security base must be a complete commit SHA");
    let baseline;
    const exists = git(root, ["ls-tree", "--name-only", base, "--", policyPath]).trim();
    if (exists) baseline = JSON.parse(git(root, ["show", `${base}:${policyPath}`])).baseline;
    else {
      // The first gate PR must match its actual base, never its own invented baseline.
      const graph = sourceGraph(revisionFiles(root, base));
      baseline = Object.fromEntries([...graph.entries].map(([name, state]) => [name, state.digest]));
    }
    errors = checkInheritance(workingFiles(root), policy, baseline, policy.unit);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(`Security ${args[0] ?? "inheritance"} passed`);
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(process.cwd()); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
