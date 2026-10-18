> 归属整理：2026-10-16。原稿来自 API `docs/archive/plans/homepage-migration-plan.md`（`d9a789baed9f45ce033f97da5c627eb4cbcc8dee`）；[原始版本](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/archive/plans/homepage-migration-plan.md)。本次保留研究正文、原日期、示例和阶段语义，仅调整归属及导航。原稿中的“本仓/当前/已完成”指原记录时点；不能据此推断今天的实现或验收。

现行行为见[页面与流程](./../../页面结构与用户流程.md)、[HTTP 接口参考](./../../HTTP接口参考.md)和[测试与验收](./../../测试与验收.md)；设计与调研入口见[专题索引](./../../设计与调研.md)。SQL 查询台已删除，旧 Server Actions、Mock、全量前端搜索和发布步骤均不可直接作为现行实现依据。

---

# 首页搬迁方案：基于 Mainline 模板 + Launch UI 高级组件

## 一、背景与目标

将竞赛问答平台首页从当前自研 Portal 风格，迁移到以 **mainline-nextjs-template** 为布局骨架、**launch-ui** 为高级视觉组件的全新设计，同时 **完整保留现有业务功能和数据驱动逻辑**。

---

## 二、现有首页功能清单（必须保留）

| 功能模块 | 当前组件 | 数据来源 | 说明 |
|---------|---------|---------|------|
| 导航栏 | `PortalNavbar` | session (auth) | 登录/未登录态切换、管理台入口、移动端抽屉 |
| 英雄区 | `PortalHero` | homepage data | 主标题、CTA 按钮、特色卡片、右侧精选赛事卡 |
| 快速统计 | `PortalQuickLinks` | homepage data | 报名中赛事数、最新通知数、名人堂数、我的报名状态 |
| 精选赛事 | `PortalFeaturedCompetitions` | homepage data | 最多 3 张赛事卡片 |
| 通知公告 | `PortalNoticeBoard` | homepage data | 置顶通知 + 次要通知列表 |
| 名人堂 | `PortalHallOfFame` | homepage data | 横向滚动人物卡片 |
| 页脚 | `PortalFooter` | 静态 | 平台链接、联系方式 |
| 动效组件 | `motion/*` | - | AnimatedCounter, FadeInOnScroll, StaggerChildren, SpotlightCard, Marquee |

---

## 三、新架构设计

### 3.1 技术栈兼容性

| 维度 | 当前项目 | Mainline 模板 | Launch UI | 兼容性 |
|------|---------|--------------|-----------|--------|
| Next.js | 16.1.1 | 15.5.5 | 16.2.4 | 兼容（均为 App Router） |
| React | 19.2.3 | 19.2.0 | 19.2.5 | 兼容 |
| Tailwind | 4.1.18 | 4.1.14 | 4.2.1 | 兼容（均为 v4 + PostCSS） |
| shadcn/ui | new-york | new-york | new-york | 完全一致 |
| 动画 | framer-motion | motion + embla | tw-animate-css | 需统一，保留 framer-motion |
| 主题 | next-themes | next-themes | next-themes | 一致 |
| 字体 | Inter + JetBrains Mono | DM Sans + Inter | Inter | 保留当前字体方案 |

### 3.2 新首页结构（从上到下）

```
┌─────────────────────────────────────────────────────┐
│  Navbar (Mainline 浮动胶囊导航 + 当前业务逻辑)        │
├─────────────────────────────────────────────────────┤
│  Hero (Launch UI 动画渐变标题 + 设备 Mockup)          │
│  ├─ 主标题 + 副标题（保留当前文案）                     │
│  ├─ CTA 按钮组（查看全部比赛 / 查看我的报名）           │
│  ├─ 精选赛事卡（右侧/下方设备 Mockup 内展示）          │
│  └─ Glow 光效 + appear 动画                          │
├─────────────────────────────────────────────────────┤
│  Stats (Launch UI Stats 组件)                        │
│  ├─ 报名中赛事数                                     │
│  ├─ 最新通知数                                       │
│  ├─ 名人堂人数                                       │
│  └─ 我的报名状态                                     │
├─────────────────────────────────────────────────────┤
│  Featured Competitions (Mainline Features 卡片风格)   │
│  ├─ 标题 + 描述                                      │
│  ├─ 3 列赛事卡片（复用 CompetitionCard）              │
│  └─ DashedLine 装饰分隔                              │
├─────────────────────────────────────────────────────┤
│  Notice Board (Mainline Resource Allocation 布局)     │
│  ├─ Bento Grid 风格                                  │
│  ├─ 置顶通知大卡 + 次要通知小卡                        │
│  └─ 渐变背景 + 虚线分隔                               │
├─────────────────────────────────────────────────────┤
│  Hall of Fame (Mainline Testimonials 轮播风格)        │
│  ├─ 标题 + 描述                                      │
│  ├─ 横向轮播人物卡片（Embla Carousel 或保留 Marquee）  │
│  └─ 头像 + 姓名 + 标签 + 简介                        │
├─────────────────────────────────────────────────────┤
│  CTA (Launch UI CTA 组件)                            │
│  ├─ "开始你的竞赛之旅"                                │
│  ├─ 底部 Glow 动画                                   │
│  └─ 按钮：查看全部比赛 / 立即注册                      │
├─────────────────────────────────────────────────────┤
│  Footer (Mainline Footer 风格 + 当前链接)             │
│  ├─ 平台链接列                                       │
│  ├─ 联系方式                                         │
│  └─ 大字 Logo + 渐变淡出                             │
└─────────────────────────────────────────────────────┘
```

