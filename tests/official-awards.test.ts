import assert from "node:assert/strict";
import { test } from "node:test";

import {
  awardFilterKey,
  buildAwardQuery,
  countVerifiedMembers,
  exportErrorMessage,
  flattenAwardMembers,
  filenameMatchesFormat,
  isAttachmentDisposition,
  isExportContentType,
  parseContentDispositionFilename,
  parseOfficialAwardList,
  type OfficialAwardMember,
  type OfficialAwardRow,
} from "../src/lib/contracts/official-awards";
import { buildAwardCorrection, toDrafts } from "../src/lib/official-awards/members";

const member = (overrides: Partial<OfficialAwardMember> = {}): OfficialAwardMember => ({
  memberId: "c0ffee00-4000-8000-9000-000000000001",
  personId: "9f8e7d6c-4000-8000-9000-000000000001",
  name: "何子轩",
  grade: "2025级",
  college: "经济贸易学院",
  major: "国际经济与贸易",
  verification: "verified",
  source: "official",
  ...overrides,
});

const award = (overrides: Partial<OfficialAwardRow> = {}): OfficialAwardRow => ({
  awardId: "a0a0a0a0-4000-8000-9000-000000000001",
  version: 1,
  awardYear: 2026,
  levelRaw: "二等奖（省级）",
  levelCode: "second",
  subTrack: "数据挖掘",
  teamName: "2026·数据挖掘·01 队",
  memberCount: 2,
  members: [member(), member({ memberId: "m-2", personId: null, name: "吴嘉怡", verification: "unverified" })],
  advisors: [{ advisorId: "a-1", name: "梁晓彤", college: "计算机学院", source: "official" }],
  source: "official",
  sourceRef: "official-2026-001.pdf#p2",
  confirmedAt: "2026-10-20T09:00:00+08:00",
  voided: false,
  voidReason: null,
  ...overrides,
});

test("buildAwardQuery 省略 all 与空值，只在分页时带 cursor/limit", () => {
  assert.equal(buildAwardQuery({ year: "all", level: "all", subTrack: "all", q: "  " }), "");
  assert.equal(
    buildAwardQuery({ year: "2026", level: "second", subTrack: "数据挖掘", q: " 何 " }),
    "year=2026&level=second&subTrack=%E6%95%B0%E6%8D%AE%E6%8C%96%E6%8E%98&q=%E4%BD%95",
  );
  assert.equal(buildAwardQuery({ year: "2026" }, { cursor: "MjA=", limit: 20 }), "year=2026&cursor=MjA%3D&limit=20");
});

test("awardFilterKey 不受分页影响，导出与列表共用同一筛选指纹", () => {
  const filters = { year: "2026", level: "first" };
  assert.equal(awardFilterKey(filters), awardFilterKey({ ...filters }));
  assert.notEqual(awardFilterKey(filters), awardFilterKey({ ...filters, level: "second" }));
});

test("countVerifiedMembers 只对已核实的 personId 去重，同名不合并", () => {
  const samePerson = [
    member(),
    member({ memberId: "m-2" }),
    member({ memberId: "m-3", personId: null, name: "何子轩", verification: "unverified" }),
    member({ memberId: "m-4", personId: null, name: "匿名成员", verification: "anonymous" }),
  ];
  assert.equal(countVerifiedMembers(samePerson), 1);

  const twoPeople = [member(), member({ memberId: "m-2", personId: "9f8e7d6c-4000-8000-9000-000000000002" })];
  assert.equal(countVerifiedMembers(twoPeople), 2);

  // 同名同院但 personId 不同，必须算两个人，不能按姓名合并。
  const sameNameDifferentPerson = [
    member(),
    member({ memberId: "m-2", personId: "9f8e7d6c-4000-8000-9000-000000000003" }),
  ];
  assert.equal(countVerifiedMembers(sameNameDifferentPerson), 2);
  assert.equal(countVerifiedMembers([member({ personId: null, verification: "anonymous" })]), 0);
});

test("导出必须是 attachment 且扩展名与格式一致", () => {
  const csv = "attachment; filename=\"awards.csv\"; filename*=UTF-8''awards.csv";
  assert.equal(isAttachmentDisposition(csv), true);
  assert.equal(isAttachmentDisposition("inline"), false);
  assert.equal(isAttachmentDisposition(null), false);
  assert.equal(filenameMatchesFormat("awards.csv", "csv"), true);
  assert.equal(filenameMatchesFormat("awards.xlsx", "csv"), false);
  assert.equal(filenameMatchesFormat(null, "xlsx"), false);
});

