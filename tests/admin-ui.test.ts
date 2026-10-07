import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AdminDataTable } from "@/components/admin/admin-data-table";
import { buildCompetitionRequest, competitionToForm, createDefaultCompetitionFormValues, CompetitionEditor } from "@/components/admin/competition-editor";
import { createApplicationSchema } from "@/components/competitions/application-form";
import type { Competition } from "@/lib/types";

test("optional and required advisor forms preserve the shared limit under a larger competition limit", () => {
  const fields = { applicantName: "学生", studentId: "20260001", college: "金融学院", major: "金融学", grade: "2026", phone: "13800000000", email: "student@example.invalid", teamMembers: [] };
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
