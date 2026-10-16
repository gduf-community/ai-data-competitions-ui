> 归属整理：2026-10-16。原稿来自 API `docs/archive/plans/plan-hall-of-fame.md`（`d9a789baed9f45ce033f97da5c627eb4cbcc8dee`）；[原始版本](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/archive/plans/plan-hall-of-fame.md)。本次保留研究正文、原日期、示例和阶段语义，仅调整归属及导航。原稿中的“本仓/当前/已完成”指原记录时点；不能据此推断今天的实现或验收。

现行行为见[页面与流程](./../../页面结构与用户流程.md)、[HTTP 接口参考](./../../HTTP接口参考.md)和[测试与验收](./../../测试与验收.md)；设计与调研入口见[专题索引](./../../设计与调研.md)。SQL 查询台已删除，旧 Server Actions、Mock、全量前端搜索和发布步骤均不可直接作为现行实现依据。

---

> **[已归档]** 本文档已被 `docs/archive/plans/个人中心与名人堂联动方案.md` 替代。公开态名人堂展示方案的后续演进以联动方案为准。

# 名人堂 + 个人主页 实现方案（v2）

## 一、总体目标

说明：

- 本文聚焦公开态“名人堂 + 个人主页”展示方案。
- 登录态“个人中心 / 我的信息 / 头衔 / 公开开关”后续以 `docs/archive/plans/个人中心与名人堂联动方案.md` 为准。

1. **首页新增名人堂模块**：在 `PortalResourceBoard`（资料区）之前插入「名人堂」轮播组件，展示活跃竞赛人物卡片。资料区保留不动。
2. **新增个人主页**：点击名人堂人物卡片跳转到 `/profile/[id]`，展示公开个人信息 + 已发布经验文章。
3. **经验展示**：个人主页展示获奖比赛的赛后总结（富文本），仅展示作者主动发布的内容，不读取报名记录。
4. **导航新增入口**：navbar 新增「名人堂」链接，原有「报名资料」链接保留。

### 不做的事

- 不移除首页资料区（`PortalResourceBoard`），不改动 `resourceLibrary` 数据源。
- 不在公开个人页暴露报名记录、审核状态等内部数据。
- 本轮不新增后台管理 CRUD，名人堂和经验展示数据走 mock 回退（与现有 `isDatabaseConfigured()` 模式一致）。

---

## 二、数据模型

本轮仅在 `src/lib/mock-data.ts` 中新增 mock 数据结构，不新增数据库表。原因：当前没有后台维护入口，新增真实表在有数据库的环境下会导致名人堂长期为空。

待后续实现后台名人堂管理页后，再将 mock 结构迁移为正式 schema。

### 2.1 Mock 数据结构：名人堂条目

```ts
export interface HallOfFameEntry {
  id: string;
  userId: string;
  userName: string;
  userImage: string | null;
  college: string;
  tag: string;           // 如「国赛金奖」「省赛一等奖」
  bio: string;           // 一句话简介
  displayOrder: number;
}
```

### 2.2 Mock 数据结构：经验展示文章

```ts
export interface ExperiencePost {
  id: string;
  userId: string;
  userName: string;
  competitionId: string | null;
  competitionTitle: string;
  title: string;
  content: string;        // HTML 富文本
  awardLevel: string;     // 如「国家级一等奖」
  coverImage: string | null;
  isPublished: boolean;
  publishedAt: string;
}
```

### 2.3 Mock 数据（对齐现有主键体系）

Mock 数据中的 `userId` 和 `competitionId` 必须复用现有 mock 数据的主键。

- 用户 ID：复用 `USR-001`～`USR-004`（现有 `users` 数组），名人堂条目直接引用这些 ID，不引入新的用户 ID 体系。如需更多名人堂人物，在现有 `users` 数组中追加新用户（ID 格式 `USR-xxx`）。
- 比赛 ID：复用 `math-modeling-2026`、`robot-innovation-2026`、`programming-contest-2026`（现有 `competitions` 数组）。
- 个人主页路由 `/profile/[id]` 中的 `id` 即为 `USR-xxx`，`profile-repository` 直接从 mock `users` 数组按 ID 查找用户基本信息，从 mock `hallOfFameEntries` 按 `userId` 查找名人堂条目，从 mock `experiencePosts` 按 `userId` + `isPublished` 查找已发布文章。三者共享同一套用户 ID，无需额外映射。

---

## 三、首页改造

### 3.1 保留资料区，新增名人堂模块

`src/app/page.tsx` 模块顺序调整为：

```
PortalNavbar
PortalHero
PortalQuickLinks
PortalFeaturedCompetitions
PortalNoticeBoard
PortalHallOfFame          ← 新增
PortalResourceBoard       ← 保留
PortalFaq
PortalFooter
```

