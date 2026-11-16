import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
  HallOfFamePhotoField,
  sanitizeOwnerPortraitPreviewSrc,
  validateHallPortraitFile,
} from "../src/components/profile/hall-of-fame-photo-field";
import {
  HallOfFamePhotoRequestSectionView,
  normalizeMePhotoRequestsPayload,
} from "../src/components/profile/hall-of-fame-photo-request-section";
import { HallOfFameStatusCardView } from "../src/components/profile/hall-of-fame-status-card";
import {
  meHallOfFameActiveUpdateSchema,
  meHallOfFameFirstSubmissionSchema,
} from "../src/lib/contracts/profiles";
import {
  HALL_OF_FAME_PHOTO_MAX_BYTES,
  parseHallPortraitUploadResponse,
  sanitizePublicPortraitSrc,
} from "../src/lib/hall-of-fame";
import {
  SYNTHETIC_PHOTO_REQUEST_IDS,
  SYNTHETIC_PORTRAIT_THUMB_URL,
  SYNTHETIC_USER_IDS,
  syntheticMeActiveEntry,
  syntheticMeInvitedEntry,
  syntheticMePhotoRequests,
} from "./fixtures/hall-of-fame";

const defaultDisplaySettings = {
  publicShowAvatar: true,
  publicShowCollegeMajor: true,
  publicShowTitles: true,
};

test("W2 validateHallPortraitFile and upload parser enforce contract format/size and keep private refs non-public", () => {
  assert.equal(
    validateHallPortraitFile({ type: "image/jpeg", size: 1024 }),
    null,
  );
  assert.equal(
    validateHallPortraitFile({ type: "image/png", size: 2048 }),
    null,
  );
  assert.equal(
    validateHallPortraitFile({ type: "image/webp", size: 4096 }),
    null,
  );
  assert.match(
    validateHallPortraitFile({ type: "image/gif", size: 1024 }) ?? "",
    /JPG、PNG 或 WebP/,
  );
  assert.match(
    validateHallPortraitFile({ type: "image/svg+xml", size: 512 }) ?? "",
    /JPG、PNG 或 WebP/,
  );
  assert.match(
    validateHallPortraitFile({ type: "image/png", size: 0 }) ?? "",
    /为空/,
  );
  assert.match(
    validateHallPortraitFile({
      type: "image/png",
      size: HALL_OF_FAME_PHOTO_MAX_BYTES + 1,
    }) ?? "",
    /5MB/,
  );

  const parsed = parseHallPortraitUploadResponse({
    files: [
      {
        key: "uploads/private/hall_portrait/user-test/draft-1.webp",
        thumbKey: "uploads/private/hall_portrait/user-test/draft-1_thumb.webp",
      },
    ],
  });
  assert.equal(
    parsed.photoKey,
    "uploads/private/hall_portrait/user-test/draft-1.webp",
  );
  assert.equal(
    parsed.photoThumbKey,
    "uploads/private/hall_portrait/user-test/draft-1_thumb.webp",
  );
  assert.equal(parsed.previewUrl, null);

  const fieldHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoField, {
      value: parsed,
      onChange: () => undefined,
      error: null,
    }),
  );
  assert.match(fieldHtml, /已上传待提交（尚未公开展示）/);
  assert.doesNotMatch(fieldHtml, /uploads\/private\/hall_portrait/);

  const fieldSource = readFileSync(
    "src/components/profile/hall-of-fame-photo-field.tsx",
    "utf8",
  );
  assert.doesNotMatch(fieldSource, /\/api\/me\/avatar/);
  assert.match(fieldSource, /scope",\s*"hall_portrait"/);
  assert.match(fieldSource, /AbortController/);
  assert.match(fieldSource, /revokePreviewUrl/);
});

