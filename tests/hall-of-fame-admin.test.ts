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
  reconcilePhotoReviewConflict,
  resolvePhotoRequestsPermissions,
} from "../src/components/admin/hall-of-fame-helpers";
import { AdminHallOfFameMilestoneHistory } from "../src/components/admin/hall-of-fame-milestone-history";
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
      onConflictRefresh: async () => null,
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
      onConflictRefresh: async () => null,
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

test("S1 photo preview permissions fail closed when permissions or canViewPreview are missing or false", () => {
  assert.deepEqual(resolvePhotoRequestsPermissions(undefined), {
    canManage: false,
    canViewPreview: false,
  });
  assert.deepEqual(resolvePhotoRequestsPermissions({}), {
    canManage: false,
    canViewPreview: false,
  });
  assert.deepEqual(resolvePhotoRequestsPermissions({ canManage: false }), {
    canManage: false,
    canViewPreview: false,
  });
  assert.deepEqual(resolvePhotoRequestsPermissions({ canManage: true }), {
    canManage: true,
    canViewPreview: false,
  });
  assert.deepEqual(
    resolvePhotoRequestsPermissions({ canManage: true, canViewPreview: false }),
    {
      canManage: true,
      canViewPreview: false,
    },
  );
  assert.deepEqual(
    resolvePhotoRequestsPermissions({ canManage: false, canViewPreview: true }),
    {
      canManage: false,
      canViewPreview: true,
    },
  );
  assert.deepEqual(
    resolvePhotoRequestsPermissions({ canManage: true, canViewPreview: true }),
    {
      canManage: true,
      canViewPreview: true,
    },
  );

  const tabSource = readFileSync(
    "src/components/admin/hall-of-fame-photo-requests-tab.tsx",
    "utf8",
  );
  assert.doesNotMatch(tabSource, /canViewPreview !== false/);
  assert.match(tabSource, /useState\(false\)/);

  const deniedPreviewHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoReviewPanel, {
      request: syntheticAdminPhotoRequests[0],
      canManage: true,
      canViewPreview: false,
      onClose: () => undefined,
      onReviewed: async () => undefined,
      onConflictRefresh: async () => null,
    }),
  );
  assert.match(deniedPreviewHtml, /当前账号无权预览待审私有照片/);
  assert.doesNotMatch(
    deniedPreviewHtml,
    new RegExp(
      `/api/admin/hall-of-fame/photo-requests/${SYNTHETIC_PHOTO_REQUEST_IDS.pending}/preview`,
    ),
  );
});

