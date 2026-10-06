import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const forbidden = ["pg", "drizzle-orm", "@auth/drizzle-adapter", "@aws-sdk/client-s3", "bcryptjs", "maxmind", "next-auth/jwt"];
const problems = [];
function inspect(directory) {
  for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    const file = path.join(directory,entry.name);
    if (entry.isDirectory()) { if (/^(server|actions|db)$/.test(entry.name) && file.replaceAll("\\", "/") !== "src/app/(dashboard)/admin/security/actions") problems.push(file); inspect(file); continue; }
    if (!/\.(ts|tsx|mjs|css)$/.test(file)) continue;
    const text=fs.readFileSync(file,"utf8");
    if (/\b(DATABASE_URL|AUTH_SECRET|PGPASSWORD|S3_SECRET_ACCESS_KEY|MINIO_SECRET_KEY)\b/.test(text)) problems.push(file+": backend configuration");
    const ast=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);
    function visit(node) {
      if (ts.isExpressionStatement(node) && ts.isStringLiteral(node.expression) && node.expression.text === "use server") problems.push(file+": Action");
      if (ts.isStringLiteralLike(node)) {
        const value=node.text;
        if (/^@\/(server|actions|lib\/(db|server|auth\/(auth|session)$|storage\/(s3|storage|client)))/.test(value) || forbidden.some(item=>value===item || value.startsWith(item+"/"))) problems.push(file+": "+value);
      }
      ts.forEachChild(node,visit);
    }
    visit(ast);
  }
}
inspect("src");
const manifest=JSON.parse(fs.readFileSync("package.json","utf8"));
for(const name of forbidden) if(manifest.dependencies?.[name]) problems.push("dependency: "+name);
if(problems.length) { console.error(problems.join("\n")); process.exit(1); }
console.log("Web source and dependencies contain no backend runtime, Actions or credentials.");