test("W2 invited form displays read-only admin assignments, keeps consent unchecked, and validates required fields", () => {
  const invitedHtml = renderToStaticMarkup(
    React.createElement(HallOfFameStatusCardView, {
      entry: syntheticMeInvitedEntry,
      userId: SYNTHETIC_USER_IDS.liInvited,
      userName: "李已邀",
      displaySettings: defaultDisplaySettings,
      onRefresh: () => undefined,
    }),
  );

  assert.match(invitedHtml, /已收到名人堂邀请/);
  assert.match(invitedHtml, /一级成员/);
  assert.match(invitedHtml, /2025 年/);
  assert.match(invitedHtml, /2026 年/);
  assert.match(invitedHtml, /2025年取得统计建模大赛奖项，获邀加入一级成员。/);
  assert.doesNotMatch(invitedHtml, /data-state="checked"/);

  const missingPhoto = meHallOfFameFirstSubmissionSchema.safeParse({
    displayName: "李已邀",
    displayGrade: "2022级",
    displayCollege: "统计与数学学院",
    displayMajor: "应用统计学",
    tag: "统计建模省一",
    bio: "简介",
    photoKey: "",
    publicConsent: true,
    expectedRevision: 1,
  });
  assert.equal(missingPhoto.success, false);

  const missingConsent = meHallOfFameFirstSubmissionSchema.safeParse({
    displayName: "李已邀",
    displayGrade: "2022级",
    displayCollege: "统计与数学学院",
    displayMajor: "应用统计学",
    tag: "统计建模省一",
    bio: "简介",
    photoKey: "uploads/private/hall_portrait/u1/p.webp",
    publicConsent: false,
    expectedRevision: 1,
  });
  assert.equal(missingConsent.success, false);

  const validFirst = meHallOfFameFirstSubmissionSchema.safeParse({
    displayName: "李已邀",
    displayGrade: "2022级",
    displayCollege: "统计与数学学院",
    displayMajor: "应用统计学",
    tag: "统计建模省一",
    bio: "",
    photoKey: "uploads/private/hall_portrait/u1/p.webp",
    photoThumbKey: "uploads/private/hall_portrait/u1/p_thumb.webp",
    publicConsent: true,
    expectedRevision: 1,
  });
  assert.equal(validFirst.success, true);
});

test("W2 candidate and legacy active views preserve compatibility and strip disallowed active fields", () => {
  const candidateHtml = renderToStaticMarkup(
    React.createElement(HallOfFameStatusCardView, {
      entry: {
        ...syntheticMeInvitedEntry,
        status: "candidate",
        tag: "统计建模省一",
        photoStatus: "pending",
        hasPortrait: true,
      },
      userId: SYNTHETIC_USER_IDS.chenCandidate,
      userName: "周待审",
      displaySettings: defaultDisplaySettings,
      onRefresh: () => undefined,
    }),
  );
  assert.match(candidateHtml, /资料审核中（尚未公开展示）/);
  assert.match(candidateHtml, /修改待审资料/);
  assert.match(candidateHtml, /撤回资料/);

  const legacyActiveHtml = renderToStaticMarkup(
    React.createElement(HallOfFameStatusCardView, {
      entry: {
        status: "active",
        level: null,
        memberStatus: null,
        tag: "历史正式成员",
        bio: "早期入选成员简介",
        photoStatus: "unsubmitted",
        publicConsentAt: null,
        requiresMigrationProfileFill: true,
        revision: 0,
      },
      userId: SYNTHETIC_USER_IDS.legacyActive,
      userName: "陈历史",
      displaySettings: defaultDisplaySettings,
      onRefresh: () => undefined,
      photoRequestSlot: React.createElement(HallOfFamePhotoRequestSectionView, {
        requests: [],
        loading: false,
        loadError: null,
        canApply: true,
        currentPortraitUrl: null,
        photoRef: null,
        uploadingPhoto: false,
        submitting: false,
        withdrawingId: null,
        actionError: null,
        onPhotoChange: () => undefined,
        onUploadingChange: () => undefined,
        onSubmit: () => undefined,
        onWithdraw: () => undefined,
        onRetryLoad: () => undefined,
      }),
    }),
  );
  assert.match(legacyActiveHtml, /历史正式成员档案补录说明/);
  assert.match(legacyActiveHtml, /编辑标签与简介/);
  assert.match(legacyActiveHtml, /申请修改名人堂展示照片/);

  // 正式 active 兼容编辑 schema 会剥离 level、photoKey 等越权字段
  const strippedActiveUpdate = meHallOfFameActiveUpdateSchema.parse({
    tag: "新竞赛标签",
    bio: "新简介",
    expectedRevision: 3,
    level: 3,
    photoKey: "uploads/private/hall_portrait/hijack.webp",
    status: "hidden",
  });
  assert.deepEqual(strippedActiveUpdate, {
    tag: "新竞赛标签",
    bio: "新简介",
    expectedRevision: 3,
  });
});