### 3.3 视觉增强（来自 Launch UI）

| 效果 | 来源组件 | 应用位置 |
|------|---------|---------|
| 玻璃拟态 (glass-1~5) | Launch UI `utils.css` | Stats 卡片、通知卡片 |
| 光晕效果 (Glow) | Launch UI `glow.tsx` | Hero 底部、CTA 底部 |
| 光束效果 (Beam) | Launch UI `beam.tsx` | Hero 背景 |
| 布局线 (LayoutLines) | Launch UI `layout-lines.tsx` | 全页装饰 |
| appear 动画 | Launch UI `globals.css` | Hero 元素逐级出现 |
| 虚线装饰 | Mainline `dashed-line.tsx` | 区块分隔 |
| 浮动胶囊导航 | Mainline `navbar.tsx` | 顶部导航 |
| 设备 Mockup | Launch UI `mockup.tsx` | Hero 精选赛事展示 |

---

## 四、文件变更计划

### 4.1 新增文件

```
src/components/marketing/
├── new-navbar.tsx              # 基于 Mainline 浮动导航 + 当前业务逻辑
├── new-hero.tsx                # 基于 Launch UI Hero + 精选赛事
├── new-stats.tsx               # 基于 Launch UI Stats + 当前数据
├── new-featured.tsx            # 基于 Mainline Features 布局 + CompetitionCard
├── new-notice-board.tsx        # 基于 Mainline Resource Allocation 布局
├── new-hall-of-fame.tsx        # 基于 Mainline Testimonials 轮播
├── new-cta.tsx                 # 基于 Launch UI CTA
├── new-footer.tsx              # 基于 Mainline Footer 风格

src/components/ui/
├── glow.tsx                    # 从 Launch UI 移植
├── beam.tsx                    # 从 Launch UI 移植
├── mockup.tsx                  # 从 Launch UI 移植
├── layout-lines.tsx            # 从 Launch UI 移植
├── dashed-line.tsx             # 从 Mainline 移植

src/styles/
└── launch-ui-utils.css         # Launch UI 的 glass/fade 工具类
```

### 4.2 修改文件

```
src/app/page.tsx                # 替换为新组件组合
src/app/globals.css             # 合入 appear 动画 keyframes + Launch UI CSS 变量
```

### 4.3 保留不动的文件

```
src/server/repositories/homepage-repository.ts   # 数据层不变
src/components/competitions/competition-card.tsx  # 赛事卡片复用
src/components/motion/*                          # 动效组件继续使用
src/lib/auth/*                                   # 认证逻辑不变
```

### 4.4 旧文件处理

当前 `portal-*` 组件暂时保留（不删除），待新首页验证通过后再清理：
- `portal-navbar.tsx`
- `portal-hero.tsx`
- `portal-quick-links.tsx`
- `portal-featured-competitions.tsx`
- `portal-notice-board.tsx`
- `portal-hall-of-fame.tsx`
- `portal-footer.tsx`

---

## 五、实施步骤

### Phase 1：基础设施准备

1. 从 Launch UI 移植工具类到 `src/styles/launch-ui-utils.css`（glass、fade、line 类）
2. 从 Launch UI 移植 `appear` / `appear-zoom` 动画到 `globals.css`
3. 移植 UI 组件：`glow.tsx`、`beam.tsx`、`mockup.tsx`、`layout-lines.tsx`
4. 从 Mainline 移植 `dashed-line.tsx`、`background.tsx`
5. 确认 Tailwind 配置兼容（oklch 色彩变量、brand 色）

