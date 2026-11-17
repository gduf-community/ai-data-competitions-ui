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

test("官方名单 UUID 与 API 的 RFC 9562 输入域一致，路径和方法边界保持", () => {
  const ids = [
    COMPETITION.toUpperCase(),
    ...Array.from({ length: 8 }, (_, index) => `a0a0a0a0-0000-${index + 1}000-9000-000000000001`),
    "00000000-0000-0000-0000-000000000000",
    "ffffffff-ffff-ffff-ffff-ffffffffffff",
  ];
  for (const id of ids) {
    const paths = [
      ["GET", `/api/admin/official-awards/competitions/${id}`],
      ["GET", `/api/admin/official-awards/competitions/${id}/export`],
      ["PATCH", `/api/admin/official-awards/${id}`],
      ["POST", `/api/admin/official-awards/${id}/void`],
    ];
    for (const [method, path] of paths) {
      assert.equal(hasBrowserApiCapability(request(method, path), config), true, `${method} ${path}`);
      assert.equal(hasBrowserApiCapability(request(method, path), { ...config, business: false }), false);
      assert.equal(hasBrowserApiCapability(request("DELETE", path), config), false);
      assert.equal(hasBrowserApiCapability(request(method, path + "/extra"), config), false);
    }
    // 同一 UUID 校验也用于本人奖状成员；仍要求 trusted。
    const memberPath = `/api/me/award-certificates/${id}/members/${id}`;
    assert.equal(hasBrowserApiCapability(request("DELETE", memberPath), config), true);
    assert.equal(hasBrowserApiCapability(request("DELETE", memberPath), { ...config, business: false }), false);
  }
  for (const id of ["award-1", COMPETITION.replace("-4000-", "-9000-"), COMPETITION.replace("-9000-", "-7000-"), COMPETITION + "a", COMPETITION.replaceAll("-", "")]) {
    assert.equal(hasBrowserApiCapability(request("GET", `/api/admin/official-awards/competitions/${id}`), config), false, id);
    assert.equal(hasBrowserApiCapability(request("DELETE", `/api/me/award-certificates/${COMPETITION}/members/${id}`), config), false, id);
  }
});
