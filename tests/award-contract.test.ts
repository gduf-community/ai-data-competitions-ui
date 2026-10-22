import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { z } from "zod";

import {
  awardGalleryRowSchema,
  awardMemberCandidateSchema,
  awardMemberRowSchema,
  awardMembersResponseSchema,
  awardShowcaseRowSchema,
  memberSearchResponseSchema,
  myAwardRowSchema,
  publicAwardDetailSchema,
} from "@/lib/contracts/profiles";

// 与 API 仓实际返回形状一致的夹具：id 均为 UUID，日期均为 ISO 字符串。
function memberRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    userId: randomUUID(),
    name: "张三",
    college: "计算机学院",
    ...overrides,
  };
}

function candidateFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    name: "李四",
    college: "信息学院",
    emailMasked: "l***@example.com",
    studentNoMasked: "2021****01",
    ...overrides,
  };
}

function showcaseRowFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    userName: "王五",
    memberNames: ["王五", "张三"],
    competitionId: randomUUID(),
    competitionTitle: "程序设计竞赛",
    awardLevel: "国家级一等奖",
    imageUrl: "/api/uploads?key=uploads/awards/a.png",
    ...overrides,
  };
}

function expectReject(schema: z.ZodType, payload: unknown, path: string) {
  const result = schema.safeParse(payload);
  assert.equal(result.success, false);
  assert.ok(
    result.error?.issues.some((issue) => issue.path.includes(path)),
    `期望在 ${path} 处校验失败，实际 issues: ${JSON.stringify(result.error?.issues)}`,
  );
}

test("奖状成员行契约：解析真实形状、允许空学院、剥离未知字段", () => {
  const row = memberRowFixture();
  assert.deepEqual(awardMemberRowSchema.parse(row), row);

  const withoutCollege = awardMemberRowSchema.parse(memberRowFixture({ college: null }));
  assert.equal(withoutCollege.college, null);

  const stripped = awardMemberRowSchema.parse(memberRowFixture({ extra: "未知" }));
  assert.equal(Object.hasOwn(stripped, "extra"), false);
});

test("奖状成员行契约拒绝畸形负载：非 UUID、类型错误、缺失字段", () => {
  expectReject(awardMemberRowSchema, memberRowFixture({ userId: "not-a-uuid" }), "userId");
  expectReject(awardMemberRowSchema, memberRowFixture({ name: 123 }), "name");
  expectReject(awardMemberRowSchema, {}, "userId");
});

test("成员搜索候选契约：解析真实形状、nullable 掩码、剥离未知字段", () => {
  const candidate = candidateFixture();
  assert.deepEqual(awardMemberCandidateSchema.parse(candidate), candidate);

  const masked = awardMemberCandidateSchema.parse(
    candidateFixture({ emailMasked: null, studentNoMasked: null }),
  );
  assert.equal(masked.emailMasked, null);
  assert.equal(masked.studentNoMasked, null);

  const stripped = awardMemberCandidateSchema.parse(candidateFixture({ extra: "未知" }));
  assert.equal(Object.hasOwn(stripped, "extra"), false);
});

test("成员搜索候选契约拒绝非 UUID id 与错误类型", () => {
  expectReject(awardMemberCandidateSchema, candidateFixture({ id: "not-a-uuid" }), "id");
  expectReject(awardMemberCandidateSchema, candidateFixture({ college: 7 }), "college");
  expectReject(awardMemberCandidateSchema, {}, "id");
});

test("成员搜索/成员列表响应契约：校验 users 与 members 数组结构", () => {
  const search = memberSearchResponseSchema.parse({ users: [candidateFixture()] });
  assert.equal(search.users.length, 1);
  assert.deepEqual(Object.keys(search), ["users"]);

  assert.equal(
    awardMembersResponseSchema.parse({ members: [memberRowFixture()] }).members.length,
    1,
  );

  expectReject(memberSearchResponseSchema, {}, "users");
  expectReject(memberSearchResponseSchema, { users: "不是数组" }, "users");
  expectReject(memberSearchResponseSchema, { users: [{ id: "bad" }] }, "users");
  expectReject(awardMembersResponseSchema, {}, "members");
  expectReject(awardMembersResponseSchema, { members: [{ userId: "bad" }] }, "members");
});