test("W6 photo request normalization strips private/reviewer fields and renders pending, rejected, and normal states safely", () => {
  const normalized = normalizeMePhotoRequestsPayload({
    data: [
      {
        ...syntheticMePhotoRequests[0],
        photoKey: "uploads/private/hall_portrait/secret-key.webp",
        reviewerName: "内部审核人甲",
        adminNote: "仅内部可见",
      },
      {
        ...syntheticMePhotoRequests[2],
        rejectionReason: '请重新拍摄<script>alert("xss")</script>清晰照片',
      },
    ],
    currentRevision: 3,
    permissions: { canApply: true },
  });

  assert.equal(normalized.requests.length, 2);
  assert.doesNotMatch(
    JSON.stringify(normalized),
    /secret-key|内部审核人甲|仅内部可见/,
  );

  // active + pending 申请：隐藏新提交入口，展示撤回按钮且公开正式图不变
  const pendingSectionHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoRequestSectionView, {
      requests: syntheticMePhotoRequests,
      loading: false,
      loadError: null,
      canApply: true,
      currentPortraitUrl: SYNTHETIC_PORTRAIT_THUMB_URL,
      photoRef: null,
      uploadingPhoto: false,
      submitting: false,
      withdrawingId: null,
      actionError: null,
      onPhotoChange: () => undefined,
      onUploadingChange: () => undefined,
      onSubmit: () => undefined,
      onWithdraw: () => undefined,
      onRetryLoad: () => undefined,
    }),
  );
  assert.match(
    pendingSectionHtml,
    /当前已有待审核的换照申请，审核完成或撤回前不可重复提交/,
  );
  assert.match(pendingSectionHtml, /撤回申请/);
  assert.doesNotMatch(pendingSectionHtml, /提交更换照片申请/);

  // 无 pending 时允许新申请，且安全转义 rejected 理由中的 HTML 标签
  const applySectionHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoRequestSectionView, {
      requests: [
        {
          id: SYNTHETIC_PHOTO_REQUEST_IDS.rejected,
          status: "rejected",
          createdAt: "2026-10-01T12:00:00.000Z",
          reviewedAt: "2026-10-02T09:00:00.000Z",
          rejectionReason: '照片模糊<script>alert(1)</script>',
          expectedRevision: 3,
        },
        syntheticMePhotoRequests[1],
        syntheticMePhotoRequests[3],
      ],
      loading: false,
      loadError: null,
      canApply: true,
      currentPortraitUrl: syntheticMeActiveEntry.portraitThumbUrl ?? null,
      photoRef: null,
      uploadingPhoto: false,
      submitting: false,
      withdrawingId: null,
      actionError: null,
      onPhotoChange: () => undefined,
      onUploadingChange: () => undefined,
      onSubmit: () => undefined,
      onWithdraw: () => undefined,
      onRetryLoad: () => undefined,
    }),
  );
  assert.match(applySectionHtml, /提交更换照片申请/);
  assert.match(applySectionHtml, /最近一次换照申请已被驳回/);
  assert.match(applySectionHtml, /已通过/);
  assert.match(applySectionHtml, /已撤回/);
  assert.doesNotMatch(applySectionHtml, /<script>/);
  assert.match(applySectionHtml, /&lt;script&gt;/);

  // 未传入任何 userId 切换参数
  const sectionSource = readFileSync(
    "src/components/profile/hall-of-fame-photo-request-section.tsx",
    "utf8",
  );
  assert.doesNotMatch(sectionSource, /\?userId=/);
});

