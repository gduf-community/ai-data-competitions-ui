import assert from "node:assert/strict";
import { test } from "node:test";

import {
  awardFilterKey,
  buildAwardQuery,
  exportErrorMessage,
  flattenAwardMembers,
  isExportContentType,
  levelNeedsReview,
  parseContentDispositionFilename,
  type OfficialAwardRow,
} from "../src/lib/contracts/official-awards";

const award = (overrides: Partial<OfficialAwardRow> = {}): OfficialAwardRow => ({
  awardId: "award-0001",
  version: 1,
  awardYear: 2026,
  levelRaw: "二等奖（省级）",
  levelCode: "二等奖",
  subTrack: "数据挖掘",
  teamName: "2026·数据挖掘·01 队",
  memberCount: 2,
  members: [
    { memberId: "m-1", name: "何子轩", grade: "2025级", college: "经济贸易学院", major: "国际经济与贸易", source: "official" },
    { memberId: "m-2", name: "吴嘉怡", grade: "2023级", college: "数学与统计学院", major: "信息与计算科学", source: "application" },
  ],
  advisors: [{ name: "梁晓彤", college: "计算机学院", source: "official" }],
  source: "official",
  sourceRef: "official-2026-001.pdf#p2",
  confirmedAt: "2026-10-19T15:40:00+08:00",
  voided: false,
  voidReason: null,
  ...overrides,
});

test("buildAwardQuery 省略 all 与空值，只在分页时带 cursor/limit", () => {
  assert.equal(buildAwardQuery({ year: "all", level: "all", subTrack: "all", q: "  " }), "");
  assert.equal(buildAwardQuery({ year: "2026", level: "二等奖", subTrack: "数据挖掘", q: " 何 " }), "year=2026&level=%E4%BA%8C%E7%AD%89%E5%A5%96&subTrack=%E6%95%B0%E6%8D%AE%E6%8C%96%E6%8E%98&q=%E4%BD%95");
  assert.equal(buildAwardQuery({ year: "2026" }, { cursor: "MjA=", limit: 20 }), "year=2026&cursor=MjA%3D&limit=20");
});

test("awardFilterKey 不受分页影响，导出与列表共用同一筛选指纹", () => {
  const filters = { year: "2026", level: "一等奖" };
  assert.equal(awardFilterKey(filters), awardFilterKey({ ...filters }));
  assert.notEqual(awardFilterKey(filters), awardFilterKey({ ...filters, level: "二等奖" }));
});

test("parseContentDispositionFilename 优先 RFC 5987，其次兼容引号与裸值", () => {
  const name = "广东省_按奖项.csv";
  const encoded = `attachment; filename="official-awards.csv"; filename*=UTF-8''${encodeURIComponent(name)}`;
  assert.equal(parseContentDispositionFilename(encoded), name);
  assert.equal(parseContentDispositionFilename('attachment; filename="awards.xlsx"'), "awards.xlsx");
  assert.equal(parseContentDispositionFilename("attachment; filename=awards.csv"), "awards.csv");
  assert.equal(parseContentDispositionFilename(null), null);
});

test("isExportContentType 拒绝 JSON/HTML 错误页，只接受真正的文件类型", () => {
  assert.equal(isExportContentType("text/csv; charset=utf-8", "csv"), true);
  assert.equal(isExportContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"), true);
  assert.equal(isExportContentType("application/json; charset=utf-8", "csv"), false);
  assert.equal(isExportContentType("text/html; charset=utf-8", "xlsx"), false);
  assert.equal(isExportContentType("text/csv", "xlsx"), false);
  assert.equal(isExportContentType(null, "csv"), false);
});

test("exportErrorMessage 覆盖 401/403/409/413/429/503", () => {
  assert.match(exportErrorMessage(401), /登录已失效/);
  assert.match(exportErrorMessage(403), /没有导出/);
  assert.match(exportErrorMessage(403, { message: "自定义拒绝原因" }), /自定义拒绝原因/);
  assert.match(exportErrorMessage(409), /已更新/);
  assert.match(exportErrorMessage(413), /500/);
  assert.match(exportErrorMessage(429), /频繁/);
  assert.match(exportErrorMessage(503), /暂时不可用/);
});

test("flattenAwardMembers 把一奖多成员展开成成员视图行", () => {
  const rows = flattenAwardMembers([award(), award({ awardId: "award-0002", members: [] })]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "何子轩");
  assert.equal(rows[0].teamName, "2026·数据挖掘·01 队");
  assert.equal(rows[1].source, "application");
  assert.equal(rows[1].awardId, "award-0001");
});

test("levelNeedsReview 在等级原文与规范等级不一致时提示", () => {
  assert.equal(levelNeedsReview({ levelRaw: "二等奖（省级）", levelCode: "二等奖" }), true);
  assert.equal(levelNeedsReview({ levelRaw: "二等奖", levelCode: "二等奖" }), false);
  assert.equal(levelNeedsReview({ levelRaw: "", levelCode: "二等奖" }), false);
});
