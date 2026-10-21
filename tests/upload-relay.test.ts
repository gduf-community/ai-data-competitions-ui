import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { relayUpload } from '../src/lib/upload-relay';
test('upload-only relay bounds concurrency, forwards bytes and cancels without poisoning the slot',async()=>{
 const server=http.createServer((req,res)=>{let size=0;req.on('data',b=>size+=b.length);req.on('end',()=>setTimeout(()=>{if(!res.destroyed){res.setHeader('content-type','application/json');res.end(JSON.stringify({size}));}},100));});
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();assert.ok(address&&typeof address!=='string');const target=new URL(`http://127.0.0.1:${address.port}/api/uploads`);
 const make=(signal?:AbortSignal)=>new Request('http://fixture.invalid/api/uploads',{method:'POST',body:'synthetic',signal});
 try{
 const locked=make();const reader=locked.body!.getReader();
 await assert.rejects(relayUpload(target,locked,new Headers()));reader.releaseLock();
 const first=relayUpload(target,make(),new Headers());const busy=await relayUpload(target,make(),new Headers());assert.equal(busy.status,503);
 const success=await first;assert.equal(success.status,200);assert.deepEqual(await success.json(),{size:9});
 const controller=new AbortController();const aborted=relayUpload(target,make(controller.signal),new Headers());setTimeout(()=>controller.abort(),20);await assert.rejects(aborted);
 const retry=await relayUpload(target,make(),new Headers());assert.equal(retry.status,200);await retry.arrayBuffer();
 }finally{server.closeAllConnections();await new Promise<void>(r=>server.close(()=>r()));}
});
test('invalid upload timeout is rejected, not silently made unlimited',async()=>{
 const previous=process.env.BFF_UPLOAD_TIMEOUT_SECONDS;process.env.BFF_UPLOAD_TIMEOUT_SECONDS='0';
 try{await assert.rejects(relayUpload(new URL('http://127.0.0.1:1'),new Request('http://fixture.invalid',{method:'POST'}),new Headers()),/Invalid upload timeout/);}finally{if(previous===undefined)delete process.env.BFF_UPLOAD_TIMEOUT_SECONDS;else process.env.BFF_UPLOAD_TIMEOUT_SECONDS=previous;}
});
