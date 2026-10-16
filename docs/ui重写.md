> 归属整理：2026-10-16。原稿来自 API `docs/archive/records/ui重写-分仓前.md`（`d9a789baed9f45ce033f97da5c627eb4cbcc8dee`）；[原始版本](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/archive/records/ui重写-分仓前.md)。本次保留研究正文、原日期、示例和阶段语义，仅调整归属及导航。原稿中的“本仓/当前/已完成”指原记录时点；不能据此推断今天的实现或验收。

现行行为见[页面与流程](./页面结构与用户流程.md)、[HTTP 接口参考](./HTTP接口参考.md)和[测试与验收](./测试与验收.md)；设计与调研入口见[专题索引](./设计与调研.md)。SQL 查询台已删除，旧 Server Actions、Mock、全量前端搜索和发布步骤均不可直接作为现行实现依据。

---

> 历史快照：2026-10-07 文档分仓与停止 CD 前。保留原设计、任务编号和验证语境；不作为现行操作说明。当前入口：[Web 现行说明](https://github.com/gduf-community/ai-data-competitions-ui/blob/main/docs/%E8%A7%86%E8%A7%89%E4%B8%8E%E4%BA%A4%E4%BA%92%E8%A7%84%E8%8C%83.md)。

# UI 重写设计输入

> 状态：活动设计参考。2026-10-04整理时保留原案例分析；候选视觉方向不代表当前页面实现或新的确定产品范围。现状见[门户模块](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/modules/门户与公共展示.md)与[前端底座](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/modules/前端底座.md)，具体改动仍遵守[视觉规范](./视觉与交互规范.md)。

返回[文档入口](./README.md)。

我先按“获奖/策展质量高 + 与学院竞赛平台可迁移”筛了一轮。候选池超过 50 个，我重点拆了二十多个代表案例，并把相近案例归成 5 组。一个很明显的结论是：你要的方向并不是“高校官网做得高级一点”，而是 **Institutional + Editorial + Research System**，再加少量 Exhibition/Experimental 的活力。

![Image](https://images.openai.com/static-rsc-4/vwTXCK7Wdk9vLqJOckJ1gIh5SV4Y3lHf-Zae9sjzEeIGkuBM_dmlSy6Huzc6cDfHU3VJ_qNX2vp-s0WngTzBmQcsRMbUGhBLNpsZggCKyAnSJo_w7ZO9Q4jFfq1CIkWMEYZsM7sB0cdg8QF39_XCSafXiwkMAvBSK7RxFU6qee_VbjAiwvIhK2DdpXDRW1jE?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/IqkxAMTzm3B-JRkHx5sLHkVP4f_D9f4M1XXCiVn0QWrxvcHwKAbk__WFLCPdpeSTpnz5yh8_WaTR1zppThR4_L7vpAjhYmRxx7fxt77oJV-Z4aKJ9DohpLdlOBZDQ3nLJMGFr3_f2WOhNJVONtXMalVTVBQjXimCn94G85weORsFQZmH-21om1anMN4i2qE5?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/ODiyd1DTqYsx7c2mtXYCzDNF1I4ppWdtqTAHogTD4tYLT2hVlbeUJvizXVtNYD71I_0j8Y72u2f7rP-D-ic3Ps-uuXLHTlX5e-6qdn4KNzXfHt4I2ID4UltGuOaHEU0ItWonAYkM146LrYHwQ-150McOppPi_lR9PByreAFoYgF1zsEpkUJRr7lTwJPQbWXO?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/ug_4j7iMReAzh-BXnk44m9CvKL9dufM_-YppXoj3dbQX7ZeCGDxHBQesvTRL62PUy77WmCRwHxZZf3eswUiOpo2Pa9FreKeEdE39Spe027Vb3-TkKTqXftwY3OLnPYDJPYq96JP2DTEeM3vRHL0D4x6hsDPM29EOSwNb9ghoCGvFLNVDfbiiXwrrajShuiYb?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/k7xg0hnY6dQNOxzUAxwA3NSok5AIsZ7gAxgwQshF8okhwEFbxAYxMlJErcvIBBbZxnxFWuLIcJQgbvMDtnVpcElC0cDE5EC31bcQwZfvsxZDwVJ5Upzjvd8K8_EHuuYJsTYl1Id6F49Z5cd4IIQmYyPuNzD76RAUxOdB4_3PHtuRJQyX4aYpngZyuxQaGEbw?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/KUezoWXhwGtHBrzJUCfHIe1fEzM6Ca7eg9llluJorlniI3B_7uJIfjzw8p83f7mapvEsNOzb3EM-Nn8VZVQFRMHWqRV9LVf5jkGaxCuocNo2dT2xqT1lckhadQEvY6ON5Ca07zYuyMt3-eqXu63kvFfsZALI2R0cBHNVRY6p-Y1daRcEqSZZGLtqT35EKBw6?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/sDZROkMOKMYtsPWW5dHwEXPuM4bTElEwfhTmNIxCiOBvi1xhsI8_SWbqUVGN5TF6hzmsIiN1JUG1CkrW-XQ6nq8GLEp8JG7PnkkMpIfRnem_pZkrE_OdRxY1Q2XTUMVTbIKm8by1MJfuefi8qIkJ_9FuEsAhfQDCAgdkh213H9z7qpyO9frsuuo7-YnzHjzJ?purpose=fullsize)

![Image](https://images.openai.com/static-rsc-4/-dYLxtuF-JPnMLdW22d3mJeXmsWgP71w8XfG1m2S_7s87zMNWnRPUCdgRYsTYvKpl4-yxOhhxqWZ4HPwJiBwqDmc1K0SE_laihDkAG-QK-sCIcYBx3_eanYS7o6yga0i-8HZ8Fy3R7s4UUTW9MgGPZ5rtYfwm3IYPIayUhbg23Mft6KQEMFk_pQwyhKOPLJS?purpose=fullsize)

### 我筛的参考池

| 组别        | 代表案例                                                                                                                                                                               |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 学术 / 设计院校 | Yale Architecture、Harvard GSD、Columbia GSAPP、MIT Media Lab、RISD、Royal College of Art、School of Visual Arts、Cooper Union                                                            |
| 近年教育类获奖   | Limerick School of Art & Design、Cornell Human Ecology、Harvard T.H. Chan、VCUarts、Moore College of Art & Design、Yale & Slavery Research Project、SAIC、Stanford Engineering Centennial |
| 研究 / 教育实验 | Axiom Research、OceanX 2025、Design Education Series、Typography Principles、UCSE Degree Show、AI Takes Over、ANZSOG、IBA Kolding                                                         |
| 编辑 / 学术出版 | IEEE Spectrum、The European Review of Books、The Avery Review、Sternberg Press、PRINT、Kinfolk、Cereal、Wax Poetics                                                                       |
| 建筑 / 文化机构 | Kieran Timberlake、Reed Hilderbrand、Franklin Azzi、Van Gogh Museum、Museum of Contemporary Art Australia、Foam、Light Art Space、Centre de la photographie Genève                        |

Webby 的 School/University 类近三年确实集中出现了 Limerick School of Art & Design、Cornell Human Ecology、VCUarts、Harvard Chan、Moore College、Yale & Slavery、RISD 等案例；SiteInspire 的高校、出版、杂志、建筑和博物馆分类又补上了 Yale Architecture、RISD、IEEE Spectrum、Kinfolk、Avery Review、Kieran Timberlake 等更偏 Art Direction 的站点。([NEW Webby Gallery + Index][1])

CSS Design Awards 那一组非常有意思：Design Education Series 官方标签直接就是 `grid / scroll / typographic`，Typography Principles 是 `animated / scroll / typographic`；Axiom Research 甚至用数学模型实时生成 attractor 作为研究机构的视觉核心，而 OceanX 则把科研内容做成深海蓝 WebGL 叙事。说明“学术”完全不等于保守。([CSS设计奖][2])

---

## 真正值得吸收的不是某个页面，而是下面这些规律

### 1. 最好的学术网站首先是一个「视觉系统」

MIT Media Lab 最典型。Pentagram 没有给它做一堆“科技感组件”，而是从一个 **7×7 grid** 出发，把整个研究机构以及 23 个研究组都编码成同源 glyph system。Columbia GSAPP 也不是靠一套卡片，而是做了一个会随一天四个时段改变字重和笔画方向的 identity，并把网站定义成一个“connection machine”。Harvard GSD 新 identity 则专门设计了可用于数字环境的 variable font。([Pentagram][3])

这对你的网站非常关键：

> 不要寻找“好看的组件库”，要寻找一个可以反复生成页面的视觉语法。

这也是现在 AI 味最难去掉的一步。

---

### 2. Typography 不是装饰，而是主 UI

我看下来，优秀案例里最稳定的共同点不是渐变、WebGL，也不是动画，而是**文字本身具有构图能力**。

Yale Architecture 几乎可以让标题、细线、图片和极少的按钮完成整个页面；Harvard GSD 直接用 serif 大标题 + 编号 + 极淡底色组织研究主题；Avery Review 甚至基本就是文字构图；Obys 的教育项目更是直接把 typography 当作主体。

这和典型 AI UI 正好相反。

典型 AI UI 是：

```text
icon
标题
两行描述
rounded-xl card
shadow
```

这些站点是：

```text
字号
字重
字宽
行距
缩进
编号
对齐
留白
```

本身承担结构。

---

### 3. 「冷」不是把整个网站染成蓝色

真正高级的冷感通常是：

```text
低彩度 neutral canvas
+
墨色文字
+
很少量 institutional blue / cyan
+
高能量 accent
```

Harvard GSD 是非常浅的冷蓝底；Yale Architecture 大面积白黑，再突然用蓝、黄；MIT Media Lab 可以使用非常饱和的研究图像，但 UI 本身很克制；IEEE Spectrum 大量黑白结构里插入内容图片和少量颜色；OceanX 才在真正需要沉浸时使用深海蓝。

所以你之前说的“冷色调但是保有活力”，我现在会把它重新定义成：

> **冷色是环境，活力来自局部冲突。**

不是全站蓝紫渐变。

---

### 4. Card 不是默认容器

这是我觉得你现在前端 AI 味最明显的来源。

Avery Review、IEEE Spectrum、European Review of Books、Sternberg Press 这些编辑类页面，信息区块大量依赖：

* column
* rule
* baseline
* section
* image crop
* typography
* background field

而不是每一条内容都装进一个圆角矩形。

IEEE Spectrum 的重构尤其适合参考。设计团队明确希望它表现出“technical / engineering / precise”，但又不变成对未来科技的漫画式想象。网站使用的是 flexible modular grid。这个尺度其实和你的金融数学/竞赛平台非常接近。([IEEE Spectrum][4])

我会把这一句直接当设计原则：

> **Technical, precise, but never a caricature of technology.**

---

### 5. Grid 应该被看见，而不是藏起来

传统产品设计喜欢把 grid 藏在背后。

这一类站点经常反过来：**让 grid 成为视觉语言的一部分。**

你会频繁看到：

```text
01
02
03

──────────

2026 / 09

Research
Competition
Archive
```

包括：

* 细竖线
* 横向 rules
* 编号
* index
* metadata
* 坐标感
* 表格式标题
* 不对称 column

尤其是建筑学院、设计学院、杂志类网站。

这其实非常适合“竞赛平台”：年份、赛道、截止日期、报名状态、奖项等级，本来就天然是结构化信息。

---

### 6. 学术感来自「信息真实性」，而不是 serif font

很多所谓 academic UI 最大的问题就是：

```text
换个衬线字体
+
米白背景
=
学术
```

不是。

真正有学术感的网站会认真呈现：

```text
作者
日期
项目编号
研究领域
publication
citation
institution
status
archive
issue
volume
metadata
```

Avery Review 是期号与作者；IEEE Spectrum 是栏目和内容层级；MIT Media Lab 是 People / Groups / Projects / Publications 的关系网络；Harvard Chan 的重构则直接围绕 Discover / Teach / Engage 和研究到现实影响的路径组织信息。([Avery Review][5])

所以你的网站如果要有真正的“学院气”，应该增加的是**学术信息结构**，不是装饰。

---

### 7. 活力应该来自「规则被有控制地打破」

RISD、SVA、GSAPP、Sternberg Press 都有很强的活力，但并不靠满屏特效。

通常是：

```text
稳定 grid
+
突然放大的字体
```

或者：

```text
冷静背景
+
一块极亮色
```

或者：

```text
严谨排版
+
图片故意越过 column
```

或者：

```text
标准 index
+
一个动态 identity
```

这比“所有东西都 animate”高级很多。

---

### 8. Motion 必须有概念来源

Axiom 的 attractor 因为项目本身就是数学研究，所以合理。OceanX 用 globe 和海洋，是内容本身。Columbia GSAPP 的 identity 根据太阳和时间变化，也是机构概念本身。([CSS设计奖][6])

反过来，如果只是：

```text
fade-up
scale on hover
floating card
mouse parallax
gradient blob
```

那基本就是 AI 模板味。

因此 motion rule 应该是：

> 如果不能用一句话解释“这个动画为什么属于这个机构”，那就删掉。

---

## 我认为你的网站应该走的具体方向

不是纯粹模仿任何一个站。

我会取：

```text
Harvard GSD
    的 academic/editorial hierarchy

Yale Architecture
    的极简 grid 与大胆字号

IEEE Spectrum
    的 technical precision

Avery Review
    的学术出版感

MIT Media Lab
    的系统化 identity

GSAPP
    的研究型动态语言

Design Education Series
    的 graphic-design confidence

OceanX
    的少量高能量视觉
```

混合出来。

最终应该是：

> **Cold Academic Editorial**

底层是严谨的学术出版与信息系统，上层只有 10–20% 的实验性视觉。

而不是做成 Awwwards 展示站。

这个比例很重要。你的站是有人真要报名、查比赛、提交材料、后台审核的。Webby 对学校网站和 UI/UX 也单独评审功能性；Harvard Chan 获奖项目的核心甚至是把原先 285 个分散站点整合成统一、可导航、能把研究转化为行动的系统。([NEW Webby Gallery + Index][7])

---

# 我把它压成一个 Skill

这个比之前那种“UI 风格说明文档”更有用。以后让 Codex / Claude / GPT 改这个站时，直接加载它。

```markdown
---
name: academic-editorial-web-design
description: >
  Use when designing, redesigning, reviewing, or implementing an academic,
  research, education, competition, or institutional website that should feel
  rigorous, editorial, cold-toned, youthful, and visually distinctive without
  looking like generic AI-generated SaaS UI. Especially useful for public
  portals, research pages, competition systems, archives, publications,
  academic communities, and institutional dashboards.
---

# Academic Editorial Web Design

## Purpose

Create institutional web interfaces that feel:

- academic
- precise
- editorial
- contemporary
- cold-toned
- youthful
- alive

without falling into:

- generic SaaS aesthetics
- AI-generated landing-page aesthetics
- traditional university portal aesthetics
- decorative "futuristic technology" aesthetics
- award-site interaction for its own sake

The target is:

> technical and precise without becoming a caricature of technology;
> academic without becoming conservative;
> energetic without becoming noisy.

---

# Core Design Thesis

Treat the website as a visual information system, not a collection of UI cards.

Design priority:

1. information architecture
2. typography
3. grid
4. spacing and rhythm
5. imagery
6. color
7. interaction
8. decoration

Never reverse this order.

The visual identity must remain recognizable even if:

- shadows are removed
- gradients are removed
- illustrations are removed
- animation is disabled

If the design collapses without decoration, the design system is weak.

---

# Reference Mental Model

Combine four traditions.

## Institutional

Borrow:

- rigor
- stable navigation
- authoritative hierarchy
- durable design tokens
- accessibility
- long-term maintainability

## Editorial

Borrow:

- typography-led hierarchy
- issue/index/archive language
- asymmetric composition
- captions and metadata
- rules and columns
- deliberate whitespace
- strong image crops

## Research

Borrow:

- diagrams
- data
- coordinates
- publication metadata
- project relationships
- structured taxonomy
- experiment/process imagery

## Exhibition

Borrow sparingly:

- unexpected scale
- one expressive graphic device
- controlled motion
- strong transitions
- occasional visual interruption

Institutional + Editorial + Research should form approximately 80–90% of
the design.

Exhibition should normally remain 10–20%.

---

# Anti-AI Rule

Before approving any section, ask:

> Could this section plausibly have been generated by a generic
> "modern SaaS landing page" prompt?

If yes, redesign it.

Common AI/SaaS fingerprints include:

- centered hero with eyebrow badge
- giant gradient keyword
- two CTA buttons
- floating browser mockup
- three or four identical feature cards
- icon inside colored rounded square
- rounded-2xl everywhere
- blue-purple gradients
- glassmorphism
- blurred background blobs
- excessive badges
- every section inside a card
- every card lifting on hover
- identical fade-up animation on every element
- decorative metrics with no information value
- fake testimonials
- generic abstract 3D shapes

Do not merely recolor these patterns.

Remove the pattern itself.

---

# Layout System

## Start With the Grid

Use a real desktop grid.

Preferred baseline:

- 12 columns on wide desktop
- 8 columns on tablet
- 4 columns on mobile

The grid may be visible through:

- alignment
- vertical rules
- section boundaries
- image edges
- metadata rails
- numbered indexes

Do not center everything.

Use asymmetric compositions such as:

- 2 / 10
- 3 / 9
- 4 / 8
- 5 / 7
- 7 / 5

where the content hierarchy supports it.

---

# Page Rhythm

Alternate density deliberately.

Example:

dense index
→ large quiet field
→ image
→ compact metadata
→ long-form content
→ strong typographic section break

Do not use:

card
→ card
→ card
→ card

as the main page rhythm.

Whitespace should have structural meaning.

---

# Typography

Typography is a primary interface primitive.

## Typeface Roles

Use a maximum of:

- one expressive display family
- one highly readable text/UI family
- optionally one mono family for metadata/data

A strong academic system often uses:

display serif / grotesk
+
neutral sans
+
mono metadata

but do not force serif typography when the institutional identity calls for
a grotesk-only system.

## Hierarchy

Hierarchy must be visible through:

- scale
- width
- weight
- tracking
- leading
- alignment
- indentation

before color or containers are introduced.

## Editorial Techniques

Allowed:

- oversized display type
- narrow measures
- italic editorial accents
- vertical labels
- numbered sections
- running metadata
- mono timestamps
- large title / tiny metadata contrast

Avoid ornamental type combinations without semantic purpose.

---

# Color

## Principle

Coldness should come from the environment.

Energy should come from contrast.

Preferred palette structure:

- 70–85% neutral/cool canvas
- 10–20% institutional primary
- 2–8% high-energy accent

Do not make the whole site blue.

Typical canvas families:

- cool white
- blue-grey
- graphite
- ink
- muted navy

Accent colors may be:

- electric blue
- cyan
- acid green
- signal yellow
- controlled orange

Use one dominant accent family at a time.

## Color Test

Convert the page mentally to grayscale.

If hierarchy disappears, color is doing too much work.

---

# Surfaces

Default surface should be the page itself.

Do not automatically create a Card.

Before adding a container ask:

1. Does this content require independent grouping?
2. Does it need a different interaction boundary?
3. Does it require elevation?
4. Would spacing + rule + typography solve the same problem?

If the answer to the first three is no, do not use a card.

---

# Border Radius

Institutional/editorial interfaces should prefer restrained radii.

Typical range:

- 0
- 2px
- 4px
- 6px
- occasionally 8px

Large pill shapes are reserved for controls that semantically require them.

Do not apply `rounded-xl`, `rounded-2xl`, or `rounded-3xl` globally.

---

# Shadow

Use shadow only when actual elevation exists:

- dialog
- popover
- dropdown
- floating command surface

Do not use shadow to make ordinary content sections "look premium".

Prefer:

- rules
- tone changes
- spacing
- typography
- overlap

---

# Metadata as Visual Material

Academic interfaces should treat metadata as first-class design material.

Useful fields include:

- year
- date
- author
- institution
- category
- competition level
- registration status
- issue
- volume
- research area
- project code
- deadline
- location
- team size
- advisor
- publication source

Display metadata through:

- rails
- indexes
- compact tables
- mono text
- slash-separated strings
- numbered sequences

rather than colored badges by default.

---

# Badge Rule

A Badge represents a real state.

Valid examples:

- Registration Open
- Draft
- Approved
- Rejected
- Critical

Invalid badge use:

- 2026
- Mathematics
- Team Competition
- Research
- News
- Popular

These are metadata and should normally be typography.

---

# Image Direction

Prefer authentic material:

- research imagery
- competition photographs
- diagrams
- scanned documents
- certificates
- publications
- student work
- charts
- maps
- archival material

Avoid generic:

- AI-generated science imagery
- stock students smiling at laptops
- abstract gradient blobs
- generic 3D spheres

Crop boldly when appropriate.

Images may break the grid occasionally, but only as a deliberate hierarchy
event.

---

# Graphic Language

Prefer domain-native graphics.

Examples:

- coordinate systems
- matrices
- graphs
- timelines
- grids
- network diagrams
- curves
- plotted points
- tables
- mathematical notation
- archival indexes
- publication folios

Never add mathematical symbols merely to make a page "look academic".

Every graphic motif should have a plausible relationship to the institution.

---

# Motion

Motion must have a reason.

Before implementing animation, complete this sentence:

> This object moves this way because ______.

Acceptable reasons:

- represents changing data
- visualizes a mathematical/research process
- explains hierarchy
- shows state transition
- reveals spatial relationship
- reinforces an institutional identity concept

Unacceptable reason:

- makes the page feel modern
- looks cool
- award websites do it
- the library supports it

## Motion Baseline

For functional interactions:

- 120–250 ms
- low displacement
- ease-out
- respect `prefers-reduced-motion`

Large expressive motion is reserved for:

- homepage identity moment
- research visualization
- exhibition/archive feature

Never animate every section with the same fade-up.

---

# Homepage

Do not default to the SaaS landing-page sequence:

badge
→ centered hero
→ CTA pair
→ feature cards
→ statistics cards
→ testimonials
→ CTA

Prefer an institutional index.

A strong homepage can behave like:

- journal cover
- research index
- annual report
- exhibition catalogue
- bulletin
- academic dashboard

It should quickly communicate:

- what the institution is
- what is happening now
- what is important
- where the user should go next

---

# Competition Pages

Treat a competition as a research/project dossier.

Preferred hierarchy:

competition index / year
title
short abstract
critical dates
eligibility / team structure
registration action

then:

01 Overview
02 Timeline
03 Requirements
04 Materials
05 Questions
06 Results / Archive

Use metadata tables and rules before cards.

---

# Q&A

Treat Q&A as academic discussion, not social-media feed.

Prioritize:

- question number
- author
- date
- competition context
- readable long-form content
- response hierarchy
- accepted answer state

Use spacing and rules to separate responses.

Do not place every response inside a floating card.

---

# Awards / Hall of Fame

Treat these pages as an archive or exhibition catalogue.

Use:

- year
- index number
- award hierarchy
- competition
- participant
- certificate/document
- associated article/project

Allow larger imagery and stronger art direction than ordinary application
pages.

---

# Admin

Admin UI follows the same design DNA but a different priority order.

Priority:

1. information density
2. scan speed
3. operational clarity
4. state visibility
5. keyboard efficiency
6. visual consistency

Admin must not imitate an award website.

Reduce:

- decorative motion
- oversized display type
- experimental navigation
- image-heavy layouts

Retain:

- typography
- cool palette
- precise grid
- thin rules
- restrained radius
- consistent metadata
- strong tables

---

# Forms

Forms are working instruments.

Use:

- clear labels
- persistent field descriptions where needed
- visible required state
- grouped sections
- meaningful progress
- explicit validation

Avoid:

- decorative card nesting
- floating labels for complex forms
- excessive animations
- hidden field meaning
- ultra-light low-contrast text

Long forms should feel like structured institutional documents.

---

# Data Visualization

Charts should inherit the editorial system.

Prefer:

- clear axes
- labels
- restrained palette
- direct annotation
- visible units
- tabular companion values where important

Avoid dashboard decoration:

- rainbow palettes
- unnecessary gradients
- glowing lines
- fake 3D charts

---

# Responsive Design

Do not merely stack desktop cards vertically.

When moving to mobile:

- collapse auxiliary metadata rails
- preserve title hierarchy
- keep section numbers
- reduce display scale
- convert multi-column data into structured rows
- preserve rules where useful
- prioritize forms and operational actions

Experimental compositions must degrade into a conventional readable flow.

---

# Accessibility

Art direction never overrides:

- semantic headings
- keyboard navigation
- contrast
- focus visibility
- reduced motion
- readable body measure
- minimum touch targets
- form labels

The more experimental the public page, the stricter accessibility checking
should become.

---

# Implementation Discipline

Before creating a new visual component:

1. determine whether it is a layout pattern, domain pattern, or primitive
2. inspect existing components
3. avoid introducing a second visual system
4. expose reusable tokens rather than one-off values
5. keep page-specific art direction outside generic primitives

Do not turn `Card`, `Badge`, and `Button` into universal solutions.

---

# Design Review

For every redesigned screen, review in this order.

## 1. Content

Can the user immediately identify the main information and action?

## 2. Hierarchy

Does hierarchy still work in grayscale?

## 3. Grid

Can the major alignments be explained?

## 4. Typography

Is typography doing enough work before containers are added?

## 5. AI smell

Search for:

- card repetition
- gratuitous radius
- generic icon tiles
- generic gradients
- badge pollution
- symmetric landing-page structure
- meaningless animation

Remove them.

## 6. Identity

What element could only belong to this institution?

If the answer is "the logo", the design is not finished.

## 7. Function

Can a real student or administrator complete the task efficiently?

Art direction must never obstruct the task.

---

# Final Quality Bar

A successful result should not make a reviewer say:

> This is a nice shadcn/Next.js site.

It should make them say:

> This institution has a coherent visual culture.

The final design should feel:

cold but not sterile
academic but not old-fashioned
precise but not mechanical
young but not playful
experimental but not theatrical
distinctive but still usable
```

我认为这个 skill 已经比“给网站规定一套蓝色 + 小圆角”强很多，因为它首先约束**设计推理顺序**，然后才约束视觉结果。

下一步如果继续做，我不会立刻改 UI。我建议再做一轮专门的 **anti-pattern audit**：直接拿你当前仓库的公开端 10–15 个核心页面，对照这个 skill，把每一个“AI 味来源”定位到具体组件和代码，例如哪些是 `Card Everything`、哪些是 Badge 污染、哪些是模板 Hero、哪些是无意义 Framer Motion。这样之后才适合形成真正的重构 Issue。

[1]: https://winners.webbyawards.com/winners/websites-and-mobile-sites/general-desktop-mobile-sites/schooluniversity?utm_source=chatgpt.com "General Desktop & Mobile Sites — School/University | 2026 Webby Awards Winners"
[2]: https://www.cssdesignawards.com/sites/design-education-series/45851/?utm_source=chatgpt.com "Design Education Series® - CSS Design Awards"
[3]: https://www.pentagram.com/work/mit-media-lab?utm_source=chatgpt.com "MIT Media Lab"
[4]: https://spectrum.ieee.org/ieee-spectrum-reimagined?utm_source=chatgpt.com "IEEE Spectrum, Reimagined - IEEE Spectrum"
[5]: https://www.averyreview.com/?utm_source=chatgpt.com "The Avery Review | home"
[6]: https://www.cssdesignawards.com/sites/axiom-research/49571/?utm_source=chatgpt.com "Axiom Research - CSS Design Awards"
[7]: https://winners.webbyawards.com/winners/websites-and-mobile-sites/features-design/best-visual-design-function?utm_source=chatgpt.com "Features & Design — Best Visual Design - Function | 2026 Webby Awards Winners"