test("parseContentDispositionFilename 优先 RFC 5987，其次兼容引号与裸值", () => {
  const name = "广东省_按奖项.csv";
  const encoded = `attachment; filename="official-awards.csv"; filename*=UTF-8''${encodeURIComponent(name)}`;
  assert.equal(parseContentDispositionFilename(encoded), name);
  assert.equal(parseContentDispositionFilename('attachment; filename="awards.xlsx"'), "awards.xlsx");
  assert.equal(parseContentDispositionFilename("attachment; filename=awards.csv"), "awards.csv");
  assert.equal(parseContentDispositionFilename(null), null);
});

test("严格 MIME：octet-stream 与旧 XLS 都不再接受", () => {
  assert.equal(isExportContentType("text/csv; charset=utf-8", "csv"), true);
  assert.equal(isExportContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"), true);
  assert.equal(isExportContentType("application/octet-stream", "xlsx"), false);
  assert.equal(isExportContentType("application/vnd.ms-excel", "xlsx"), false);
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
  const rows = flattenAwardMembers([award(), award({ awardId: "award-2", members: [] })]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].name, "何子轩");
  assert.equal(rows[0].levelCode, "second");
  assert.equal(rows[1].verification, "unverified");
});

test("真实 HTTP DTO 通过唯一适配器转换，拒绝旧假 DTO 与错误作用域", () => {
  const competitionId = "10000000-0000-4000-8000-000000000001";
  const row = award({ members: [member()], advisors: [] });
  const payload = { competitionId, rowCount: 1, hasMore: false, nextCursor: null,
    summary: { awardCount: 1, memberCount: 1, verifiedPersonCount: 1, unverifiedMemberCount: 0 }, permissions: { canExport: true, canCorrect: true, canVoid: true },
    items: [{ awardId: row.awardId, competitionId, originBatchId: competitionId, version: 1, awardYear: 2026, levelRaw: '二等奖', levelCode: 'second', subTrack: null, teamName: null, confirmedAt: '2026-10-20T01:00:00Z', status: 'confirmed',
      members: [{ memberId: member().memberId, personId: member().personId, displayName: '何子轩', grade: '2025级', college: '经济贸易学院', major: '国际经济与贸易', identityState: 'verified', snapshotSource: 'official' }], advisors: [] }] };
  const parsed = parseOfficialAwardList(payload);
  assert.equal(parsed.items[0].members[0].name, '何子轩'); assert.equal(parsed.summary.verifiedPersonCount, 1);
  assert.equal(parsed.items[0].members[0].verification, 'verified'); assert.equal(parsed.permissions.canExport, true);
  assert.throws(() => parseOfficialAwardList({ ...payload, rowCount: 2 }));
  assert.throws(() => parseOfficialAwardList({ ...payload, items: [{ ...payload.items[0], competitionId: '20000000-0000-4000-8000-000000000001' }] }));
  assert.throws(() => parseOfficialAwardList({ ...payload, summary: { awardCount: 1, memberCount: 1, verifiedMemberCount: 1, draftPending: 0 } }));
});

test("PATCH 只发送 API 命令与用户修改字段，保留并发新增和同名老师 ID", () => {
  const base = award({ members: [member()], advisors: [{ advisorId: 'a-1', name: '同名老师', college: null, source: 'official' }, { advisorId: 'a-2', name: '同名老师', college: null, source: 'official' }] });
  const latest = award({ ...base, version: 2, teamName: '他人更正团队', members: [{ ...base.members[0], college: '他人更正学院' }, member({ memberId: 'm-new', name: '他人新增' })], advisors: [...base.advisors, { advisorId: 'a-new', name: '他人新增老师', college: null, source: 'manual' }] });
  const drafts = toDrafts(base.members); drafts[0].grade = '更正年级';
  const payload = buildAwardCorrection(base, latest, { levelCode: base.levelCode, subTrack: base.subTrack!, teamName: base.teamName!, reason: '核对', members: drafts, advisors: [{ advisorId: 'a-2', name: '同名老师', college: '' }] });
  assert.deepEqual(payload.fields, {}); assert.equal(payload.expectedVersion, 2);
  assert.deepEqual(payload.members, [{ operation: 'update', memberId: member().memberId, fields: { grade: '更正年级' } }]);
  assert.deepEqual(payload.advisors.map(a => a.advisorId), ['a-2', 'a-new']);
  assert.ok(payload.advisors.every(a => a.decision === 'manual' && !('college' in a)));
  assert.equal('removedMemberIds' in payload, false); assert.equal('levelCode' in payload, false);
});
