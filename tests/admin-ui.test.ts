import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { buildCompetitionRequest, competitionToForm, createDefaultCompetitionFormValues, CompetitionEditor } from "@/components/admin/competition-editor";
import { createApplicationSchema } from "@/components/competitions/application-form";
import type { Competition } from "@/lib/types";

test("optional and required advisor forms preserve the shared limit under a larger competition limit", () => {
  const fields = { applicantName: "学生", studentId: "202600001", college: "金融学院", major: "金融学", grade: "2026", phone: "13800000000", email: "student@example.invalid", teamMembers: [] };
  const advisor = { name: "老师", college: "金融学院", major: "金融学", phone: "13800000001", email: "teacher@example.invalid" };
  for (const required of [true, false]) {
    const schema = createApplicationSchema(required, false, false, 6);
    assert.equal(schema.safeParse({ ...fields, advisors: Array(6).fill(advisor) }).success, false);
    assert.equal(schema.safeParse({ ...fields, advisors: Array(5).fill(advisor) }).success, true);
    assert.equal(schema.safeParse({ ...fields, advisors: [] }).success, !required);
    assert.equal(createApplicationSchema(required, false, false, 1).safeParse({ ...fields, advisors: [advisor, advisor] }).success, false);
  }
});

test("create editor initializes independent defaults without structuredClone", t => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "structuredClone");
  Object.defineProperty(globalThis, "structuredClone", { configurable: true, value: undefined });
  t.after(() => { if (previous) Object.defineProperty(globalThis, "structuredClone", previous); else Reflect.deleteProperty(globalThis, "structuredClone"); });
  const first = createDefaultCompetitionFormValues(), second = createDefaultCompetitionFormValues();
  first.highlights.push("修改"); first.timeline.push({ label: "报名", date: "2026-10-01", description: "修改" }); first.faqs.push({ question: "q", answer: "a" });
  for (const name of ["highlights", "subTracks", "timeline", "relatedQuestions", "faqs", "attachments"] as const) {
    assert.deepEqual(second[name], []);
    assert.notEqual(first[name], second[name]);
  }
  assert.equal(buildCompetitionRequest(second).title, "");
  assert.ok(renderToStaticMarkup(createElement(CompetitionEditor, { submitting: false, onSave: async () => undefined, onCancel: () => undefined })).includes("<input"));
});

test("remote table renders the supplied page once and reports the server total", () => {
  const html = renderToStaticMarkup(createElement(AdminDataTable<{ id: string }>, {
    data: [{ id: "second-page-record" }], columns: [{ accessorKey: "id", header: "记录" }],
    pagination: { pageIndex: 1, pageSize: 10 }, rowCount: 31, onPaginationChange: () => undefined,
    getRowId: row => row.id, searchPlaceholder: "搜索",
  }));
  assert.match(html, /31 条结果/);
  assert.match(html, /second-page-record/);
  assert.match(html, /第 2 页 \/ 共 4 页/);
  assert.doesNotMatch(html, /暂无记录/);
});

