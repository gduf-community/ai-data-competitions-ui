> 归属整理：2026-10-16。原稿来自 API `docs/archive/plans/sql查询台前端设计.md`（`d9a789baed9f45ce033f97da5c627eb4cbcc8dee`）；[原始版本](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/archive/plans/sql查询台前端设计.md)。本次保留研究正文、原日期、示例和阶段语义，仅调整归属及导航。原稿中的“本仓/当前/已完成”指原记录时点；不能据此推断今天的实现或验收。

现行行为见[页面与流程](./../../页面结构与用户流程.md)、[HTTP 接口参考](./../../HTTP接口参考.md)和[测试与验收](./../../测试与验收.md)；设计与调研入口见[专题索引](./../../设计与调研.md)。SQL 查询台已删除，旧 Server Actions、Mock、全量前端搜索和发布步骤均不可直接作为现行实现依据。

---

> 历史归档：2026-10-04 整理。本文保留早期方案/记录，不作为当前实现或上线结论。现行说明见[替代文档](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/modules/SQL查询台.md)；返回[归档目录](./../README.md)。



页面从上到下分三块：

补充安全约束：

- 前端不得看到真实数据库表名、真实字段名、真实视图名。
- `/api/admin/analytics/schema` 只下发伪映射后的“视图编号 / 字段编号”。
- `/api/admin/analytics/sql/validate` 与 `/api/admin/analytics/sql/run` 只接受伪映射编号，服务端内部再翻译到真实白名单结构。
- SQL Preview、查询错误提示、结果列 key、导出前的列标识也不得回显真实库结构。

```text
┌──────────────────────────────────────────────┐
│ 数据查询台 / Analytics SQL Console            │
│ 说明：仅支持白名单视图与字段，默认只读查询      │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ① 视图 / 字段编号查询组件                     │
│ 搜索视图编号、字段编号、中文含义、业务域、权限标记 │
│ 左侧表列表 + 右侧字段详情 + 一键加入 SQL       │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ② 自由 SQL 编辑组件                           │
│ SELECT / FROM / JOIN / WHERE / GROUP BY /     │
│ ORDER BY / LIMIT 固定格式填空                 │
│ 自动生成 SQL Preview，可校验、执行、重置        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ ③ 查询结果可视化表组件                         │
│ 表格展示 / 分页 / 排序 / 列显隐 / 导出 CSV/XLSX│
└──────────────────────────────────────────────┘
```

第一块：表 / 字段名查询组件。

这个组件的目标不是让业务人员看完整数据库结构，而是让管理员快速找到“能查什么”。建议命名为 `SchemaExplorer`。

顶部放一个全局搜索框：

```text
搜索表名 / 字段名 / 中文含义
例如：比赛、报名状态、created_at、用户ID
```

搜索结果按业务域分组：

```text
比赛数据
- competition              比赛表
- competition_notice       比赛通知表
- competition_faq          比赛 FAQ 表

报名数据
- registration             报名记录表
- registration_team_member 队伍成员表

问答数据
- question                 问题表
- answer                   回答表

安全与访问数据
- access_log               访问日志表
- security_events          安全事件表
```

每张表旁边显示权限标签：

```text
[可查询] [仅脱敏] [仅聚合] [受限] [禁止]
```

点开某张表后，右侧展示字段列表：

```text
表：registration 报名记录表

字段名                  中文含义        类型        查询权限        操作
id                      报名ID          uuid       可查询          加入 SELECT
registration_no          报名编号        varchar    可查询          加入 SELECT
competition_id           比赛ID          uuid       可查询          加入 WHERE
applicant_user_id        申请人ID        uuid       仅关联          加入 WHERE
payload_json             报名数据        jsonb      受限            -
applicant_snapshot_json  申请人快照      jsonb      禁止            -
status                   报名状态        enum       可查询          加入 GROUP BY
submitted_at             提交时间        time       可查询          加入 ORDER BY
```

字段操作建议做成四个轻按钮：

```text
+ SELECT
+ WHERE
+ GROUP BY
+ ORDER BY
```

这样字段发现组件可以直接驱动 SQL 编辑组件，不需要用户手敲字段名。

字段权限颜色建议：

```text
可查询：绿色标签
脱敏查询：蓝色标签
仅聚合：橙色标签
受限：灰色标签
禁止：红色标签，但默认不展示，只有“显示受限字段”开关打开后才显示
```

我建议默认隐藏禁止字段，只在 super_admin 开启“显示完整映射”时显示。否则业务人员看到一堆不能用的字段，会产生表结构暴露问题。

第二块：自由 SQL 编辑组件。