test("我的奖状行契约：owner/member 角色、members 数组、日期与数字类型锁定", () => {
  const ownerRow = {
    id: randomUUID(),
    userId: randomUUID(),
    competitionId: randomUUID(),
    competitionTitle: "程序设计竞赛",
    awardLevel: "国家级一等奖",
    imageUrl: "/api/uploads?key=uploads/awards/a.png",
    imageLargeUrl: null,
    status: "approved",
    showOnHomepage: true,
    reviewComment: "首次通过",
    displayOrder: 2,
    createdAt: "2025-06-01T00:00:00.000Z",
    role: "owner",
    members: [memberRowFixture()],
  };
  assert.deepEqual(myAwardRowSchema.parse(ownerRow), ownerRow);

  const memberRow = myAwardRowSchema.parse({ ...ownerRow, role: "member", members: [] });
  assert.equal(memberRow.role, "member");
  assert.equal(memberRow.members.length, 0);

  // 日期必须是字符串：API 序列化后的 ISO 字符串，而非 Date 对象。
  expectReject(myAwardRowSchema, { ...ownerRow, createdAt: new Date() }, "createdAt");
  expectReject(myAwardRowSchema, { ...ownerRow, displayOrder: "2" }, "displayOrder");
  expectReject(myAwardRowSchema, { ...ownerRow, showOnHomepage: "true" }, "showOnHomepage");
});

test("我的奖状行契约拒绝 role=admin、缺失 members 与非 UUID 主键", () => {
  const base = {
    id: randomUUID(),
    userId: randomUUID(),
    competitionId: randomUUID(),
    competitionTitle: "程序设计竞赛",
    awardLevel: null,
    imageUrl: "/api/uploads?key=uploads/awards/a.png",
    imageLargeUrl: null,
    status: "pending",
    showOnHomepage: false,
    reviewComment: null,
    displayOrder: 0,
    createdAt: "2025-06-01T00:00:00.000Z",
    role: "owner",
  };
  expectReject(myAwardRowSchema, { ...base, role: "admin", members: [] }, "role");
  expectReject(myAwardRowSchema, { ...base, id: "not-a-uuid", members: [] }, "id");
  // 历史 competitionId 允许非 UUID（后端 varchar(64)），仅拒绝空字符串。
  assert.equal(
    myAwardRowSchema.parse({ ...base, competitionId: "legacy-id", members: [] }).competitionId,
    "legacy-id",
  );
  expectReject(myAwardRowSchema, { ...base, competitionId: "", members: [] }, "competitionId");
  expectReject(myAwardRowSchema, base, "members");
});

test("公开展示行契约：解析、剥离未知字段、memberNames 锁定为字符串数组", () => {
  const row = showcaseRowFixture();
  assert.deepEqual(awardShowcaseRowSchema.parse(row), row);

  const stripped = awardShowcaseRowSchema.parse(showcaseRowFixture({ extra: "未知" }));
  assert.equal(Object.hasOwn(stripped, "extra"), false);

  expectReject(awardShowcaseRowSchema, showcaseRowFixture({ id: "not-a-uuid" }), "id");
  expectReject(awardShowcaseRowSchema, showcaseRowFixture({ userId: "not-a-uuid" }), "userId");
  // 历史 competitionId 允许非 UUID（后端 varchar(64)），仅拒绝空字符串。
  assert.equal(
    awardShowcaseRowSchema.parse(showcaseRowFixture({ competitionId: "legacy-id" })).competitionId,
    "legacy-id",
  );
  expectReject(awardShowcaseRowSchema, showcaseRowFixture({ competitionId: "" }), "competitionId");
  expectReject(awardShowcaseRowSchema, showcaseRowFixture({ memberNames: "王五、张三" }), "memberNames");
  expectReject(awardShowcaseRowSchema, showcaseRowFixture({ memberNames: [1, 2] }), "memberNames");
});

test("公开详情契约扩展 imageLargeUrl/createdAt；图库契约扩展 competitionYear", () => {
  const detail = {
    ...showcaseRowFixture(),
    imageLargeUrl: null,
    createdAt: "2025-06-01T00:00:00.000Z",
  };
  assert.deepEqual(publicAwardDetailSchema.parse(detail), detail);

  const { imageLargeUrl, ...withoutLarge } = detail;
  void imageLargeUrl;
  expectReject(publicAwardDetailSchema, withoutLarge, "imageLargeUrl");
  expectReject(publicAwardDetailSchema, { ...detail, createdAt: new Date() }, "createdAt");

  const galleryRow = awardGalleryRowSchema.parse({ ...detail, competitionYear: 2025 });
  assert.equal(galleryRow.competitionYear, 2025);
  expectReject(awardGalleryRowSchema, { ...detail, competitionYear: "2025" }, "competitionYear");
  expectReject(awardGalleryRowSchema, detail, "competitionYear");
});
