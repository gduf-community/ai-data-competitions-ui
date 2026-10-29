# 学院竞赛管理与问答平台 Web

本仓库是平台唯一完整 Web：公开门户、认证、报名、问答、个人工作台、管理台与社团工作台，以及组件、SSR、同源 BFF 和前端测试。可信业务由[独立 API 仓库](https://github.com/gduf-community/competition-Q-A-website)维护，需要私有仓库权限。

浏览器 → Web 页面/BFF → API → PostgreSQL / Object Storage。公开业务 JSON 由服务端读取；授权、事务与存储管理由 API 执行。

源码核对：2026-10-15；Web `0b0d594952897ea1d90c39b7afb5b7430571f078`，API `d9a789baed9f45ce033f97da5c627eb4cbcc8dee`。浏览器、CI 和部署证据保留各自日期。

## 本地启动

固定 Node.js **22.23.3**、pnpm **10.34.5**；当前 Next.js/eslint-config-next **16.3.8**、React/react-dom **19.2.3**，以 [package.json](./package.json) 与唯一 [pnpm-lock.yaml](./pnpm-lock.yaml) 为准。

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

PowerShell 使用 `Copy-Item .env.example .env.local`。Web 默认 `http://localhost:3000`，API 在自己的仓库独立启动，默认 `http://127.0.0.1:3001`。两端必须在运行时配置相同 `API_SERVICE_TOKEN`（32 随机字节、64 位小写 hex）；示例配置的空值不能直接完成联调。

默认 `WEB_RELEASE_MODE=public` 提供 SSR 公开页面及显式素材/跳转 BFF，仍依赖可用 API。认证、报名、本人和后台流程需受控 `trusted` 配置与隔离合成数据，启动顺序、变量和排错见[开发环境与 HTTP 边界](./docs/开发环境与HTTP边界.md)。

## 开发时从这里查

| 需要做什么 | 文档 |
| --- | --- |
| 了解现有功能和待交付范围 | [功能介绍](./docs/功能介绍.md) |
| 找页面、布局、旧入口与流程 | [页面结构与用户流程](./docs/页面结构与用户流程.md) |
| 查接口方法、参数、返回、权限与错误 | [HTTP 接口参考](./docs/HTTP接口参考.md) |
| 修改查询、URL、分页和正则 | [搜索协议](./docs/搜索协议.md) |
| 找实现、组件和 DTO | [代码组织与组件约定](./docs/代码组织与组件约定.md) |
| 选择验证命令与联调范围 | [测试与验收](./docs/测试与验收.md) |
| 查看自动检查、产物与发布边界 | [CI 与构建](./docs/CI与构建.md) |

[荣誉展示图片加载与分页计划](./docs/荣誉展示图片加载与分页计划.md)：P0 分层分页与图片预算、P1 缓存协商、P2 缩略图及实测验收，当前为待实现目标。

[文档总入口](./docs/README.md)还包含视觉、浏览器兼容、协作和历史材料。[设计与调研](./docs/设计与调研.md)收录完整 UI 案例研究、搜索/组件研究、首页与模板方案，以及从 API 迁回的社团文案和原始意见稿。

[竞赛数据分析页面重建计划](./docs/竞赛数据分析页面重建计划.md)记录待实现的单赛四标签、指标消费、授权下钻与分阶段比较/关联页面。

## 检查与构建

```bash
pnpm check:framework
pnpm run ci
```

`ci` 依次执行 lint/Web 边界、typegen/typecheck、前端/传输/产物测试和生产构建；`check:framework` 是独立命令，由远程 CI 在 ci 前执行。也可单独运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。`pnpm start` 启动已有构建，不启动 API、不执行数据库迁移。

[Web CI](./.github/workflows/ci.yml) 对 push/PR 自动运行，也可手动检查；API CI 保持手动。两仓停止 GitHub CD；构建/上传 artifact 与平台部署分别核验，见[CI 说明](./docs/CI与构建.md)。

## 业务与协作边界

- 比赛和问答使用 SSR 服务端搜索/分页，默认每页 20、最多 50；URL 恢复查询/筛选/页码。Regex 默认关闭，要求两端开关与 API 能力一致。
- 社团使用统一后台、有效授权、真实封面、直接发布及已发布内容编辑；revision 冲突保留输入，旧审核写入口退役。真实存储、真机输入与存量切换仍按任务验收。
- 当前荣誉为奖状长廊与单张详情；年度 A/B/C 属于后续计划。经验文章、名人堂走受邀流程。
- SQL 查询台已删除，固定分析保留；安全动作目前只有 IP 放行/回滚具备实际执行器。

[Project #2](https://github.com/orgs/gduf-community/projects/2)统一管理 [Web Issue](https://github.com/gduf-community/ai-data-competitions-ui/issues) 与 [API Issue](https://github.com/gduf-community/competition-Q-A-website/issues)。跨仓保留一个主任务，两侧分别交付 PR 并绑定精确 companion SHA，见[协作指南](./docs/开源协作指南.md)。

Web 仅持有运行时服务凭据，不配置数据库、认证签名或对象存储管理密钥。示例和验证使用合成数据；旧 Mock 反向同步已退役。历史材料保留在[归档](./docs/archive/README.md)。

实际 ECS 部署身份、配置与更新边界见 [ECS 部署记录](./docs/阿里云ECS部署.md)。

安全变更须通过 [CI 安全继承与扫描门禁](./docs/CI与构建.md)：入口/传递 helper 变化附当前控制与负向测试证据，完整依赖审计、Gitleaks、CodeQL 和质量检查共同汇总为 CI 检查。
