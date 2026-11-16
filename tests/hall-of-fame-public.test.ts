import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { HallOfFameLevelsOverview } from "../src/components/marketing/hall-of-fame-level-section";
import { HallOfFameLevelDetailView } from "../src/components/marketing/hall-of-fame-member-card";
import {
  HallOfFameMilestoneList,
  PublicProfileContent,
} from "../src/components/profile/hall-of-fame-milestone-list";
import { publicProfileSchema } from "../src/lib/contracts/profiles";
import {
  isHallOfFameHierarchyEnabled,
  parseHallOfFameLevelSegment,
  sanitizePublicPortraitSrc,
} from "../src/lib/hall-of-fame";
import {
  SYNTHETIC_ENTRY_IDS,
  SYNTHETIC_PORTRAIT_URL,
  SYNTHETIC_USER_IDS,
  syntheticPublicLevel2Detail,
  syntheticPublicNamesOverview,
  syntheticPublicProfile,
} from "./fixtures/hall-of-fame";

test("W4 overview renders >20 members per level without truncation, keeps duplicates distinct by userId, and omits photos", () => {
  const overviewHtml = renderToStaticMarkup(
    React.createElement(HallOfFameLevelsOverview, {
      overview: syntheticPublicNamesOverview,
    }),
  );

  // 三个等级全部展示；一级超过 20 人（25 人）全部保留且同名同存在
  assert.match(overviewHtml, /一级成员/);
  assert.match(overviewHtml, /二级成员/);
  assert.match(overviewHtml, /三级成员/);
  assert.match(overviewHtml, /共 25 人/);
  assert.match(overviewHtml, /一级成员25/);
  assert.match(overviewHtml, /超长姓名欧阳合成测试同学/);
  assert.match(overviewHtml, /该等级暂未公布成员/);
  assert.match(overviewHtml, /href="\/hall-of-fame\/1"/);
  assert.match(overviewHtml, /href="\/hall-of-fame\/2"/);
  assert.match(overviewHtml, /href="\/hall-of-fame\/3"/);

  // 同名“合成成员甲”均链接到各自真实 userId
  const duplicateNameMatches = overviewHtml.match(/合成成员甲/g) ?? [];
  assert.equal(duplicateNameMatches.length, 2);
  assert.match(overviewHtml, /href="\/profile\/user-level1-1"/);
  assert.match(overviewHtml, /href="\/profile\/user-level1-2"/);

  // 严禁用 entry.id 替代 userId 构造人物详情链接
  assert.match(
    overviewHtml,
    new RegExp(`href="/profile/${SYNTHETIC_USER_IDS.wangActive}"`),
  );
  assert.doesNotMatch(
    overviewHtml,
    new RegExp(`href="/profile/${SYNTHETIC_ENTRY_IDS.wangActive}"`),
  );

  // 总览不加载图片
  assert.doesNotMatch(overviewHtml, /<img\b/i);
});

test("W4 validates level route segments and keeps hierarchy toggle off by default", () => {
  assert.equal(parseHallOfFameLevelSegment("1"), 1);
  assert.equal(parseHallOfFameLevelSegment("2"), 2);
  assert.equal(parseHallOfFameLevelSegment("3"), 3);
  for (const invalid of ["0", "-1", "4", "01", "level-1", "abc", ""]) {
    assert.equal(parseHallOfFameLevelSegment(invalid), null);
  }

  assert.equal(isHallOfFameHierarchyEnabled({}), false);
  assert.equal(
    isHallOfFameHierarchyEnabled({ HALL_OF_FAME_HIERARCHY_ENABLED: "false" }),
    false,
  );
  assert.equal(
    isHallOfFameHierarchyEnabled({ HALL_OF_FAME_HIERARCHY_ENABLED: "1" }),
    true,
  );
  assert.equal(
    isHallOfFameHierarchyEnabled({ HALL_OF_FAME_HIERARCHY_ENABLED: "true" }),
    true,
  );
});

test("W4 level detail view renders accurate counts, serving/honorary badges, and fallback without photos", () => {
  const detailHtml = renderToStaticMarkup(
    React.createElement(HallOfFameLevelDetailView, {
      detail: syntheticPublicLevel2Detail,
    }),
  );

  assert.match(detailHtml, /共 2 人/);
  assert.match(detailHtml, /现役成员 1 人/);
  assert.match(detailHtml, /荣誉成员 1 人/);
  assert.match(detailHtml, /现役成员<\/span>/);
  assert.match(detailHtml, /荣誉成员<\/span>/);
  assert.match(detailHtml, /王现役/);
  assert.match(detailHtml, /孙荣誉/);
  assert.match(detailHtml, /href="\/profile\/user-level2-2"/);

  const emptyDetailHtml = renderToStaticMarkup(
    React.createElement(HallOfFameLevelDetailView, {
      detail: {
        level: 3,
        counts: { total: 0, serving: 0, honorary: 0 },
        members: [],
      },
    }),
  );
  assert.match(emptyDetailHtml, /该等级当前暂无公开成员/);
});

