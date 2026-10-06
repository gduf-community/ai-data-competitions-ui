import assert from "node:assert/strict";
import { test } from "node:test";
import { forwardedHeaders, isPublicRead, permittedBrowserRequest, type TransportConfig } from "../src/lib/web-transport";

const config: TransportConfig = {api:new URL("http://127.0.0.1:3001"),web:new URL("https://business.example.invalid"),business:true,clientIpHeader:undefined};
test("foreign authority cannot be promoted by browser forwarding headers",()=>{
  const request=new Request("https://business.example.invalid/api/applications",{method:"POST",headers:{host:config.web.host,origin:"https://attacker.example.invalid","x-forwarded-host":"business.example.invalid","x-forwarded-proto":"https"}});
  assert.equal(permittedBrowserRequest(request,config),false);
  const headers=forwardedHeaders(request.headers,config);
  assert.equal(headers.get("x-forwarded-host"),config.web.host);
  assert.equal(headers.get("origin"),"https://attacker.example.invalid");
});
test("public preview cannot forward cookies or access private reads and writes",()=>{
  const preview={...config,business:false};
  const headers=forwardedHeaders(new Headers({cookie:"authjs.session-token=synthetic","x-forwarded-host":"attacker.invalid"}),preview);
  assert.equal(headers.get("cookie"),null);
  for(const [method,path] of [["GET","/api/me/session"],["GET","/api/admin/users"],["POST","/api/questions/commands"]]) assert.equal(permittedBrowserRequest(new Request(config.web.origin+path,{method}),preview),false);
  assert.equal(permittedBrowserRequest(new Request(config.web.origin+"/api/homepage"),preview),true);
});
test("only the explicitly selected ingress IP header is relayed",()=>{
  const headers=forwardedHeaders(new Headers({"cf-connecting-ip":"spoofed","x-forwarded-for":"192.0.2.25","forwarded":"host=spoofed;proto=http"}),{...config,clientIpHeader:"x-forwarded-for"});
  assert.equal(headers.get("x-forwarded-for"),"192.0.2.25");
  assert.equal(headers.get("cf-connecting-ip"),null);
  assert.equal(headers.get("forwarded"),null);
});

test("malformed and multi-hop client IPs cannot select a trusted identity",()=>{
  for(const ip of ["127.0.0.1, 203.0.113.42","unknown","999.2.3.4","[::1]:443"]) assert.throws(()=>forwardedHeaders(new Headers({"x-real-ip":ip}),{...config,clientIpHeader:"x-real-ip"}),/one valid IP/);
  assert.equal(forwardedHeaders(new Headers({"x-real-ip":"2001:db8::1","x-forwarded-for":"127.0.0.1","x-geo-province":"GD"}),{...config,clientIpHeader:"x-real-ip"}).get("x-forwarded-for"),"2001:db8::1");
});

test("preview relays versioned assets and public legacy references without admitting private file routes",()=>{
  const preview={...config,business:false};
  for (const path of ["/api/portal/assets?key=uploads/public/award/test/file.png&version="+"a".repeat(64),"/api/uploads?key=uploads%2Fpublic%2Fclub%2Ftest%2Ffile.png"]) {
    assert.equal(isPublicRead(path),true);
    assert.equal(permittedBrowserRequest(new Request(config.web.origin+path),preview),true);
  }
  for (const path of ["/api/uploads","/api/uploads/public/file.png","/api/uploads?key=uploads/private/avatar/user-test/file.png","/api/uploads?key=uploads/public/club/test/../file.png","/api/uploads?key=uploads/public/club/test/file.png&key=other"]) assert.equal(isPublicRead(path),false);
});
