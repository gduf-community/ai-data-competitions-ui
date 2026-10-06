import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const forbidden = /^(?:pg(?:\/|$)|postgres(?:\/|$)|drizzle(?:-orm|-kit)(?:\/|$)|@auth\/[^/]+-adapter(?:\/|$)|@aws-sdk\/|bcrypt(?:js)?(?:\/|$)|maxmind(?:\/|$)|next-auth\/(?:jwt|core)(?:\/|$))/;
const credentials = /\b(?:DATABASE_URL|AUTH_SECRET|PGPASSWORD|S3_SECRET_ACCESS_KEY|MINIO_SECRET_KEY|UPSTASH_REDIS_REST_TOKEN|PERSONAL_DATA_ENCRYPTION_KEY)\b/;
const codeFile = /\.(?:[cm]?[jt]sx?|css)$/;
const ownFile = fileURLToPath(import.meta.url);

export function scanWebBoundaries(root, { dependencies = true } = {}) {
  root = fs.realpathSync(root);
  const problems = [], queue = [], seen = new Set();
  const inside = file => file === root || file.startsWith(root + path.sep);
  const relative = file => path.relative(root, file).replaceAll(path.sep, "/");
  const report = (file, message) => problems.push(relative(file) + ": " + message);
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, {withFileTypes:true})) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) { report(file, "source link is not allowed"); continue; }
      if (entry.isDirectory()) walk(file);
      else if (codeFile.test(file)) queue.push(file);
    }
  }
  walk(path.join(root, "src")); walk(path.join(root, "scripts"));
  for (const entry of fs.readdirSync(root, {withFileTypes:true})) if (entry.isFile() && codeFile.test(entry.name)) queue.push(path.join(root, entry.name));
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  if (config.error) report(path.join(root, "tsconfig.json"), "invalid TypeScript configuration");
  const parsed = ts.parseJsonConfigFileContent(config.config ?? {}, ts.sys, root);
  for (const values of Object.values(parsed.options.paths ?? {})) for (const value of values) {
    if (!inside(path.resolve(parsed.options.baseUrl ?? root, value))) report(path.join(root, "tsconfig.json"), "alias escapes repository: " + value);
  }
  for (let i = 0; i < queue.length; i++) {
    const file = fs.realpathSync(queue[i]);
    if (seen.has(file)) continue;
    seen.add(file);
    if (!inside(file)) { report(file, "module escapes repository"); continue; }
    const name = relative(file);
    if (/(?:^|\/)(?:server|actions|db)(?:\/|$)/.test(name) && !name.startsWith("src/app/(dashboard)/admin/security/actions/")) report(file, "backend directory");
    if (/^src\/lib\/(?:auth\/(?:auth|session)|storage\/(?:s3|storage|client))(?:\.|\/|$)/.test(name)) report(file, "backend module");
    const source = fs.readFileSync(file, "utf8");
    // The checker declares these rule names; only its actual imports are scanned below.
    if (file !== ownFile && credentials.test(source)) report(file, "backend credential/configuration");
    if (file.endsWith(".css")) continue;
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    function moduleEdge(expression) {
      if (!expression || !ts.isStringLiteralLike(expression)) { report(file, "module specifier must be static"); return; }
      const value = expression.text;
      if (forbidden.test(value) || value === "next-auth") { report(file, "backend import: " + value); return; }
      const resolved = ts.resolveModuleName(value, file, parsed.options, ts.sys).resolvedModule?.resolvedFileName;
      if (resolved && !inside(fs.realpathSync(resolved))) report(file, "resolved module escapes repository: " + value);
      else if (resolved && /[\\/]node_modules[\\/]/.test(resolved)) {
        const packagePath = fs.realpathSync(resolved).replaceAll(path.sep, "/").split("/node_modules/").at(-1);
        if (forbidden.test(packagePath)) report(file, "resolved backend import: " + value);
      }
      else if (resolved) queue.push(resolved);
      else if (value.startsWith(".") || value.startsWith("@/")) {
        const direct = path.resolve(path.dirname(file), value);
        if (fs.existsSync(direct) && fs.statSync(direct).isFile()) queue.push(direct);
        else report(file, "unresolved local import: " + value);
      }
    }
    function visit(node) {
      if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === "use server") report(file, "Server Action");
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node) && node.moduleSpecifier) moduleEdge(node.moduleSpecifier);
      if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) moduleEdge(node.moduleReference.expression);
      if (ts.isImportTypeNode(node)) moduleEdge(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(node.expression) && node.expression.text === "require" || ts.isPropertyAccessExpression(node.expression) && node.expression.expression.getText(ast) === "require" && node.expression.name.text === "resolve")) moduleEdge(node.arguments[0]);
      ts.forEachChild(node, visit);
    }
    visit(ast);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  for (const [name, command] of Object.entries(manifest.scripts ?? {})) if (/(?:^|[\s"'])\.\.[\\/]/.test(command)) report(path.join(root, "package.json"), "script escapes repository: " + name);
  const packages = Object.keys({...manifest.dependencies, ...manifest.devDependencies, ...manifest.optionalDependencies});
  for (const name of packages) if (forbidden.test(name)) report(path.join(root, "package.json"), "backend dependency: " + name);
  if (dependencies) {
    const pending = packages.map(name => ({name, from:path.join(root, "package.json"), optional:false})), visited = new Set();
    for (let i = 0; i < pending.length; i++) {
      const {name, from, optional} = pending[i];
      if (forbidden.test(name)) report(from, "transitive backend dependency: " + name);
      let located;
      try {
        const packageRequire = createRequire(from);
        for (const directory of packageRequire.resolve.paths(name + "/package.json") ?? []) {
          const candidate = path.join(directory, name, "package.json");
          if (fs.existsSync(candidate)) {located = candidate; break;}
        }
        if (!located) throw new Error("package root missing");
        located = fs.realpathSync(located);
      } catch { if (!optional) report(from, "dependency not installed/resolvable: " + name); continue; }
      if (visited.has(located)) continue;
      visited.add(located);
      const pkg = JSON.parse(fs.readFileSync(located, "utf8"));
      for (const dependency of Object.keys(pkg.dependencies ?? {})) pending.push({name:dependency, from:located, optional:!!pkg.optionalDependencies?.[dependency]});
      for (const dependency of Object.keys(pkg.optionalDependencies ?? {})) pending.push({name:dependency, from:located, optional:true});
    }
  }
  return [...new Set(problems)];
}

if (process.argv[1] && path.resolve(process.argv[1]) === ownFile) {
  const problems = scanWebBoundaries(process.cwd());
  if (problems.length) { console.error(problems.join("\n")); process.exitCode = 1; }
  else console.log("Web source, SSR, aliases, static module edges, config/scripts and installed dependency graph passed.");
}