### Phase 2：逐个构建新区块

按从上到下顺序，每完成一个区块即可在开发环境预览：

1. **new-navbar** — 移植 Mainline 浮动胶囊样式，接入当前 auth 逻辑和导航项
2. **new-hero** — 移植 Launch UI Hero 动画标题 + Glow，右侧用 Mockup 展示精选赛事
3. **new-stats** — 移植 Launch UI Stats 渐变数字，绑定 `homepageData` 统计数据
4. **new-featured** — 用 Mainline Features 卡片布局包裹 `CompetitionCard`
5. **new-notice-board** — 用 Mainline Bento Grid 布局展示通知
6. **new-hall-of-fame** — 用 Mainline Testimonials 轮播展示名人堂
7. **new-cta** — 直接使用 Launch UI CTA 组件，替换文案
8. **new-footer** — 用 Mainline Footer 风格，保留当前链接和信息

### Phase 3：组装与替换

1. 修改 `src/app/page.tsx`，用新组件替换旧组件
2. 添加 `LayoutLines` 全页装饰
3. 调整间距、响应式断点、暗色模式适配
4. 端到端测试：登录态/未登录态、空数据/有数据、移动端/桌面端

### Phase 4：清理

1. 确认新首页功能完整、视觉正确
2. 删除旧 `portal-*` 组件
3. 清理未使用的依赖

---

## 六、新增依赖

| 包名 | 用途 | 是否必须 |
|------|------|---------|
| `embla-carousel-react` | 名人堂轮播（如果替换 Marquee） | 可选 |
| `react-fast-marquee` | 已有，无需新增 | - |

> 当前项目已有 framer-motion、next-themes、radix-ui 全套、lucide-react，无需额外安装核心依赖。

---

## 七、风险与注意事项

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Tailwind v4 CSS 变量冲突 | 颜色异常 | 统一在 globals.css 中定义，Launch UI 的 brand 色映射到当前 primary |
| Launch UI 使用 oklch brand 色 | 与当前 oklch 体系可能冲突 | 将 `--brand` 映射为当前 `--primary` |
| Mainline 使用 DM Sans 字体 | 字体不一致 | 不引入 DM Sans，统一使用当前 Inter |
| 动画库混用 | framer-motion vs tw-animate-css | 保留 framer-motion 为主，Launch UI 的 CSS 动画作为补充 |
| 服务端组件 vs 客户端组件 | 交互组件需要 "use client" | Navbar、Stats（计数动画）、轮播为客户端组件，其余保持服务端 |
| 暗色模式适配 | Launch UI glass 效果依赖暗色 | 确保 light/dark 两套变量都定义完整 |
| 移动端响应式 | 两套模板断点可能不同 | 统一使用当前项目的 container 和断点配置 |

---

## 八、预期效果对比

| 维度 | 当前首页 | 新首页 |
|------|---------|-------|
| 导航 | 普通粘性顶栏 | 浮动胶囊导航 + 毛玻璃 |
| Hero | 渐变背景 + 浮动圆球 | 动画渐变标题 + Glow 光效 + 设备 Mockup |
| 统计 | 4 列卡片 + 计数动画 | 大号渐变数字 + 光晕文字 |
| 赛事展示 | 普通卡片网格 | 带虚线装饰的特色卡片 + 悬停箭头动画 |
| 通知 | 大卡 + 小卡列表 | Bento Grid 布局 + 渐变遮罩 |
| 名人堂 | Marquee 滚动 | Embla 轮播 + 大头像卡片 |
| CTA | 无 | 全宽 CTA + 底部 Glow 动画 |
| 页脚 | 三列链接 | 大字 Logo + 渐变淡出 + 链接列 |
| 全局装饰 | 无 | LayoutLines 虚线网格覆盖 |
| 整体质感 | 功能性为主 | SaaS 级视觉品质，玻璃拟态 + 光效 |

---

## 九、验证清单

- [ ] 未登录用户可正常浏览所有区块
- [ ] 登录用户可看到个性化内容（我的报名状态、管理台入口）
- [ ] 管理员可看到"进入管理台"按钮
- [ ] 数据库无数据时显示空状态（不报错）
- [ ] 数据库未配置时 fallback 到 mock 数据
- [ ] 移动端（<768px）布局正常
- [ ] 暗色模式下所有组件可读
- [ ] 页面加载性能无明显退化（Server Component 优先）
- [ ] 所有链接跳转正确（/competitions, /me, /admin 等）
- [ ] 动画流畅，无布局抖动