### 3.2 QuickLinks 调整

在现有 quickLinks 数组中新增一项「名人堂」，保留原有「资料入口」：

```ts
{
  href: "/#hall-of-fame",
  label: "名人堂",
  value: `${homepageData.hallOfFameEntries.length} 位`,
  description: "展示活跃竞赛人物和获奖经验分享。",
}
```

注意：quickLinks 目前有 4 项，新增后变为 5 项。如果布局不适合 5 项，可将「名人堂」替换「资料入口」在 quickLinks 中的位置，但资料区组件本身仍保留在页面中。具体取决于 UI 效果，实现时再定。

### 3.3 导航栏调整

`portal-navbar.tsx` 中 `navLinks` 新增一项：

```ts
const navLinks = [
  { href: "/competitions", label: "比赛列表" },
  { href: "/#latest-notices", label: "通知公告" },
  { href: "/#resource-library", label: "报名资料" },  // 保留
  { href: "/#hall-of-fame", label: "名人堂" },         // 新增
];
```

### 3.4 homepage-repository 调整

在 `getHomepagePortalData()` 中新增 `hallOfFameEntries` 字段，数据来源为 mock：

```ts
export interface HomepagePortalData {
  featuredCompetitions: Competition[];
  latestNotices: PublishedNoticeRecord[];
  resourceLibrary: HomepageResourceRecord[];  // 保留
  hallOfFameEntries: HallOfFameEntry[];       // 新增
  featuredFaqs: HomepageFaqRecord[];
}
```

查询逻辑：本轮直接返回 mock 数据（不走 `isDatabaseConfigured()` 分支），后续有真实表后再补数据库查询。

### 3.5 名人堂轮播组件

新建 `src/components/marketing/portal-hall-of-fame.tsx`。

**UI 布局**（参考用户提供的截图，与现有 `PortalResourceBoard` 风格对齐）：

```
┌─────────────────────────────────────────────────────┐
│  左侧介绍卡片（深色背景）    │   人物卡片轮播区域        │
│                              │                          │
│  ★ 名人堂                    │  ┌──────┐ ┌──────┐ ┌──────┐ │
│                              │  │ 头像 │ │ 头像 │ │ 头像 │ │
│  竞赛达人风采                │  │ 姓名 │ │ 姓名 │ │ 姓名 │ │
│  展示活跃竞赛人物            │  │ 标签 │ │ 标签 │ │ 标签 │ │
│  和获奖经验分享              │  │ 简介 │ │ 简介 │ │ 简介 │ │
│                              │  └──────┘ └──────┘ └──────┘ │
│  [更多名人 →]                │        ← 左  右 →          │
└─────────────────────────────────────────────────────┘
```

**功能要点**：
- 左侧：深色背景介绍卡（复用 `PortalResourceBoard` 的左侧卡片风格），标题「名人堂」，底部「更多名人」按钮链接到 `/hall-of-fame`。
- 右侧：人物卡片横向轮播，每张卡片包含头像（圆形）、姓名、标签（Badge）、一句话简介。
- 左右箭头按钮控制轮播滚动。
- 点击卡片跳转到 `/profile/[userId]`。
- 无数据时显示空状态提示。
- 响应式：移动端左侧卡片全宽，右侧卡片可横向滑动。

**技术方案**：
- CSS scroll-snap 实现轮播，不引入额外库。
- `useRef` + `scrollBy` 控制左右箭头滚动。
- 卡片使用 shadcn `Card`，标签使用 `Badge`。
- 头像使用 `next/image`，fallback 到首字母占位。

---

## 四、个人主页

### 4.1 路由

新建 `src/app/profile/[id]/page.tsx`（公开页面，无需登录）。

### 4.2 数据边界（隐私约束）

**访问控制**：`/profile/[id]` 只有当 `hallOfFameEntries` 中存在对应 `userId` 时才返回页面，否则调用 `notFound()` 返回 404。非名人堂用户的个人页不可公开访问。

公开个人页**只展示以下数据**：
- 用户基本信息：姓名、头像、学院（来自 user 表公开字段）
- 名人堂条目：tag、bio（来自 hall_of_fame mock 数据）
- 已发布经验文章列表：标题、获奖等级、发布时间（来自 experience_post mock 数据，仅 `isPublished === true`）

**不展示**：
- 报名记录（draft/submitted/rejected/withdrawn 等状态）
- 审核意见、审核时间线
- 邮箱、手机号、学号等敏感字段

### 4.3 页面结构

