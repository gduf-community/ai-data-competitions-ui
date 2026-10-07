import assert from "node:assert/strict";
import { test } from "node:test";
import type { Competition } from "@/lib/types";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createApplicationSchema } from "@/components/competitions/application-form";
import {
  getSafeStorageItem,
  setSafeStorageItem,
  removeSafeStorageItem,
} from "@/lib/safe-storage";

// Execute the existing Web declarations, including its shipped onSubmit handler.
// Like auth-ui-flows, these source/library regressions do not replace browser tests.
const source = ts.createSourceFile("application-form.tsx", readFileSync("src/components/competitions/application-form.tsx", "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function declaration(name: string) {
  let found: ts.Node | undefined;
  function visit(node: ts.Node) {
    if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name?.getText(source) === name) found = node;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(found, `${name} exists in shipped Web`);
  return found;
}
function evaluate(code: string, context: Record<string, unknown> = {}) {
  const js = ts.transpileModule(code, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return vm.runInNewContext(js, { Error, ...context });
}
const createEmptyTeamMember = evaluate(`(${declaration("createEmptyTeamMember").getText(source)})`);
const draftValues = evaluate(`(${declaration("draftValues").getText(source)})`);
function createDefaultApplicationValues() {
  const node = declaration("defaultValues") as ts.VariableDeclaration;
  return evaluate(node.initializer!.getText(source), { initialData: undefined, useMemo: (callback: () => unknown) => callback() });
}
async function submit(competition: Competition, values: ReturnType<typeof createDefaultApplicationValues>, registrationId?: string, initialSelectedSubTrack = "") {
  let result: { url: string; method: string; body: Record<string, unknown> } | undefined;
  const node = declaration("onSubmit") as ts.VariableDeclaration;
  const handler = evaluate(node.initializer!.getText(source), {
    competition, registrationId, initialSelectedSubTrack, isTeamMode: competition.registrationMode === "team", isEditMode: !!registrationId,
    maxAdditionalMembers: 10, maxTeamSize: 11, draftStorageKey: "synthetic", defaultValues: createDefaultApplicationValues(),
    setSubmitting: () => {}, form: { reset() {}, setError() {} }, router: { push() {}, refresh() {} },
    toast: { success() {}, error(message: string) { throw new Error(message); } }, removeSafeStorageItem() {},
    requestJSON: async (url: string, options: { method: string; body: string }) => { result = { url, method: options.method, body: JSON.parse(options.body) }; return { application: { id: "synthetic" } }; },
  });
  await handler(values);
  assert.ok(result);
  return result;
}

const competition: Competition = {
  location:"",coverLabel:"",description:"",officialUrl:null,wechatArticleUrl:null,ctaLabelOverride:null,
  id: "synthetic-competition",
  title: "合成比赛",
  category: "数学",
  competitionYear: 2026,
  recognition: "unlisted",
  status: "registration_open",
  summary: "摘要",
  department: "学院",
  registrationMode: "team",
  ctaType: "internal_only",
  maxTeamSize: 3,
  advisorsRequired: true,
  subTracks: ["A", "B"],
  highlights: [],
  timeline: [],
  relatedQuestions: [],
  faqs: [],
  attachments: [],
};
const values = {
  ...createDefaultApplicationValues(),
  applicantName: "学生",
  studentId: "20260001",
  college: "金融学院",
  major: "金融学",
  grade: "2026",
  phone: "13800000000",
  email: "student@example.invalid",
  selectedSubTrack: "A",
  teamName: " 团队甲 ",
  teamMembers: [
    {
      ...createEmptyTeamMember(),
      name: "成员",
      studentId: "20260002",
      college: "金融学院",
      major: "金融学",
      grade: "2026",
      phone: "13800000001",
      email: "member@example.invalid",
    },
  ],
  advisors: [
    {
      name: "老师",
      college: "金融学院",
      major: "金融学",
      phone: "13800000002",
      email: "teacher@example.invalid",
    },
  ],
};

test("application submission keeps individual/team DTOs and update versus track-change creation", async () => {
  const team = await submit(
    competition,
    values,
    "202610050001",
    "A",
  );
  assert.equal(team.url, "/api/applications/202610050001");
  assert.equal(team.method, "PUT");
  assert.equal(team.body.teamName, "团队甲");
  assert.deepEqual(team.body.teamMembers, values.teamMembers);
  const track = await submit(
    competition,
    { ...values, selectedSubTrack: " B " },
    "202610050001",
    "A",
  );
  assert.equal(track.method, "POST");
  assert.equal(track.body.selectedSubTrack, "B");
  const personal = await submit(
    { ...competition, registrationMode: "individual", subTracks: [] },
    values,
  );
  assert.equal(personal.method, "POST");
  assert.equal(personal.body.teamName, undefined);
  assert.deepEqual(personal.body.teamMembers, []);
  assert.equal(personal.body.selectedSubTrack, undefined);
  assert.ok(!("applicantUserId" in personal.body));
  assert.equal(personal.body.mode, "individual");
});

test("legacy partial Web drafts replace empty arrays and filter removed tracks", () => {
  const restored = draftValues(
    {
      applicantName: "未完成",
      teamMembers: [],
      advisors: [],
      selectedSubTrack: "removed",
    },
    true,
    ["A"],
  );
  assert.equal(restored.applicantName, "未完成");
  assert.equal(restored.selectedSubTrack, "");
  assert.equal(restored.teamMembers.length, 0);
  assert.equal(restored.advisors.length, 0);
  const personal = draftValues({ ...values, savedAt: 1 }, false, ["A"]);
  assert.equal(personal.teamName, "");
  assert.equal(personal.teamMembers.length, 0);
  assert.throws(() => draftValues(null, true, []), /Invalid draft/);
  const first = createDefaultApplicationValues(),
    second = createDefaultApplicationValues();
  first.teamMembers.push(createEmptyTeamMember());
  assert.equal(second.teamMembers.length, 0);
});

test("shared form schema keeps member error paths and mandatory track/advisor checks", () => {
  const schema = createApplicationSchema(true, true, true, 2);
  assert.equal(schema.safeParse(values).success, true);
  const invalid = schema.safeParse({
    ...values,
    selectedSubTrack: "",
    teamMembers: [{ ...values.teamMembers[0], email: "bad" }],
    advisors: [],
  });
  assert.equal(invalid.success, false);
  if (!invalid.success) {
    const paths = invalid.error.issues.map((issue) => issue.path.join("."));
    assert.ok(paths.includes("teamMembers.0.email"));
    assert.ok(paths.includes("advisors"));
    assert.ok(paths.includes("selectedSubTrack"));
  }
});

test("disabled storage returns the existing safe fallback without crashing", (t) => {
  const old = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      get localStorage() {
        throw Error("synthetic denied");
      },
    },
  });
  t.after(() => {
    if (old) Object.defineProperty(globalThis, "window", old);
    else Reflect.deleteProperty(globalThis, "window");
  });
  assert.equal(getSafeStorageItem("application-draft:test"), null);
  assert.equal(setSafeStorageItem("application-draft:test", "{}"), false);
  assert.equal(removeSafeStorageItem("application-draft:test"), false);
});