function assertPaginationButtons(html: string, previousDisabled: boolean, nextDisabled: boolean) {
  const buttons = [...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  for (const [label, symbol, disabled] of [
    ["上一页", "&lt;", previousDisabled],
    ["首页", "&lt;&lt;", previousDisabled],
    ["下一页", "&gt;", nextDisabled],
    ["末页", "&gt;&gt;", nextDisabled],
  ] as const) {
    const matches = buttons.filter(button => button[1].includes(`aria-label="${label}"`));
    assert.equal(matches.length, 1, `${label} has a unique accessible name`);
    assert.equal(matches[0][2].replace(/<[^>]*>/g, ""), symbol, `${label} preserves its visible symbol`);
    assert.equal(/\sdisabled(?:=|\s|$)/.test(matches[0][1]), disabled, `${label} disabled state`);
  }
}

test("local pagination names survive empty, single-page, multi-page, loading and error states", () => {
  for (const { count, loading, error } of [
    { count: 0 }, { count: 1 }, { count: 31 },
    { count: 31, loading: true }, { count: 31, error: "服务不可用" },
  ]) {
    const html = renderToStaticMarkup(createElement(AdminDataTable<{ id: string }>, {
      data: Array.from({ length: count }, (_, index) => ({ id: `record-${index}` })),
      columns: [{ accessorKey: "id", header: "记录" }], searchPlaceholder: "搜索",
      loading, error,
    }));
    assertPaginationButtons(html, true, count <= 10 || Boolean(loading || error));
  }
});

test("server pagination names preserve first, middle, last, empty, loading and error boundaries", () => {
  for (const { pageIndex, rowCount, loading, error } of [
    { pageIndex: 0, rowCount: 31 }, { pageIndex: 1, rowCount: 31 },
    { pageIndex: 3, rowCount: 31 }, { pageIndex: 0, rowCount: 0 },
    { pageIndex: 1, rowCount: 31, loading: true },
    { pageIndex: 1, rowCount: 31, error: "服务不可用" },
  ]) {
    const html = renderToStaticMarkup(createElement(AdminDataTable<{ id: string }>, {
      data: rowCount ? [{ id: "synthetic-record" }] : [],
      columns: [{ accessorKey: "id", header: "记录" }], searchPlaceholder: "搜索",
      pagination: { pageIndex, pageSize: 10 }, rowCount, onPaginationChange: () => undefined,
      loading, error,
    }));
    const blocked = Boolean(loading || error);
    assertPaginationButtons(html, blocked || pageIndex === 0, blocked || pageIndex >= Math.ceil(rowCount / 10) - 1);
  }
});

test("cursor pagination keeps its text-only previous and next controls", () => {
  const html = renderToStaticMarkup(createElement(AdminDataTable<{ id: string }>, {
    data: [{ id: "synthetic-record" }], columns: [{ accessorKey: "id", header: "记录" }],
    searchPlaceholder: "搜索",
    cursorPaging: { pageNumber: 2, hasPrev: true, hasNext: true, onPrev: () => undefined, onNext: () => undefined },
  }));
  const buttons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)];
  assert.deepEqual(buttons.map(button => button[1]), ["上一页", "下一页"]);
  assert.doesNotMatch(html, /aria-label="(?:首页|末页)"/);
});

test("table loading and failure remain distinct from a successful empty result", () => {
  const props = { data: [], columns: [{ accessorKey: "id" }], searchPlaceholder: "搜索" };
  assert.match(renderToStaticMarkup(createElement(AdminDataTable, { ...props, loading: true })), /正在加载/);
  const error = renderToStaticMarkup(createElement(AdminDataTable, { ...props, error: "服务不可用", onRetry: () => undefined }));
  assert.match(error, /role="alert"/); assert.match(error, /重试/); assert.doesNotMatch(error, /暂无记录/);
});

test("competition form roundtrips dates, clears optional values and isolates nested editor state", () => {
  const competition = { id: "a", title: "比赛 A", category: "数学", competitionYear: 2026, recognition: "unlisted",
    summary: "摘要", department: "学院", registrationMode: "individual", status: "draft", ctaType: "internal_only",
    registrationStartAt: "2026-10-01T02:30:00.000Z", location: "原地点", description: "<p>原文</p>",
    timeline: [{ label: "报名", date: "2026-10-01", description: "原时间线" }], faqs: [{ question: "Q", answer: "A" }],
  } as Competition;
  const first = competitionToForm(competition), second = competitionToForm({ ...competition, id: "b", title: "比赛 B" });
  first.timeline[0].description = "修改"; first.faqs[0].answer = "修改";
  assert.equal(second.timeline[0].description, "原时间线"); assert.equal(competition.faqs[0].answer, "A");
  assert.equal(buildCompetitionRequest(second, "b").registrationStartAt, competition.registrationStartAt);
  first.location = ""; first.description = ""; first.registrationStartAt = "";
  const payload = JSON.parse(JSON.stringify(buildCompetitionRequest(first, "a")));
  assert.equal(payload.location, ""); assert.equal(payload.description, ""); assert.equal(payload.registrationStartAt, "");
  assert.equal(payload.maxTeamSize, 1);
});
