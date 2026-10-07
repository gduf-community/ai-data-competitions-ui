import assert from "node:assert/strict";
import { test } from "node:test";
import { forwardedHeaders, permittedPublicServerRead, permittedBrowserRequest, type TransportConfig, getTransportConfig } from "../src/lib/web-transport";

const config: TransportConfig = {api:new URL("http://127.0.0.1:3001"),web:new URL("https://business.example.invalid"),business:true,clientIpHeader:undefined,serviceToken:"a".repeat(64)};
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
  assert.equal(permittedPublicServerRead("/api/homepage"),true);
  assert.equal(permittedBrowserRequest(new Request(config.web.origin+"/api/homepage"),preview),false);
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
    assert.equal(permittedBrowserRequest(new Request(config.web.origin+path),preview),true);
  }
  for (const path of ["/api/uploads","/api/uploads/public/file.png","/api/uploads?key=uploads/private/avatar/user-test/file.png","/api/uploads?key=uploads/public/club/test/../file.png","/api/uploads?key=uploads/public/club/test/file.png&key=other"]) assert.equal(permittedBrowserRequest(new Request(config.web.origin+path),preview),false);
});

test("public DTOs, SQL and unknown endpoints are never browser capabilities in either release", () => {
  const paths = ["/api/competitions", "/api/homepage", "/api/notices/published", "/api/portal/competitions/id", "/api/awards", "/api/awards/id", "/api/hall-of-fame", "/api/profiles/id", "/api/clubs/id/contents", "/api/questions", "/api/questions/id", "/api/admin/analytics/schema", "/api/admin/analytics/sql/run", "/api/admin/analytics/sql/validate", "/api/admin/unknown", "/api/health", "/api/web/access", "/api/security/events/server", "/api/auth/unknown"];
  for (const business of [false, true]) for (const pathname of paths) for (const method of ["GET", "HEAD", "OPTIONS", "POST"]) {
    assert.equal(permittedBrowserRequest(new Request(config.web.origin+pathname, {method, headers:{host:config.web.host,origin:config.web.origin}}), {...config,business}), false, method+" "+pathname);
  }
});

test("interaction paths allow only their declared methods and preserve origin checks", () => {
  for (const [path, method] of [["/api/applications", "POST"], ["/api/questions/commands", "POST"], ["/api/admin/security/situation/live", "GET"], ["/api/auth/callback/credentials", "POST"], ["/api/me/competition-options", "GET"], ["/api/uploads", "POST"]]) {
    assert.equal(permittedBrowserRequest(new Request(config.web.origin+path,{method,headers:{host:config.web.host,origin:config.web.origin}}),config),true);
  }
  for (const [path, method] of [["/api/applications", "GET"], ["/api/questions/commands", "GET"], ["/api/admin/analytics", "POST"], ["/api/admin/security/situation/live", "DELETE"]]) {
    assert.equal(permittedBrowserRequest(new Request(config.web.origin+path,{method,headers:{host:config.web.host,origin:config.web.origin}}),config),false);
  }
});

test("Web creates service authorization and rejects missing or malformed configuration", () => {
  const outgoing = forwardedHeaders(new Headers({authorization:"Bearer attacker",cookie:"session=synthetic"}),config);
  assert.equal(outgoing.get("authorization"),"Bearer "+config.serviceToken);
  assert.equal(forwardedHeaders(new Headers({authorization:"Basic attacker"}), {...config,business:false}).get("authorization"),"Bearer "+config.serviceToken);
  const previous = process.env.API_SERVICE_TOKEN;
  try {
    for (const value of ["", "short", "g".repeat(64), "a".repeat(63)]) {
      process.env.API_SERVICE_TOKEN=value;
      assert.throws(getTransportConfig,/API_SERVICE_TOKEN/);
    }
  } finally { if(previous===undefined) delete process.env.API_SERVICE_TOKEN; else process.env.API_SERVICE_TOKEN=previous; }
});

test("the actual BFF rejects undeclared paths and methods before contacting the API", async () => {
  const values = { API_ORIGIN: config.api.origin, WEB_TRUSTED_ORIGIN: config.web.origin, WEB_RELEASE_MODE: "trusted", API_SERVICE_TOKEN: config.serviceToken, WEB_CLIENT_IP_HEADER: "x-real-ip" };
  const previous = Object.fromEntries(Object.keys(values).map(name => [name,process.env[name]]));
  const originalFetch = globalThis.fetch;
  let requests = 0;
  Object.assign(process.env,values);
  globalThis.fetch = async () => { requests++; return Response.json({unexpected:true}); };
  try {
    const { GET, POST, OPTIONS } = await import("../src/app/api/[...path]/route");
    for (const [method, handler, path] of [["GET",GET,"/api/competitions"],["POST",POST,"/api/admin/analytics/sql/run"],["OPTIONS",OPTIONS,"/api/me/session"]] as const) {
      const denied = await handler(new Request(config.web.origin+path,{method,headers:{host:config.web.host,origin:config.web.origin}}));
      assert.equal(denied.status,404);
      assert.ok(denied.headers.get("cache-control")?.includes("no-store"));
    }
    assert.equal(requests,0);
  } finally {
    globalThis.fetch=originalFetch;
    for(const [name,value] of Object.entries(previous)) if(value===undefined) delete process.env[name]; else process.env[name]=value;
  }
});
