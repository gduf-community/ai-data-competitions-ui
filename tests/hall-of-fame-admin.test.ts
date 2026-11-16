import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  buildHallOfFameInvitePayload,
  buildHallOfFameMilestonePayload,
  buildHallOfFamePhotoReviewPayload,
  buildHallOfFameUpdatePayload,
  canApprovePhotoPreview,
  defaultAdminHallOfFameFilters,
  filterAdminHallOfFameEntries,
  formatAdminHallOfFameLevelLabel,
  formatAdminInviteStatusLabel,
  formatAdminMemberStatusLabel,
  parseAdminRequestError,
} from "../src/components/admin/hall-of-fame-helpers";
import { HallOfFamePhotoReviewPanel } from "../src/components/admin/hall-of-fame-photo-review-dialog";
import { normalizePhotoRequestsPayload } from "../src/components/admin/hall-of-fame-photo-requests-tab";
import { HallOfFameUserPicker } from "../src/components/admin/hall-of-fame-user-picker";
import {
  adminHallOfFamePhotoRequestsResponseSchema,
  hallOfFameCandidatesResponseSchema,
} from "../src/lib/contracts/profiles";
import { getAllowedPromotionTargets } from "../src/lib/hall-of-fame";
import { HttpRequestError } from "../src/lib/http-client";
import {
  SYNTHETIC_PHOTO_REQUEST_IDS,
  SYNTHETIC_USER_IDS,
  syntheticAdminEntries,
  syntheticAdminPhotoRequests,
  syntheticCandidates,
} from "./fixtures/hall-of-fame";