test("F1 409 conflict syncs terminal states, locks stale actions, and preserves reviewer draft reason", () => {
  const pendingReq = syntheticAdminPhotoRequests[0];

  // 1) 并发批准 -> terminal 切换至 approved，禁用旧审批并保留管理员已填草稿
  const approvedLatest = {
    ...pendingReq,
    status: "approved" as const,
    reviewedAt: "2026-11-16T08:00:00.000Z",
    reviewerName: "另一位管理员",
  };
  const approvedConflict = reconcilePhotoReviewConflict(
    pendingReq,
    approvedLatest,
  );
  assert.equal(approvedConflict.kind, "terminal");
  assert.equal(approvedConflict.lockActions, true);

  const approvedHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoReviewPanel, {
      request: pendingReq,
      canManage: true,
      canViewPreview: true,
      initialConflictState: approvedConflict,
      initialDraftReason: "待保留的审核备注意见",
      onClose: () => undefined,
      onReviewed: async () => undefined,
      onConflictRefresh: async () => approvedLatest,
    }),
  );
  assert.match(approvedHtml, /已通过/);
  assert.match(approvedHtml, /另一位管理员/);
  assert.match(approvedHtml, /已保留你刚才填写的未提交意见草稿/);
  assert.match(approvedHtml, /待保留的审核备注意见/);
  assert.doesNotMatch(approvedHtml, /批准替换|驳回申请/);

  // 2) 本人撤回 -> terminal 切换至 withdrawn
  const withdrawnLatest = {
    ...pendingReq,
    status: "withdrawn" as const,
  };
  const withdrawnConflict = reconcilePhotoReviewConflict(
    pendingReq,
    withdrawnLatest,
  );
  assert.equal(withdrawnConflict.kind, "terminal");
  const withdrawnHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoReviewPanel, {
      request: pendingReq,
      canManage: true,
      canViewPreview: true,
      initialConflictState: withdrawnConflict,
      onClose: () => undefined,
      onReviewed: async () => undefined,
      onConflictRefresh: async () => withdrawnLatest,
    }),
  );
  assert.match(withdrawnHtml, /已撤回/);
  assert.doesNotMatch(withdrawnHtml, /批准替换|驳回申请/);

  // 3) 成员版本变化但仍为 pending -> 锁定旧版本按钮并展示新版本号入口，绝不静默提交
  const revChangedLatest = {
    ...pendingReq,
    expectedRevision: 9,
  };
  const revChangedConflict = reconcilePhotoReviewConflict(
    pendingReq,
    revChangedLatest,
  );
  assert.equal(revChangedConflict.kind, "revision_changed");
  assert.equal(
    canApprovePhotoPreview({
      canManage: true,
      status: "pending",
      previewStatus: "loaded",
      submitting: false,
      lockedByConflict: revChangedConflict.lockActions,
    }),
    false,
  );
  const revChangedHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoReviewPanel, {
      request: pendingReq,
      canManage: true,
      canViewPreview: true,
      initialConflictState: revChangedConflict,
      initialDraftReason: "请核对光线",
      onClose: () => undefined,
      onReviewed: async () => undefined,
      onConflictRefresh: async () => revChangedLatest,
    }),
  );
  assert.match(revChangedHtml, /同步至最新版本 \(rev\.9\) 并核对/);
  assert.match(revChangedHtml, /请核对光线/);

  // 4) 默认 pending 筛选消失且全量首页未命中 -> 锁定操作、不误判删除
  const missingConflict = reconcilePhotoReviewConflict(pendingReq, null);
  assert.equal(missingConflict.kind, "missing");
  assert.equal(missingConflict.lockActions, true);
  const missingHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoReviewPanel, {
      request: pendingReq,
      canManage: true,
      canViewPreview: true,
      initialConflictState: missingConflict,
      onClose: () => undefined,
      onReviewed: async () => undefined,
      onConflictRefresh: async () => null,
    }),
  );
  assert.match(missingHtml, /重新查询最新状态/);

  // 弹窗 key 不包含 status，避免状态变化时重建 Dialog 冲掉审核意见草稿
  const tabSource = readFileSync(
    "src/components/admin/hall-of-fame-photo-requests-tab.tsx",
    "utf8",
  );
  assert.match(tabSource, /syncRequestOnConflict/);
  assert.doesNotMatch(tabSource, /selectedRequest\?\.status/);
});

test("F2 admin milestone history renders reasons, both years, multi-promotions, plain-text escaping, and hidden entries", () => {
  const wang = syntheticAdminEntries[0];
  const hiddenEntry = syntheticAdminEntries[5];
  const milestonesHtml = renderToStaticMarkup(
    React.createElement(AdminHallOfFameMilestoneHistory, {
      milestones: [
        ...(wang.milestones ?? []),
        {
          id: "40000000-0000-4000-8000-000000000499",
          eventType: "promoted",
          fromLevel: 2,
          toLevel: 3,
          achievementYear: 2026,
          eventYear: 2026,
          reason: '同年进阶长理由验证：<script>alert("xss")</script>',
        },
      ],
    }),
  );

  assert.match(milestonesHtml, /共 3 条/);
  assert.match(milestonesHtml, /成绩年份：2024 年/);
  assert.match(milestonesHtml, /入选年份：2025 年/);
  assert.match(
    milestonesHtml,
    /2024年取得数学建模竞赛省级一等奖，2025年入选一级成员。/,
  );
  assert.match(milestonesHtml, /一级成员 → 二级成员/);
  assert.match(milestonesHtml, /二级成员 → 三级成员/);
  assert.match(milestonesHtml, /成绩年份：2026 年/);
  assert.match(milestonesHtml, /进阶年份：2026 年/);
  assert.doesNotMatch(milestonesHtml, /<script>/);
  assert.match(milestonesHtml, /&lt;script&gt;/);

  const hiddenMilestonesHtml = renderToStaticMarkup(
    React.createElement(AdminHallOfFameMilestoneHistory, {
      milestones: [
        {
          id: "40000000-0000-4000-8000-000000000488",
          eventType: "inducted",
          fromLevel: null,
          toLevel: 1,
          achievementYear: 2022,
          eventYear: 2023,
          reason: `${hiddenEntry.userName} 历史归档入选依据`,
        },
      ],
    }),
  );
  assert.match(hiddenMilestonesHtml, /刘已藏 历史归档入选依据/);
  assert.match(hiddenMilestonesHtml, /成绩年份：2022 年/);
  assert.match(hiddenMilestonesHtml, /入选年份：2023 年/);
});