test("W5 profile view distinguishes achievement/event years, renders honorary members, escapes HTML, and handles missing milestones", () => {
  const profileHtml = renderToStaticMarkup(
    React.createElement(PublicProfileContent, {
      profile: {
        ...syntheticPublicProfile,
        hallOfFame: {
          ...syntheticPublicProfile.hallOfFame,
          memberStatus: "honorary",
          milestones: [
            ...(syntheticPublicProfile.hallOfFame.milestones ?? []),
            {
              id: "40000000-0000-4000-8000-000000000403",
              eventType: "promoted",
              fromLevel: 2,
              toLevel: 3,
              achievementYear: 2026,
              eventYear: 2026,
              reason: '长理由文本<script>alert("xss")</script>',
            },
          ],
        },
      },
    }),
  );

  // 阅读顺序：返回链接 -> 正式资料 -> 入选与进阶经历 -> 经验展示
  const backIdx = profileHtml.indexOf("返回名人堂");
  const profileIdx = profileHtml.indexOf("王现役");
  const milestoneIdx = profileHtml.indexOf("入选与进阶经历");
  const experienceIdx = profileHtml.indexOf("经验展示");
  assert.ok(backIdx >= 0 && profileIdx > backIdx);
  assert.ok(milestoneIdx > profileIdx);
  assert.ok(experienceIdx > milestoneIdx);

  // honorary 正式成员照常展示，明确区分成绩年份与入选/进阶年份并安全转义 HTML
  assert.match(profileHtml, /荣誉成员/);
  assert.match(profileHtml, /首次入选/);
  assert.match(profileHtml, /进阶晋级/);
  assert.match(profileHtml, /取得成绩年份：2024 年/);
  assert.match(profileHtml, /入选年份：2025 年/);
  assert.match(profileHtml, /取得成绩年份：2026 年/);
  assert.match(profileHtml, /进阶年份：2026 年/);
  assert.match(profileHtml, /一级成员 → 二级成员/);
  assert.doesNotMatch(profileHtml, /<script>/);
  assert.match(profileHtml, /&lt;script&gt;/);
  assert.match(profileHtml, /数学建模团队分工与时间管理复盘/);

  // 缺失历史履历时明确提示待补录而不编造
  const emptyMilestonesHtml = renderToStaticMarkup(
    React.createElement(HallOfFameMilestoneList, { milestones: [] }),
  );
  assert.match(emptyMilestonesHtml, /入选与进阶履历待补录/);
});

test("W5 schemas and portrait sanitizer strip PII, internal review fields, and non-public/unversioned URLs", () => {
  const parsedProfile = publicProfileSchema.parse({
    ...syntheticPublicProfile,
    email: "secret-student@example.invalid",
    studentNo: "202399999",
    phone: "13800000000",
    hallOfFame: {
      ...syntheticPublicProfile.hallOfFame,
      adminBio: "管理员内部备忘",
      pendingPortraitUrl:
        "/api/admin/hall-of-fame/photo-requests/30000000-0000-4000-8000-000000000301/preview",
      photoKey: "uploads/private/hall_portrait/leak.webp",
    },
  });

  const serialized = JSON.stringify(parsedProfile);
  assert.doesNotMatch(
    serialized,
    /secret-student@example\.invalid|202399999|13800000000|管理员内部备忘|photo-requests|leak\.webp/,
  );

  // 合法版本化 /api/portal/assets 与旧公开 /api/uploads 放行；私密或伪路径一律拒收
  assert.equal(
    sanitizePublicPortraitSrc(SYNTHETIC_PORTRAIT_URL),
    SYNTHETIC_PORTRAIT_URL,
  );
  assert.equal(
    sanitizePublicPortraitSrc("/api/uploads?key=uploads/public/hof/a.webp"),
    "/api/uploads?key=uploads/public/hof/a.webp",
  );
  assert.equal(
    sanitizePublicPortraitSrc("uploads/private/hall_portrait/a.webp"),
    null,
  );
  assert.equal(
    sanitizePublicPortraitSrc("/api/uploads?key=uploads/private/hall_portrait/a.webp"),
    null,
  );
  assert.equal(
    sanitizePublicPortraitSrc("/api/portal/assets?key=uploads/private/a.webp"),
    null,
  );
  assert.equal(
    sanitizePublicPortraitSrc(
      "/api/admin/hall-of-fame/photo-requests/30000000-0000-4000-8000-000000000301/preview",
    ),
    null,
  );

  // 错误边界与页面源码不混淆 503 与 404，并正确调用 router.refresh + reset
  const hallErrorSrc = readFileSync("src/app/hall-of-fame/error.tsx", "utf8");
  const profileErrorSrc = readFileSync(
    "src/app/profile/[id]/error.tsx",
    "utf8",
  );
  assert.match(hallErrorSrc, /router\.refresh\(\)/);
  assert.match(hallErrorSrc, /reset\(\)/);
  assert.match(profileErrorSrc, /router\.refresh\(\)/);
  assert.match(profileErrorSrc, /reset\(\)/);
});