```
┌─────────────────────────────────────────┐
│  顶部导航栏（复用 PortalNavbar）         │
├─────────────────────────────────────────┤
│  个人信息区                              │
│  ┌──────────────────────────────────┐   │
│  │  头像（大）  姓名                 │   │
│  │              学院                 │   │
│  │              名人堂标签（Badge）   │   │
│  │              个人简介（bio）       │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│  经验展示区                              │
│  - 已发布的赛后总结文章列表              │
│  - 每篇显示：标题、关联比赛、获奖等级、  │
│    发布时间                              │
│  - 点击进入文章详情                      │
│  - 无文章时显示空状态                    │
└─────────────────────────────────────────┘
```

注意：不设「竞赛经历」Tab，因为该数据来源是报名记录，属于内部数据。个人主页只有一个内容区：经验展示。

### 4.4 经验文章详情页

路由：`src/app/profile/[id]/experiences/[postId]/page.tsx`

展示单篇经验文章的完整内容。需同时校验两个条件：`isPublished === true` 且文章的 `userId === id`（路由参数），任一不满足则返回 404。防止通过路径拼接访问到其他用户的文章。

HTML 内容渲染使用 `dangerouslySetInnerHTML`，需对 mock 内容做 sanitize（使用 `DOMPurify` 或类似库）。

### 4.5 涉及文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/app/profile/[id]/page.tsx` | 新建 | 个人主页 |
| `src/app/profile/[id]/experiences/[postId]/page.tsx` | 新建 | 经验文章详情页 |
| `src/app/profile/[id]/layout.tsx` | 新建 | 共享布局（navbar + footer） |
| `src/server/repositories/profile-repository.ts` | 新建 | 个人主页数据查询（mock） |

---

## 五、名人堂列表页

路由：`src/app/hall-of-fame/page.tsx`

展示所有名人堂成员的网格列表，作为「更多名人」按钮的目标页。每个卡片点击跳转到 `/profile/[userId]`。

布局参考比赛列表页的网格风格。本轮数据来源为 mock。

---

## 六、实施步骤

| 步骤 | 内容 | 涉及文件 |
|------|------|----------|
| 1 | Mock 数据：在 `mock-data.ts` 新增 `HallOfFameEntry`、`ExperiencePost` 类型和示例数据 | `src/lib/mock-data.ts` |
| 2 | 新建 `profile-repository.ts`：查询名人堂条目、用户公开信息、已发布经验文章 | `src/server/repositories/profile-repository.ts` |
| 3 | 修改 `homepage-repository.ts`：新增 `hallOfFameEntries` 查询（mock），保留 `resourceLibrary` | `src/server/repositories/homepage-repository.ts` |
| 4 | 新建 `portal-hall-of-fame.tsx` 轮播组件 | `src/components/marketing/portal-hall-of-fame.tsx` |
| 5 | 修改首页 `page.tsx`：插入 `PortalHallOfFame`，保留 `PortalResourceBoard`，调整 quickLinks | `src/app/page.tsx` |
| 6 | 修改 `portal-navbar.tsx`：navLinks 新增「名人堂」 | `src/components/marketing/portal-navbar.tsx` |
| 7 | 新建个人主页 `/profile/[id]` | `src/app/profile/[id]/page.tsx` + `layout.tsx` |
| 8 | 新建经验详情页 `/profile/[id]/experiences/[postId]` | `src/app/profile/[id]/experiences/[postId]/page.tsx` |
| 9 | 新建名人堂列表页 `/hall-of-fame` | `src/app/hall-of-fame/page.tsx` |

**预计新增文件：7 个，修改文件：3 个**

---

## 七、后续阶段（本轮不做）

以下内容明确后置，不在本轮实现：

1. **数据库 schema**：新增 `hall_of_fame_entry` 和 `experience_post` 表，`user` 表加 `bio` 字段。前提：后台管理 CRUD 同步就绪。
2. **后台管理页**：名人堂条目管理（增删改查、排序、启停）、经验文章审核。
3. **用户自助发布**：学生在「我的」页面撰写和提交经验文章。
4. **资料区迁移**：如果未来确认资料区不再需要独立首页展示，再做移除决策。

---

## 八、注意事项

- 资料区（`PortalResourceBoard`）和 `resourceLibrary` 数据源完整保留，不做任何改动。
- 个人主页严格遵守数据边界：只展示名人堂条目和已发布经验文章，不读取 `registrations` 表。
- Mock 数据的 `userId` 复用 `USR-xxx` 格式，`competitionId` 复用 `math-modeling-2026` 等现有值，不引入新的 ID 体系。
- 名人堂轮播组件的视觉风格与现有 `PortalResourceBoard` 左侧深色卡片保持一致。
- 经验文章 HTML 内容渲染前必须做 sanitize。
- 头像使用 `next/image`，无头像时 fallback 到姓名首字母占位圆。