这里不要做真正的 Monaco 全自由编辑器。第一版应该做“结构化 SQL 填空器”，底部生成 SQL 预览。建议命名为 `StructuredSqlEditor`。

布局如下：

```text
查询编辑器

SELECT
[ 选择字段 / 输入表达式，例如 count(*) as total ]

FROM
[ 选择数据表 / 查询视图 ]

JOIN，可留空
[ 选择关联表 ] [ ON 条件 ]

WHERE，可留空
[ 字段 ] [ 运算符 ] [ 值 ]  + 添加条件

GROUP BY，可留空
[ 选择分组字段 ]

HAVING，可留空
[ 聚合条件 ]

ORDER BY，可留空
[ 字段 ] [ ASC / DESC ]

LIMIT
[ 默认 100，最大 1000 ]

SQL Preview
------------------------------------------------
SELECT competition_id, status, count(*) as total
FROM registration
WHERE submitted_at >= '2026-01-01'
GROUP BY competition_id, status
ORDER BY total DESC
LIMIT 100;
------------------------------------------------

[校验 SQL] [执行查询] [重置]
```

关键规则是：页面允许留空，但执行时必须满足最低条件。

```text
FROM 必填。
SELECT 可空：为空时默认选择该表的安全展示字段，不允许直接 SELECT *。
WHERE 可空。
JOIN 可空。
GROUP BY 可空。
HAVING 可空。
ORDER BY 可空。
LIMIT 默认 100，最大 1000。
```

这里有一个重要产品判断：不要让用户输入完整 SQL，而是让用户在固定槽位里填内容。这样仍然保留“自由 SQL”的感觉，但前端可以提前做白名单校验，后端也更容易解析。

SELECT 区域可以支持两种模式：

```text
字段模式：
- competition.title
- competition.status
- registration.submitted_at

表达式模式：
- count(*) as total
- date_trunc('day', submitted_at) as day
- count(distinct applicant_user_id) as user_count
```

表达式模式只允许白名单函数：

```text
count
count distinct
sum
avg
min
max
date_trunc
case when，第一版可以暂不开放
```

WHERE 条件建议不要让用户写文本，而是做条件构造器：

```text
字段：registration.status
运算符：= / != / in / not in / like / >= / <= / between / is null / is not null
值：submitted

逻辑关系：AND / OR
```

这样可以避免最常见的注入风险，也能降低 SQL 报错率。

第三块：查询结果可视化表组件。

建议命名为 `QueryResultTable`。第一版重点做“表格 + 导出”，图表可以作为后续增强，不要一开始做复杂 BI。

查询执行后展示：

```text
查询结果

返回 100 行，用时 238ms
结果已按 LIMIT 100 截断

[导出 CSV] [导出 XLSX] [复制结果] [复制 SQL]

┌──────────────┬──────────────┬────────┬──────────────┐
│ competition  │ status       │ total  │ submitted_at │
├──────────────┼──────────────┼────────┼──────────────┤
│ 数学建模竞赛 │ submitted    │ 128    │ 2026-06-01   │
│ 数学建模竞赛 │ approved     │ 96     │ 2026-06-02   │
└──────────────┴──────────────┴────────┴──────────────┘
```

表格功能建议：

```text
分页：前端分页 + 后端 LIMIT
排序：只允许对结果列排序
列显隐：允许隐藏某些列
列类型识别：text / number / date / boolean / json
空值显示：统一显示为 —
长文本：默认截断，点击展开
json：默认折叠，点击查看格式化内容
```

导出功能建议分两级：

```text
第一版：只导出当前查询结果，即当前返回的 rows。
第二版：支持后台导出任务，但需要权限、审计、行数限制。
```

导出按钮旁边应该显示限制：

```text
当前最多导出 1000 行。
导出内容与当前查询结果一致。
```

前端组件结构可以这样拆：

```tsx
AnalyticsSqlConsolePage
├── PageHeader
├── SchemaExplorer
│   ├── SchemaSearchInput
│   ├── TableCategoryTabs
│   ├── TableList
│   └── FieldList
├── StructuredSqlEditor
│   ├── SelectBuilder
│   ├── FromBuilder
│   ├── JoinBuilder
│   ├── WhereBuilder
│   ├── GroupByBuilder
│   ├── HavingBuilder
│   ├── OrderByBuilder
│   ├── LimitInput
│   └── SqlPreview
├── QueryToolbar
│   ├── ValidateButton
│   ├── ExecuteButton
│   └── ResetButton
└── QueryResultTable
    ├── ResultSummary
    ├── DataGrid
    ├── ColumnVisibilityPanel
    └── ExportButtons
```

状态设计：