test("W1 invite payload requires explicit user selection and confirmation and strips client identity snapshots", () => {
  const missingUser = buildHallOfFameInvitePayload({
    userId: null,
    confirmed: false,
    level: 1,
    memberStatus: "serving",
    achievementYear: 2025,
    eventYear: 2026,
    inductionReason: "2025年国赛一等奖",
    tag: "",
  });
  assert.equal(missingUser.ok, false);

  const unconfirmed = buildHallOfFameInvitePayload({
    userId: SYNTHETIC_USER_IDS.zhangOne,
    confirmed: false,
    level: 1,
    memberStatus: "serving",
    achievementYear: 2025,
    eventYear: 2026,
    inductionReason: "2025年国赛一等奖",
    tag: "",
  });
  assert.equal(unconfirmed.ok, false);

  const invalidYears = buildHallOfFameInvitePayload({
    userId: SYNTHETIC_USER_IDS.zhangOne,
    confirmed: true,
    level: 1,
    memberStatus: "serving",
    achievementYear: 2026,
    eventYear: 2025,
    inductionReason: "年份倒挂测试",
    tag: "",
  });
  assert.equal(invalidYears.ok, false);

  const valid = buildHallOfFameInvitePayload({
    userId: SYNTHETIC_USER_IDS.zhangTwo,
    confirmed: true,
    level: 2,
    memberStatus: "honorary",
    achievementYear: 2024,
    eventYear: 2026,
    inductionReason: "2024年获奖，2026年入选二级成员",
    tag: "ACM 区域赛金牌",
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.deepEqual(valid.data, {
      userId: SYNTHETIC_USER_IDS.zhangTwo,
      level: 2,
      memberStatus: "honorary",
      achievementYear: 2024,
      eventYear: 2026,
      inductionReason: "2024年获奖，2026年入选二级成员",
      tag: "ACM 区域赛金牌",
    });
    assert.equal("name" in valid.data, false);
    assert.equal("college" in valid.data, false);
    assert.equal("email" in valid.data, false);
  }
});

test("W1 candidate schema strips extra sensitive fields and picker guards against IME/race/auto-select", () => {
  const parsed = hallOfFameCandidatesResponseSchema.parse({
    users: syntheticCandidates.map((user) => ({
      ...user,
      email: "private@example.invalid",
      studentNo: "202300001",
    })),
  });
  assert.equal(parsed.users.length, 3);
  assert.doesNotMatch(JSON.stringify(parsed), /private@example\.invalid|202300001/);

  const pickerHtml = renderToStaticMarkup(
    React.createElement(HallOfFameUserPicker, {
      selected: syntheticCandidates[0],
      confirmed: false,
      onSelect: () => undefined,
      onConfirmChange: () => undefined,
    }),
  );
  assert.match(pickerHtml, /张合成/);
  assert.match(pickerHtml, /2023级/);
  assert.match(pickerHtml, /统计与数学学院/);
  assert.match(pickerHtml, /数学与应用数学/);

  const pickerSource = readFileSync(
    "src/components/admin/hall-of-fame-user-picker.tsx",
    "utf8",
  );
  assert.match(pickerSource, /AbortController/);
  assert.match(pickerSource, /requestIdRef/);
  assert.match(pickerSource, /onCompositionStart/);
  assert.match(pickerSource, /onCompositionEnd/);
  assert.match(pickerSource, /onSelect\(null\)/);
  assert.match(pickerSource, /onConfirmChange\(false\)/);
});

test("W3 filters separate level, memberStatus and invite status cleanly", () => {
  assert.equal(formatAdminInviteStatusLabel("active"), "展示中");
  assert.equal(formatAdminMemberStatusLabel("serving"), "现役成员");
  assert.equal(formatAdminMemberStatusLabel("honorary"), "荣誉成员");
  assert.equal(formatAdminHallOfFameLevelLabel(null), "待定级");

  assert.equal(
    filterAdminHallOfFameEntries(
      syntheticAdminEntries,
      defaultAdminHallOfFameFilters,
    ).length,
    syntheticAdminEntries.length,
  );

  const levelUnset = filterAdminHallOfFameEntries(syntheticAdminEntries, {
    ...defaultAdminHallOfFameFilters,
    level: "unset",
  });
  assert.equal(levelUnset.length, 1);
  assert.equal(levelUnset[0].userName, "陈历史");

  const honoraryActive = filterAdminHallOfFameEntries(syntheticAdminEntries, {
    level: "3",
    memberStatus: "honorary",
    status: "active",
  });
  assert.equal(honoraryActive.length, 1);
  assert.equal(honoraryActive[0].userName, "赵荣誉");
});

test("W3 update payload requires expectedRevision and forbids direct level edits; promotions follow central config", () => {
  const update = buildHallOfFameUpdatePayload({
    expectedRevision: 3,
    displayName: "王现役",
    displayGrade: "2023级",
    displayCollege: "信息学院",
    displayMajor: "软件工程",
    memberStatus: "honorary",
    status: "active",
    displayOrder: 1,
    tag: "算法竞赛一等奖",
    bio: "长期参与算法设计与数据建模赛事。",
    adminBio: "",
  });
  assert.equal(update.ok, true);
  if (update.ok) {
    assert.equal(update.data.expectedRevision, 3);
    assert.equal(update.data.memberStatus, "honorary");
    assert.equal("level" in update.data, false);
  }

  // 进阶目标严格查配置表，不根据数字大小推断方向
  assert.deepEqual(getAllowedPromotionTargets(1), [2, 3]);
  assert.deepEqual(getAllowedPromotionTargets(2), [3]);
  assert.deepEqual(getAllowedPromotionTargets(3), []);
  assert.deepEqual(getAllowedPromotionTargets(null), [1, 2, 3]);
  assert.deepEqual(getAllowedPromotionTargets(3, { 3: [1] }), [1]);

  const initialInduct = buildHallOfFameMilestonePayload({
    fromLevel: null,
    toLevel: 2,
    achievementYear: 2023,
    eventYear: 2025,
    reason: "历史成员人工核对定级为二级",
    expectedRevision: 0,
  });
  assert.equal(initialInduct.ok, true);
  if (initialInduct.ok) {
    assert.equal(initialInduct.data.eventType, "inducted");
  }

  const promote = buildHallOfFameMilestonePayload({
    fromLevel: 1,
    toLevel: 2,
    achievementYear: 2025,
    eventYear: 2026,
    reason: "新获奖进阶",
    expectedRevision: 1,
  });
  assert.equal(promote.ok, true);
  if (promote.ok) {
    assert.equal(promote.data.eventType, "promoted");
  }

  const conflictErr = parseAdminRequestError(
    new HttpRequestError("版本冲突", 409),
    "失败",
  );
  assert.equal(conflictErr.isConflict, true);

  const editDialogSource = readFileSync(
    "src/components/admin/hall-of-fame-edit-dialog.tsx",
    "utf8",
  );
  assert.match(editDialogSource, /读取最新版本/);
  assert.match(editDialogSource, /采用新版本号并保留当前草稿/);

  const adminPageSource = readFileSync(
    "src/app/(dashboard)/admin/hall-of-fame/page.tsx",
    "utf8",
  );
  assert.match(adminPageSource, /隐藏归档/);
  assert.match(adminPageSource, /canManage === true/);
});

test("W7 photo request approval gates preview load state, supervisor read-only, and conflict preservation", () => {
  assert.equal(
    canApprovePhotoPreview({
      canManage: false,
      status: "pending",
      previewStatus: "loaded",
      submitting: false,
    }),
    false,
  );
  assert.equal(
    canApprovePhotoPreview({
      canManage: true,
      status: "pending",
      previewStatus: "loading",
      submitting: false,
    }),
    false,
  );
  assert.equal(
    canApprovePhotoPreview({
      canManage: true,
      status: "pending",
      previewStatus: "error",
      submitting: false,
    }),
    false,
  );
  assert.equal(
    canApprovePhotoPreview({
      canManage: true,
      status: "pending",
      previewStatus: "forbidden",
      submitting: false,
    }),
    false,
  );
  assert.equal(
    canApprovePhotoPreview({
      canManage: true,
      status: "pending",
      previewStatus: "loaded",
      submitting: false,
    }),
    true,
  );
  assert.equal(
    canApprovePhotoPreview({
      canManage: true,
      status: "pending",
      previewStatus: "loaded",
      submitting: true,
    }),
    false,
  );

  assert.equal(
    buildHallOfFamePhotoReviewPayload({
      action: "reject",
      expectedRevision: 3,
      reason: "  ",
    }).ok,
    false,
  );
  assert.equal(
    buildHallOfFamePhotoReviewPayload({
      action: "reject",
      expectedRevision: 3,
      reason: "背景过暗，请重拍",
    }).ok,
    true,
  );

  const normalized = adminHallOfFamePhotoRequestsResponseSchema.parse(
    normalizePhotoRequestsPayload({
      requests: syntheticAdminPhotoRequests,
      permissions: { canManage: false, canViewPreview: false },
    }),
  );
  assert.equal(normalized.data.length, 2);
  assert.equal(normalized.permissions?.canManage, false);
  assert.equal(normalized.permissions?.canViewPreview, false);

  const supervisorDialogHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoReviewPanel, {
      request: syntheticAdminPhotoRequests[0],
      canManage: false,
      canViewPreview: false,
      onClose: () => undefined,
      onReviewed: async () => undefined,
      onConflictRefresh: async () => undefined,
    }),
  );
  assert.match(supervisorDialogHtml, /当前账号无权预览待审私有照片/);
  assert.doesNotMatch(supervisorDialogHtml, /批准替换|驳回申请/);
  assert.doesNotMatch(
    supervisorDialogHtml,
    new RegExp(
      `/api/admin/hall-of-fame/photo-requests/${SYNTHETIC_PHOTO_REQUEST_IDS.pending}/preview`,
    ),
  );

  const reviewerLoadingHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoReviewPanel, {
      request: syntheticAdminPhotoRequests[0],
      canManage: true,
      canViewPreview: true,
      onClose: () => undefined,
      onReviewed: async () => undefined,
      onConflictRefresh: async () => undefined,
    }),
  );
  assert.match(
    reviewerLoadingHtml,
    new RegExp(
      `/api/admin/hall-of-fame/photo-requests/${SYNTHETIC_PHOTO_REQUEST_IDS.pending}/preview`,
    ),
  );
  assert.match(reviewerLoadingHtml, /批准替换/);
  assert.match(reviewerLoadingHtml, /驳回申请/);
});