test("F3 owner private pending portrait preview restores after reload while public portrait sanitizer stays strict", () => {
  const ownerPrivateUploadUrl =
    "/api/uploads?key=uploads%2Fprivate%2Fhall_portrait%2Fsynthetic%2Fportrait.webp";

  // 公开过滤器仍严格拒绝私有 uploads 与后台预览路径
  assert.equal(sanitizePublicPortraitSrc(ownerPrivateUploadUrl), null);
  assert.equal(
    sanitizePublicPortraitSrc(
      `/api/admin/hall-of-fame/photo-requests/${SYNTHETIC_PHOTO_REQUEST_IDS.pending}/preview`,
    ),
    null,
  );

  // 本人预览校验允许服务端下发的受控 /api/uploads?key=.../private/hall_portrait/... ，但继续拦截裸 key / 路径穿越 / 后台路径 / 多参数
  assert.equal(
    sanitizeOwnerPortraitPreviewSrc(ownerPrivateUploadUrl),
    ownerPrivateUploadUrl,
  );
  assert.equal(
    sanitizeOwnerPortraitPreviewSrc("uploads/private/hall_portrait/synthetic/portrait.webp"),
    null,
  );
  assert.equal(
    sanitizeOwnerPortraitPreviewSrc(
      "/api/uploads?key=uploads%2Fprivate%2Fhall_portrait%2F..%2Fsecret.webp",
    ),
    null,
  );
  assert.equal(
    sanitizeOwnerPortraitPreviewSrc(
      "/api/uploads?key=uploads%2Fprivate%2Fhall_portrait%2Fsynthetic%2Fportrait.webp&extra=1",
    ),
    null,
  );
  assert.equal(
    sanitizeOwnerPortraitPreviewSrc(
      `/api/admin/hall-of-fame/photo-requests/${SYNTHETIC_PHOTO_REQUEST_IDS.pending}/preview`,
    ),
    null,
  );

  // 复现 candidate 刷新/重编场景：value=null + existingPreviewUrl=本人受控私有预览 URL，可渲染预览且不出现“暂无新上传照片”
  const recoveredFieldHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoField, {
      value: null,
      existingPreviewUrl: ownerPrivateUploadUrl,
      onChange: () => undefined,
      error: null,
    }),
  );
  assert.match(
    recoveredFieldHtml,
    /src="\/api\/uploads\?key=uploads%2Fprivate%2Fhall_portrait%2Fsynthetic%2Fportrait\.webp"/,
  );
  assert.match(recoveredFieldHtml, /当前正在预览已提交或已发布的照片/);
  assert.doesNotMatch(recoveredFieldHtml, /暂无新上传照片/);

  // 预览 URL 无效或被拒收时，给出明确的过期/不可用回退说明，避免自相矛盾
  const expiredFieldHtml = renderToStaticMarkup(
    React.createElement(HallOfFamePhotoField, {
      value: null,
      existingPreviewUrl: "uploads/private/hall_portrait/raw-bare-key.webp",
      onChange: () => undefined,
      error: null,
    }),
  );
  assert.match(expiredFieldHtml, /原照片预览暂不可用或已过期/);
  assert.match(expiredFieldHtml, /已有已提交的照片记录，但当前预览暂不可用或已过期/);
  assert.doesNotMatch(expiredFieldHtml, /暂无新上传照片/);

  // candidate 卡片刷新后同样恢复显示受控待审照片预览
  const candidateCardWithPreviewHtml = renderToStaticMarkup(
    React.createElement(HallOfFameStatusCardView, {
      entry: {
        ...syntheticMeInvitedEntry,
        status: "candidate",
        tag: "统计建模省一",
        photoStatus: "pending",
        hasPortrait: true,
        pendingPortraitPreviewUrl: ownerPrivateUploadUrl,
      },
      userId: SYNTHETIC_USER_IDS.chenCandidate,
      userName: "周待审",
      displaySettings: defaultDisplaySettings,
      onRefresh: () => undefined,
    }),
  );
  assert.match(
    candidateCardWithPreviewHtml,
    /src="\/api\/uploads\?key=uploads%2Fprivate%2Fhall_portrait%2Fsynthetic%2Fportrait\.webp"/,
  );
});