```ts
type QueryFieldPermission =
  | "queryable"
  | "masked"
  | "aggregate_only"
  | "join_only"
  | "restricted"
  | "forbidden";

type SchemaField = {
  tableName: string;
  fieldName: string;
  type: string;
  label: string;
  description?: string;
  permission: QueryFieldPermission;
  allowedIn: Array<"select" | "where" | "groupBy" | "orderBy" | "join">;
};

type SqlBuilderState = {
  select: string[];
  from: string | null;
  joins: Array<{
    table: string;
    on: string;
    type: "left" | "inner";
  }>;
  where: Array<{
    field: string;
    operator: string;
    value: string | number | boolean | null;
    logic: "AND" | "OR";
  }>;
  groupBy: string[];
  having: string[];
  orderBy: Array<{
    field: string;
    direction: "asc" | "desc";
  }>;
  limit: number;
};

type QueryResult = {
  columns: Array<{
    key: string;
    label: string;
    type: "string" | "number" | "date" | "boolean" | "json" | "unknown";
  }>;
  rows: Record<string, unknown>[];
  rowCount: number;
  elapsedMs: number;
  truncated: boolean;
};
```

接口建议：

```text
GET /api/admin/analytics/schema
获取可查询表和字段白名单。

POST /api/admin/analytics/sql/validate
校验结构化 SQL 是否合规，不执行查询。

POST /api/admin/analytics/sql/run
执行查询，只允许 SELECT 查询。

POST /api/admin/analytics/sql/export
导出当前查询结果。
```

请求体不建议直接传纯 SQL，建议传结构化对象：

```json
{
  "select": ["competition.title", "registration.status", "count(*) as total"],
  "from": "registration",
  "joins": [],
  "where": [
    {
      "field": "registration.submitted_at",
      "operator": ">=",
      "value": "2026-01-01",
      "logic": "AND"
    }
  ],
  "groupBy": ["competition.title", "registration.status"],
  "orderBy": [
    {
      "field": "total",
      "direction": "desc"
    }
  ],
  "limit": 100
}
```

后端可以返回生成后的 SQL，前端只负责展示：

```json
{
  "valid": true,
  "sql": "SELECT competition.title, registration.status, count(*) as total FROM registration ... LIMIT 100",
  "warnings": [
    "结果限制为 100 行",
    "字段 applicant_user_id 仅用于关联，不会原样展示"
  ]
}
```

页面交互流程：

```text
1. 用户进入页面。
2. 前端请求 schema 白名单。
3. 用户搜索“报名”。
4. 点击 registration 表。
5. 选择 status、submitted_at、competition_id 等字段。
6. 字段自动进入 SELECT / WHERE / GROUP BY。
7. 用户填写 WHERE 条件。
8. 前端生成 SQL Preview。
9. 点击“校验 SQL”。
10. 校验通过后点击“执行查询”。
11. 下方表格展示结果。
12. 用户导出 CSV / XLSX。
```

空状态设计：

```text
字段查询区空状态：
“搜索表名、字段名或中文含义，查看可查询字段。”

SQL 编辑区空状态：
“请至少选择 FROM 表。SELECT 可留空，系统将使用默认安全字段。”

结果区空状态：
“查询执行后，结果将在这里展示。”

错误状态：
“SQL 校验失败：字段 applicant_snapshot_json 不允许查询。”
“查询超时：请缩小时间范围或增加 WHERE 条件。”
“返回行数超过限制：请添加 LIMIT 或筛选条件。”
```

安全提示应该直接放在 SQL 编辑器上方：

```text
安全规则：
- 仅支持 SELECT 查询。
- 不允许 SELECT *。
- 不允许访问非白名单表和字段。
- 不允许 INSERT / UPDATE / DELETE / DROP / ALTER。
- 查询结果默认限制 100 行，最大 1000 行。
- 所有查询会记录操作人、SQL、执行时间和导出行为。
```

我建议第一版视觉上走后台工具风，不要太重设计。布局可以用三段式卡片：

```text
背景：#f6f8fb
卡片：白色
边框：#e5e7eb
主色：蓝灰 / 深蓝
危险标签：红色
权限标签：低饱和色
表格：紧凑型 DataGrid
```

核心开发优先级：

```text
P0：
- SchemaExplorer 字段搜索
- StructuredSqlEditor 固定槽位
- SQL Preview
- 校验 / 执行
- 结果表
- CSV 导出

P1：
- XLSX 导出
- 查询历史
- 保存常用查询
- 字段收藏
- 列显隐
- 简单聚合函数

P2：
- 自动生成图表
- 后台大文件导出
- 查询模板市场
- 自然语言转查询
```
