import assert from "node:assert/strict";
import { test } from "node:test";

import { hasBrowserApiCapability, type TransportConfig } from "../src/lib/web-transport";

const config: TransportConfig = {
  api: new URL("http://127.0.0.1:3001"),
  web: new URL("https://business.example.invalid"),
  business: true,
  clientIpHeader: undefined,
  serviceToken: "a".repeat(64),
};

const AWARD = "a0a0a0a0-0000-4000-9000-000000000001";
const COMPETITION = "1a2b3c4d-0000-4000-9000-000000000001";

function request(method: string, path: string) {
  return new Request(config.web.origin + path, {
    method,
    headers: { host: config.web.host, origin: config.web.origin },
  });
}

test("#138 BFF：四个合法路径 + 方法组合放行", () => {
  const allowed: Array<[string, string]> = [
    ["GET", `/api/admin/official-awards/competitions/${COMPETITION}`],
    ["GET", `/api/admin/official-awards/competitions/${COMPETITION}/export`],
    ["PATCH", `/api/admin/official-awards/${AWARD}`],
    ["POST", `/api/admin/official-awards/${AWARD}/void`],
  ];
  for (const [method, path] of allowed) {
    assert.equal(hasBrowserApiCapability(request(method, path), config), true, `${method} ${path} 应放行`);
  }
});

test("#138 BFF：错误方法一律拒绝（含 HEAD 与 DELETE）", () => {
  const rejected: Array<[string, string]> = [
    ["POST", `/api/admin/official-awards/competitions/${COMPETITION}`],
    ["HEAD", `/api/admin/official-awards/competitions/${COMPETITION}`],
    ["HEAD", `/api/admin/official-awards/competitions/${COMPETITION}/export`],
    ["GET", `/api/admin/official-awards/${AWARD}/void`],
    ["DELETE", `/api/admin/official-awards/${AWARD}`],
    ["PUT", `/api/admin/official-awards/${AWARD}`],
    ["POST", `/api/admin/official-awards/competitions/${COMPETITION}/export`],
  ];
  for (const [method, path] of rejected) {
    assert.equal(hasBrowserApiCapability(request(method, path), config), false, `${method} ${path} 应拒绝`);
  }
});

test("#138 BFF：非 UUID 动态段、额外子路径与通配路径拒绝", () => {
  const rejected = [
    "/api/admin/official-awards/imports",
    `/api/admin/official-awards/award-0001`,
    `/api/admin/official-awards/${AWARD}/extra`,
    `/api/admin/official-awards/competitions/${COMPETITION}/export/extra`,
    "/api/admin/official-awards/competitions/comp-ai-2026",
    "/api/admin/official-awards/",
    "/api/admin/official-awards",
  ];
  for (const path of rejected) {
    assert.equal(hasBrowserApiCapability(request("GET", path), config), false, `${path} 应拒绝`);
  }
});
