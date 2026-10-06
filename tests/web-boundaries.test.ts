import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { scanWebBoundaries } from "../scripts/check-web-boundaries.mjs";

test("Web checker follows aliases, static imports, re-exports and config/build edges", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "competition-web-boundary-"));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const write = (file: string, text: string) => {fs.mkdirSync(path.dirname(path.join(root,file)), {recursive:true}); fs.writeFileSync(path.join(root,file),text);};
  write("package.json", "{}");
  write("tsconfig.json", JSON.stringify({compilerOptions:{baseUrl:".",paths:{"@/*":["src/*"],"hidden":["support/implementation.ts"]}}}));
  write("src/app/(dashboard)/admin/security/actions/page.tsx", 'export default function Page(){return null}');
  write("src/page.tsx", 'import {value} from "@/dto"; export default function Page(){return value}');
  write("src/dto.ts", 'export const value = "actions"');
  assert.deepEqual(scanWebBoundaries(root, {dependencies:false}), []);
  const cases = [
    ["src/page.tsx", 'import "hidden"'],
    ["src/page.tsx", 'export * from "hidden"'],
    ["src/page.tsx", 'const data=import("hidden")'],
    ["src/page.tsx", 'const name="hidden"; import(name)'],
    ["src/page.tsx", 'const data=require("pg")'],
    ["next.config.ts", 'import "hidden"; export default {}'],
    ["scripts/build.mjs", 'export * from "hidden"'],
    ["src/page.tsx", '"use server"; export async function action(){}'],
    ["src/page.tsx", 'const secret=process.env.AUTH_SECRET'],
    ["src/page.tsx", 'export type Secret=import("next-auth/jwt").JWT'],
    ["src/actions/task.ts", 'export const value=1'],
  ];
  for (const [file, source] of cases) {
    write("support/implementation.ts", source.includes('"hidden"') ? 'import "drizzle-orm"' : 'export const value=1');
    write(file, source);
    assert.ok(scanWebBoundaries(root, {dependencies:false}).length, file + ": " + source);
    fs.rmSync(path.join(root,file));
  }
  // A file outside src is reachable through an otherwise innocent alias.
  fs.rmSync(path.join(root,"support/implementation.ts"));
  write("src/page.tsx", 'export * from "../../outside"');
  assert.ok(scanWebBoundaries(root, {dependencies:false}).some((message: string) => /unresolved|escapes/.test(message)));
});

test("installed dependency graph rejects hidden backend dependencies and development adapters", t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "competition-web-dependency-"));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  const write = (file: string, value: object) => {fs.mkdirSync(path.dirname(path.join(root,file)), {recursive:true}); fs.writeFileSync(path.join(root,file),JSON.stringify(value));};
  write("tsconfig.json", {}); write("package.json", {dependencies:{safe:"1"}});
  write("node_modules/safe/package.json", {name:"safe",dependencies:{nested:"1"}});
  write("node_modules/nested/package.json", {name:"nested"});
  assert.deepEqual(scanWebBoundaries(root), []);
  write("node_modules/nested/package.json", {name:"nested", dependencies:{pg:"1"}});
  write("node_modules/pg/package.json", {name:"pg"});
  assert.ok(scanWebBoundaries(root).some((message: string) => /transitive backend dependency: pg/.test(message)));
  write("package.json", {devDependencies:{"@auth/drizzle-adapter":"1"}});
  assert.ok(scanWebBoundaries(root, {dependencies:false}).some((message: string) => /backend dependency/.test(message)));
});

test("resolved local modules cannot escape the Web checkout", t => {
  const temporary=fs.mkdtempSync(path.join(os.tmpdir(),"competition-web-escape-"));
  t.after(()=>fs.rmSync(temporary,{recursive:true,force:true}));
  const root=path.join(temporary,"web");fs.mkdirSync(path.join(root,"src"),{recursive:true});
  fs.writeFileSync(path.join(root,"package.json"),"{}");fs.writeFileSync(path.join(root,"tsconfig.json"),"{}");
  fs.writeFileSync(path.join(temporary,"backend.ts"),'export const secret=1');
  fs.writeFileSync(path.join(root,"src/page.tsx"),'export * from "../../backend"');
  assert.ok(scanWebBoundaries(root,{dependencies:false}).some((message: string)=>/resolved module escapes/.test(message)));
});
