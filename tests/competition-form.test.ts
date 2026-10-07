import assert from "node:assert/strict";
import { test } from "node:test";
import type { Competition } from "@/lib/types";
import { buildCompetitionRequest, competitionToForm, createDefaultCompetitionFormValues } from "@/components/admin/competition-form-model";
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
test("competition date mapper retains minute-precision round trips and existing empty/array rules", () => {
  const source = {
    ...competition,
    registrationStartAt: "2026-10-05T01:02:00.000Z",
    registrationEndAt: "2026-10-06T01:02:00.000Z",
    officialUrl: null,
    highlights: [" 甲 ", " "],
    timeline: [
      { label: "保留", date: "2026-10-05", description: "描述" },
      { label: "", date: "", description: "" },
    ],
  };
  const mapped = buildCompetitionRequest(competitionToForm(source), source.id);
  assert.equal(mapped.registrationStartAt, source.registrationStartAt);
  assert.equal(mapped.registrationEndAt, source.registrationEndAt);
  assert.equal(mapped.eventStartAt, "");
  assert.equal(mapped.officialUrl, "");
  assert.deepEqual(mapped.highlights, ["甲"]);
  assert.equal(mapped.timeline.length, 1);
  assert.equal(mapped.statusReason, "后台管理台更新");
  const defaults = createDefaultCompetitionFormValues();
  assert.equal(buildCompetitionRequest(defaults).statusReason, undefined);
  assert.equal(
    buildCompetitionRequest({
      ...defaults,
      registrationMode: "individual",
      maxTeamSize: 99,
    }).maxTeamSize,
    1,
  );
});

