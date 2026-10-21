import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { stripTypeScriptTypes } from 'node:module';
import { test } from 'node:test';
function load(mocks={}) {
 const source=readFileSync(new URL('../src/lib/signup-code.ts',import.meta.url),'utf8').replace(/\bexport /g,'');
 return vm.runInNewContext(stripTypeScriptTypes(source)+'\n({requestSignupCode})',{AbortSignal,AbortController,TextDecoder,setTimeout,clearTimeout,...mocks});
}
const streamResponse=rows=>new Response(rows.map(x=>JSON.stringify(x)+'\n').join(''),{headers:{'content-type':'application/x-ndjson'}});
test('server started is reported before provider-confirmed success',async()=>{
 const events=[];const {requestSignupCode}=load({fetch:async()=>streamResponse([{state:'sending'},{state:'sent'}])});
 await requestSignupCode('test@example.invalid',()=>events.push('started'),new AbortController().signal);events.push('sent');
 assert.deepEqual(events,['started','sent']);
});
for(const response of [()=>Response.json({message:'failure'},{status:500}),()=>streamResponse([{state:'sending'},{state:'failed',message:'confirmation failed'}]),()=>Response.json({message:'accepted'}),()=>streamResponse([{state:'sending'}])]) test('failure, unconfirmed JSON and truncated stream never count as sent',async()=>{
 const {requestSignupCode}=load({fetch:async()=>response()});await assert.rejects(requestSignupCode('test@example.invalid',()=>{},new AbortController().signal));
});
test('429 cooldown preserved',async()=>{
 const {requestSignupCode}=load({fetch:async()=>Response.json({message:'limited'},{status:429,headers:{'Retry-After':'123'}})});
 await assert.rejects(requestSignupCode('test@example.invalid',()=>{},new AbortController().signal),e=>e.retryAfter===123);
});
test('single 30 second window includes stalled connection; late response ignored',async()=>{
 let expire,finish;let started=0;let fetchSignal;
 const {requestSignupCode}=load({setTimeout:(fn,ms)=>{assert.equal(ms,30000);expire=fn;return 1},clearTimeout:()=>{},fetch:async(_,options)=>{fetchSignal=options.signal;return new Promise(r=>finish=r)}});
 const promise=requestSignupCode('test@example.invalid',()=>started++,new AbortController().signal);
 expire();await assert.rejects(promise,/30秒/);assert.equal(fetchSignal.aborted,true);
 finish(streamResponse([{state:'sending'},{state:'sent'}]));await new Promise(r=>setImmediate(r));assert.equal(started,0);
});
test('30 second timeout covers stream body, not only fetch headers',async()=>{
 let expire;
 const {requestSignupCode}=load({setTimeout:fn=>{expire=fn;return 1},clearTimeout:()=>{},fetch:async()=>new Response(new ReadableStream(),{headers:{'content-type':'application/x-ndjson'}})});
 const promise=requestSignupCode('test@example.invalid',()=>{},new AbortController().signal);
 await Promise.resolve();expire();await assert.rejects(promise,/30秒/);
});
test('component rejects simultaneous clicks before validation and suppresses cancelled completion',async()=>{
 let source=readFileSync(new URL('../src/app/(auth)/sign-up/components/signup-form-1.tsx',import.meta.url),'utf8');
 source=source.slice(source.indexOf('  async function sendVerificationCode()'),source.indexOf('  async function onSubmit('));
 let validate,finish,calls=0; const messages=[];const ref={current:null};
 const run=vm.runInNewContext(stripTypeScriptTypes(source)+'\n sendVerificationCode',{
 AbortController, codeRequest:ref,codeCooldownSeconds:0,setSendingCode:()=>{},setCodeCooldownSeconds:()=>{},
 form:{trigger:()=>new Promise(r=>validate=r),getValues:()=> 'synthetic@example.invalid'},
 setCodeStatus:x=>messages.push(x),toast:{success:x=>messages.push(x),error:x=>messages.push(x)},
 requestSignupCode:async()=>{calls++;return new Promise(r=>finish=r)},
 });
 const first=run();await run();assert.equal(calls,0);
 validate(true);await new Promise(r=>setImmediate(r));assert.equal(calls,1);await run();assert.equal(calls,1);
 ref.current.abort();finish();await first;assert.equal(ref.current,null);
 assert.equal(messages.includes('验证码发出'),false);
});
test('Web relay forwards first state without waiting for terminal state',async()=>{
 let output;
 const upstream=new Response(new ReadableStream({start(c){output=c;c.enqueue(new TextEncoder().encode('{"state":"sending"}\n'))}}),{headers:{'content-type':'application/x-ndjson'}});
 const source=readFileSync(new URL('../src/app/api/[...path]/route.ts',import.meta.url),'utf8').replace(/^import[^\n]*\n/gm,'').replace(/^export \{[^\n]*$/gm,'').replace(/\bexport /g,'');
 const relay=vm.runInNewContext(stripTypeScriptTypes(source)+'\n relay',{
 URL,Response,Headers,getTransportConfig:()=>({api:new URL('https://api.invalid'),web:new URL('https://web.invalid')}),
 hasBrowserApiCapability:()=>true,permittedBrowserRequest:()=>true,validOfficialAwardDownload:()=>true,forwardedHeaders:()=>({}),fetch:async()=>upstream,
 });
 const response=await relay(new Request('https://web.invalid/api/auth/register/send-code',{method:'POST',body:'{}'}));
 const reader=response.body.getReader();assert.match(new TextDecoder().decode((await reader.read()).value),/sending/);
 output.enqueue(new TextEncoder().encode('{"state":"sent"}\n'));output.close();
 assert.match(new TextDecoder().decode((await reader.read()).value),/sent/);
});
test('provider confirmation arriving at 25 seconds succeeds, not at the old 10 second cutoff',async()=>{
 let time=0;const timers=[];
 const later=(fn,ms)=>{const item={fn,at:time+ms};timers.push(item);return item};
 const advance=ms=>{time+=ms;for(const item of timers)if(!item.done&&item.at<=time){item.done=true;item.fn()}};
 const {requestSignupCode}=load({setTimeout:later,clearTimeout:item=>{item.done=true},fetch:async()=>new Promise(resolve=>later(()=>resolve(streamResponse([{state:'sending'},{state:'sent'}])),25000))});
 let complete=false;const pending=requestSignupCode('test@example.invalid',()=>{},new AbortController().signal).then(()=>{complete=true});
 advance(10000);await new Promise(r=>setImmediate(r));assert.equal(complete,false);
 advance(15000);await pending;assert.equal(complete,true);
});
test('known server failure returns immediately without waiting 30 seconds',async()=>{
 let cleared=false;
 const {requestSignupCode}=load({setTimeout:()=>1,clearTimeout:()=>{cleared=true},fetch:async()=>Response.json({message:'rejected'},{status:500})});
 await assert.rejects(requestSignupCode('test@example.invalid',()=>{},new AbortController().signal),/rejected/);assert.equal(cleared,true);
});
