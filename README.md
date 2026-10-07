# 学院竞赛管理与问答平台 Web

平台唯一完整 Web，维护公开门户、认证、报名、个人工作台、问答、管理台、社团工作台，以及组件、SSR、同源 BFF 和前端测试。可信后端由 [API 仓库](https://github.com/gduf-community/competition-Q-A-website) 维护。

浏览器 → Web → API → PostgreSQL / Object Storage。Web 通过 HTTP 获取身份、能力和业务数据，菜单与按钮不授予权限。

## 本地开发

使用 Node.js **22.23.3**、pnpm **10.34.5** 和唯一 [pnpm-lock.yaml](./pnpm-lock.yaml)：

```bash
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

PowerShell 可用 `Copy-Item .env.example .env.local`。API 单独在其仓库运行，默认地址 `http://127.0.0.1:3001`；Web 默认 `http://localhost:3000`。仅启动 Web 时不能完成依赖 API 的数据读取。

默认 `WEB_RELEASE_MODE=public` 只提供公开读取，不转发身份 Cookie、不接受业务写入；登录、报名、本人及管理页面会被阻断。完整本地联调使用隔离合成数据，并按[环境与 HTTP 边界](./docs/开发环境与HTTP边界.md)配置 `trusted` 模式。

## 检查与构建

```bash
pnpm run ci
```

依次执行 lint 与 Web 边界检查、typecheck、前端/传输/产物回归、生产构建。也可分别运行 `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`。`pnpm start` 启动构建后的 Web，不执行数据库迁移。

[Web CI](./.github/workflows/ci.yml) 默认对所有分支 push 和 PR 自动运行，并保留手动检查。只读检查使用 public 模式和合成数据，上传 runtime/manifest 供核验；**没有 CD、deploy 输入或 production 分支晋级**。API CI 保持手动触发，见[CI 说明](./docs/CI与构建.md)。

## 文档与任务

- [文档总入口](./docs/README.md)：功能、页面流程、代码/组件、环境、兼容与 CI。
- [开源协作指南](./docs/开源协作指南.md)：PR、脱敏数据、分仓和跨仓交付约定。
- [Project #2](https://github.com/orgs/gduf-community/projects/2)：同时管理 Web 与 API，实施范围为 `Web`、`API`、`Web/API`。
- [Web issues](https://github.com/gduf-community/ai-data-competitions-ui/issues) / [API issues](https://github.com/gduf-community/competition-Q-A-website/issues)：按主导交付方归属，跨仓任务保留一个主任务，两侧 PR 分别关联。

API 仓库需访问权限。数据库、认证签名、授权、事务和存储管理在 API；Web 不配置后端管理密钥。旧 Mock 反向同步已退役。

源码能力、本地测试、浏览器、远程 CI 和生产部署分别记录；部署平台配置与独立回滚仍需单独核验。历史迁移记录见[归档](./docs/archive/README.md)。
