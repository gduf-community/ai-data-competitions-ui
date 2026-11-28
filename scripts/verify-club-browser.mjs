import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, join, isAbsolute } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright-core";

const api = process.env.TEST_API_DIRECTORY;
if (!api || !isAbsolute(api) || !process.env.TEST_DATABASE_URL || !process.env.TEST_BROWSER_EXECUTABLE) {
  throw Error("Set TEST_API_DIRECTORY, loopback TEST_DATABASE_URL and TEST_BROWSER_EXECUTABLE; build both checkouts first.");
}
const output = resolve(".verification/browser");
await mkdir(output,{recursive:true});
const temporary = await mkdtemp(join(output,"session-"));
const fixture = join(temporary,"fixture.json"), done = join(temporary,"done");
const child = spawn(process.execPath,["--import","tsx","--test","--test-name-pattern","^club browser verification fixture$","tests/runtime/security-http.test.ts"],{
  cwd:api,windowsHide:true,stdio:["ignore","pipe","pipe"],env:{...process.env,TEST_WEB_DIRECTORY:process.cwd(),
    TEST_BROWSER_DONE_FILE:done,TEST_CLUB_BROWSER_FIXTURE:fixture},
});
let log = "", browser;
child.stdout.on("data",chunk => { log += chunk; }); child.stderr.on("data",chunk => { log += chunk; });
const exited = new Promise(resolveExit => { child.once("error",error => resolveExit({error})); child.once("exit",code => resolveExit({code})); });
try {
  let data;
  for (let attempt=0;attempt<600;attempt++) {
    if (child.exitCode !== null) throw Error(`API fixture failed: ${log.slice(-3000)}`);
    try { data = JSON.parse(await readFile(fixture,"utf8")); break; } catch { await delay(100); }
  }
  assert.ok(data,"Paired API fixture did not start");
  browser = await chromium.launch({headless:true,executablePath:process.env.TEST_BROWSER_EXECUTABLE});
  console.log(`Browser: ${browser.version()}; API/Web use this check's paired fixture`);
  const page = await browser.newPage({viewport:{width:1280,height:900}});
  const title = page.locator('input[name="title"]:visible');
  page.setDefaultTimeout(20000);
  page.on("dialog",dialog => dialog.accept());
  const errors=[]; page.on("pageerror",error => errors.push(error.message));
  await page.goto(data.origin+"/sign-in");
  await page.getByLabel("邮箱",{exact:true}).fill("browser-admin@example.invalid");
  await page.locator('input[name="password"]').fill("synthetic-browser-password-99");
  await page.getByRole("button",{name:"登录",exact:true}).click();
  await page.waitForURL(url => !url.pathname.includes("sign-in"));
  const base = `/api/admin/clubs/${data.clubSlug}/contents/${data.contentId}`;
  const editor = `${data.origin}/admin/clubs/${data.clubSlug}/contents/${data.contentId}/edit`;
  const send = async (path,method,body) => {
    const csrf = (await page.context().cookies()).find(cookie => cookie.name === "competition_csrf_token");
    assert.ok(csrf,"Real login must issue a CSRF cookie");
    const response=await page.evaluate(async ({path,method,body,csrf}) => {
      const result=await fetch(path,{method,credentials:"same-origin",headers:{"x-csrf-token":csrf,"content-type":"application/json"},
        ...(body===undefined ? {} : {body:JSON.stringify(body)})});
      return {status:result.status,data:await result.json()};
    },{path,method,body,csrf:csrf.value});
    assert.ok(response.status>=200 && response.status<300,JSON.stringify(response)); return response.data;
  };
  await page.goto(editor);
  await title.fill("治理浏览器已保存草稿");
  await page.getByRole("button",{name:"保存",exact:true}).click();
  await page.waitForURL(url => url.pathname.endsWith("/contents"));
  await page.goto(editor);
  assert.equal(await title.inputValue(),"治理浏览器已保存草稿");
  const current=await send(base,"GET");
  await send(base,"PATCH",{expectedRevision:current.data.revision,title:"治理远端并发标题"});
  await title.fill("治理本地输入必须保留");
  const conflict=page.waitForResponse(response => response.request().method()==="PATCH" && response.url().endsWith(base));
  await page.getByRole("button",{name:"保存",exact:true}).click();
  assert.equal((await conflict).status(),409);
  await page.getByRole("region",{name:"内容冲突核对"}).waitFor();
  assert.equal(await title.inputValue(),"治理本地输入必须保留");
  await page.screenshot({path:join(output,"conflict.png"),fullPage:true});
  await page.getByRole("button",{name:"读取最新内容",exact:true}).click();
  await page.getByRole("button",{name:"已核对，合并后继续编辑",exact:true}).click();
  assert.equal(await title.inputValue(),"治理本地输入必须保留");
  await page.getByRole("button",{name:"保存并发布",exact:true}).click();
  await page.waitForURL(url => url.pathname.endsWith("/contents"));
  const published = await send(base,"GET");
  assert.equal(published.data.status,"published"); assert.equal(published.data.title,"治理本地输入必须保留");
  await page.goto(`${data.origin}/clubs/${data.clubSlug}/${data.contentId}`);
  await page.getByRole("heading",{name:"治理本地输入必须保留",exact:true}).waitFor();
  await page.screenshot({path:join(output,"published.png"),fullPage:true});
  await page.goto(editor);
  await title.fill("撤权后的输入也必须保留");
  const session = await send("/api/me/session","GET");
  await send(`/api/admin/users/${session.user.id}`,"PATCH",{roleAssignments:[{role:"student_user"}]});
  const denied=page.waitForResponse(response => response.request().method()==="PATCH" && response.url().endsWith(base));
  await page.getByRole("button",{name:"保存并更新公开内容",exact:true}).click();
  assert.equal((await denied).status(),403);
  assert.equal(await title.inputValue(),"撤权后的输入也必须保留");
  await page.screenshot({path:join(output,"revoked.png"),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log("Browser assertions passed: draft save/reopen; real concurrent 409/input preservation; explicit reconciliation; save/publish/public read; current revocation/input preservation.");
} finally {
  if (browser) await browser.close();
  await writeFile(done,"done\n");
  const result = await Promise.race([exited,delay(30000).then(()=>({timeout:true}))]);
  await writeFile(join(output,"api-fixture.log"),log);
  if (result.timeout) { child.kill(); throw Error("API fixture cleanup timed out"); }
  if (result.error || result.code !== 0) throw result.error ?? Error(`API fixture failed: ${result.code}; read api-fixture.log`);
}
