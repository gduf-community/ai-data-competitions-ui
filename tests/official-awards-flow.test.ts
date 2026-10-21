import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildListQuery,
  dataIdentity,
  filtersToSearch,
  INITIAL_CURSORS,
  nextPage,
  parseFilters,
  prevPage,
  resetCursor,
  sameFilters,
} from "../src/lib/official-awards/query";
import { changedFields, diffMembers, toDrafts } from "../src/lib/official-awards/members";

test("URL 解析与序列化可往返，且忽略未知参数", () => {
  const filters = parseFilters("?year=2026&level=second&subTrack=%E6%95%B0%E6%8D%AE%E6%8C%96%E6%8E%98&q=%E4%BD%95&page=3");
  assert.deepEqual(filters, { year: "2026", level: "second", subTrack: "数据挖掘", q: "何" });
  assert.equal(filtersToSearch(filters), "year=2026&level=second&subTrack=%E6%95%B0%E6%8D%AE%E6%8C%96%E6%8E%98&q=%E4%BD%95");
  assert.deepEqual(parseFilters(""), { year: "all", level: "all", subTrack: "all", q: "" });
});

test("cursor 不写进 URL，但出现在列表查询里", () => {
  const filters = { year: "all", level: "all", subTrack: "all", q: "" };
  assert.equal(filtersToSearch(filters), "");
  assert.equal(buildListQuery(filters, "MjA=", 20), "cursor=MjA%3D&limit=20");
});

test("数据身份包含竞赛、筛选与 cursor", () => {
  const filters = { year: "2026", level: "all", subTrack: "all", q: "" };
  assert.equal(dataIdentity("c1", filters, null), dataIdentity("c1", filters, null));
  assert.notEqual(dataIdentity("c1", filters, null), dataIdentity("c2", filters, null));
  assert.notEqual(dataIdentity("c1", filters, null), dataIdentity("c1", filters, "abc"));
  assert.notEqual(dataIdentity("c1", filters, null), dataIdentity("c1", { ...filters, level: "first" }, null));
});

test("cursor 分页只允许上一页/下一页，不能跳到未构造的页", () => {
  let state = INITIAL_CURSORS;
  assert.equal(state.index, 0);

  state = nextPage(state, "cursor-2");
  assert.equal(state.index, 1);
  assert.equal(state.cursors[1], "cursor-2");

  state = nextPage(state, "cursor-3");
  assert.equal(state.index, 2);
  assert.deepEqual(state.cursors, [null, "cursor-2", "cursor-3"]);

  state = prevPage(state);
  assert.equal(state.index, 1);
  assert.equal(state.cursors[1], "cursor-2");

  // 从第一页往前不会越界
  let first = INITIAL_CURSORS;
  first = prevPage(first);
  assert.equal(first.index, 0);

  // 没有下一页 cursor 时保持原状
  assert.equal(nextPage(INITIAL_CURSORS, null).index, 0);

  // 回到第一页后重新前进，丢弃失效的旧页
  const rewound = nextPage(state, "cursor-3b");
  assert.deepEqual(rewound.cursors, [null, "cursor-2", "cursor-3b"]);

  assert.equal(resetCursor().index, 0);
});

test("筛选比较忽略前后空白", () => {
  const base = { year: "all", level: "all", subTrack: "all", q: "何" };
  assert.equal(sameFilters(base, { ...base, q: " 何 " }), true);
  assert.equal(sameFilters(base, { ...base, q: "吴" }), false);
});

test("成员差异只提交新增/修改/移除，不发送假 ID", () => {
  const original = [
    { memberId: "m-1", name: "何子轩", grade: "2025级", college: "经济贸易学院", major: "国际经济与贸易" },
    { memberId: "m-2", name: "吴嘉怡", grade: "2023级", college: "数学与统计学院", major: "信息与计算科学" },
  ];

  // 无改动
  const unchanged = diffMembers(original, toDrafts(original));
  assert.deepEqual(unchanged.members, []);
  assert.deepEqual(unchanged.removedMemberIds, []);

  // 改一个、删一个、加一个
  const drafts = toDrafts(original);
  drafts[0] = { ...drafts[0], grade: "2024级" };
  drafts.splice(1, 1);
  drafts.push({ memberId: null, name: "新成员", grade: "2025级", college: "计算机学院", major: "软件工程" });

  const diff = diffMembers(original, drafts);
  assert.equal(diff.updated, 1);
  assert.equal(diff.removed, 1);
  assert.equal(diff.created, 1);
  assert.deepEqual(diff.removedMemberIds, ["m-2"]);
  assert.equal(diff.members.length, 2);

  const update = diff.members.find((member) => member.memberId === "m-1");
  assert.equal(update?.grade, "2024级");
  const created = diff.members.find((member) => member.memberId === undefined);
  assert.equal(created?.name, "新成员");
  assert.equal("memberId" in (created ?? {}), false);
});

test("changedFields 用于 409 之后展示差异", () => {
  const original = { name: "何子轩", grade: "2025级", college: "经济贸易学院", major: "国际经济与贸易" };
  assert.deepEqual(changedFields(original, { ...original, memberId: "m-1" } as never), []);
  assert.deepEqual(
    changedFields(original, { memberId: "m-1", name: "何子轩", grade: "2024级", college: "计算机学院", major: "" }),
    ["年级", "学院", "专业"],
  );
});
