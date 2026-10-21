# Web CI 与构建

2026-10-21 新增[阿里云迁移候选方案](阿里云ECS部署.md)：离线构建及独立 ECS 模板，未部署；原平台运行事实不变。

源码核对：2026-10-15，Web `0b0d594952897ea1d90c39b7afb5b7430571f078`。工作流事实源为 [ci.yml](../.github/workflows/ci.yml)、命令为 [package.json](../package.json)，产物规则为 [package-runtime](../scripts/package-runtime.mjs)。本文描述现行配置，未将历史绿色 run 当作本次重新执行。

## 触发与实际顺序

Web 对所有分支 push 和所有 PR 自动检查，也支持无发布参数的 workflow_dispatch；权限仅 contents:read，checkout 不持久化凭据。同 ref 运行分组，cancel-in-progress=false。现有 job 在 ubuntu-24.04、超时 15 分钟，使用 public 模式和合成服务凭据，不注入真实 API/身份/生产密钥。

| 顺序 | 工作流执行 | 作用 |
| --- | --- | --- |
| 1 | 安装 pnpm 10.34.5，Node 读取 `.node-version`（22.23.3） | 固定工具链 |
| 2 | `pnpm install --frozen-lockfile`，再 `git diff --exit-code -- package.json pnpm-lock.yaml` | 安装不能改写依赖基线 |
| 3 | `pnpm run check:framework` | 核对实际 Next/ESLint、React/DOM 与类型版本 |
| 4 | `pnpm run ci` | lint → typecheck → test → build |
| 5 | `node scripts/package-runtime.mjs web` | 打包、校验并解包启动探针 |
| 6 | upload-artifact | 上传 runtime 与 manifest，保留 14 天 |

`check:framework` 未包含在 package.json 的 ci 串中，工作流单独执行；本地想复现同一顺序也须显式调用。

## 质量、边界与构建

`lint` = ESLint + `node scripts/check-web-boundaries.mjs`；`typecheck` = `next typegen` + `tsc --noEmit --incremental false`；`test` 执行 tests 下现有 ts/mjs 文件；`build` 为 Next standalone。前端、表单、搜索、HTTP/CSRF、BFF 与 runtime 测试的适用范围见[测试与验收](./测试与验收.md)。

边界脚本检查源码/SSR、别名、模块依赖和根配置/脚本，拒绝后端目录/管理依赖、SQL 查询台恢复与服务传输/凭据进入 client graph；产物再检查浏览器 JS。它不代替 API 的授权/数据库/HTTP 或浏览器验收。Node/Next 的固定版本见[环境说明](./开发环境与HTTP边界.md)。

## runtime 产物

输出为 `build/release/runtime.tar.gz`、`build/release/runtime-manifest.json`，artifact 名为 `web-runtime-<精确 SHA>`。manifest 包括版本、unit、repository、sha、可选 companionSha、lockSha256、payloadSha256、server、Node 版本、platform 和 arch。

脚本要求当前 HEAD 等于指定源码 SHA，跟踪文件无差异；检查环境文件、外部依赖链接与浏览器后端配置/凭据名，保留打包所需 pnpm 相对链接。它使用锁定的 tar 开发依赖，不依赖 Next 私有 compiled/tar。

解包探针在独立临时目录启动 standalone：Web `/sign-in` 返回 public 阻断 503，私有 POST `/api/me/session` 返回 404。该探针验证脱离源码目录的基本运行/边界，不验证页面完整业务、真实身份、生产网络或 S3。

Actions 的 artifact ID/digest 与 manifest 的 payload/lock 摘要分别记录；不同平台/架构产物不能因 SHA 相同就混用。当前 Web CI 未设置 companion 输入，manifest 的 companionSha 可为 null；跨仓联调仍需在任务/PR 记录精确 API SHA，不能从空 companion 自动推断版本匹配。

本地打包需要正确的 GITHUB_SHA/GITHUB_REPOSITORY 及已完成构建，且跟踪文件干净；正在编辑文档的工作区不适合拿打包成功代表新提交产物。日常业务开发先执行适用质量检查。

## API 配对与发布

API CI 保持手动 workflow_dispatch，其模块、PostgreSQL 和固定 companion Web HTTP 检查由 API 仓库维护。Web CI 不启动完整 API 数据库测试；两仓结果分别陈述，手动 API run 与 PR Checks 列表也不是同一事实。

两仓均停止 GitHub CD：当前 Web workflow 无 deploy 输入、promote job、production ref 更新、迁移或平台部署步骤。上传 artifact 不发布服务，也不修改 Zeabur 自身自动部署设置。实际切换/回部署由维护者在平台完成，并记录精确版本、环境、入口/网络/存储与独立回滚结果。

代码回退按目标仓库的 revert PR 和对应验证处理，Web 回退不改 API 数据库/对象。旧晋级设计见[归档](./archive/README.md)，不能当作现行操作步骤。

返回[文档入口](./README.md)。
