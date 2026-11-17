# Web CI 与构建

2026-10-21 ECS部署与事故恢复的历史版本、资源记录和更新边界见[部署记录](阿里云ECS部署.md)；当前线上版本需独立核验。

概览核对：2026-11-18，API main `46933d828c3a58fbd12b2712e6ad5a60fde2452d`、Web main `099da0af7082808bc3b80604844ea27cd30f5ade`。本文同步源码与任务入口；历史测试、远程 CI、浏览器和生产记录保留各自日期与版本。工作流事实源为 [ci.yml](../.github/workflows/ci.yml)、命令为 [package.json](../package.json)，产物规则为 [package-runtime](../scripts/package-runtime.mjs)。本文描述现行配置，未将历史绿色 run 当作本次重新执行。

## 触发与实际顺序

Web 对所有分支 push 和所有 PR 自动检查，也支持无发布参数的 workflow_dispatch；默认权限 contents:read（CodeQL 作业单独 security-events:write），checkout 不持久化凭据。同 ref 运行分组，cancel-in-progress=false。质量/构建 job 在 ubuntu-24.04、超时 15 分钟，使用 public 模式和合成服务凭据，不注入真实 API/身份/生产密钥。

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

Actions 的 artifact ID/digest 与 manifest 的 payload/lock 摘要分别记录；不同平台/架构产物不能因 SHA 相同就混用。Web CI 的手动输入 companion_api_sha 可固定配套版本；自动事件 manifest 的 companionSha 可为 null；跨仓联调仍需在任务/PR 记录精确 API SHA，不能从空 companion 自动推断版本匹配。

本地打包需要正确的 GITHUB_SHA/GITHUB_REPOSITORY 及已完成构建，且跟踪文件干净；正在编辑文档的工作区不适合拿打包成功代表新提交产物。日常业务开发先执行适用质量检查。

## API 配对与发布

API CI 响应获批准的pull_request_review或手动workflow_dispatch，核对review与当前live PR的精确head/base；不因普通PR/main push自动运行。模块、PostgreSQL和固定companion Web HTTP由API仓维护；当前固定companion见API工作流，不代表每个Web PR已与最新API配对。Web CI 不启动完整 API 数据库测试；两仓结果分别陈述，手动 API run 与 PR Checks 列表也不是同一事实。

两仓均停止 GitHub CD：当前 Web workflow 无 deploy 输入、promote job、production ref 更新、迁移或平台部署步骤。上传 artifact 不发布服务，也不修改 Zeabur 自身自动部署设置。实际切换/回部署由维护者在平台完成，并记录精确版本、环境、入口/网络/存储与独立回滚结果。

代码回退按目标仓库的 revert PR 和对应验证处理，Web 回退不改 API 数据库/对象。旧晋级设计见[归档](./archive/README.md)，不能当作现行操作步骤。


## 安全继承与扫描门禁（API #162 第二阶段）

`security` 作业在完整历史的候选 PR head 上，以事件中的真实 base SHA 检查新增/受影响入口；普通构建与 CodeQL 检查 GitHub 的 PR 合并候选。无生产密钥、真实用户数据或部署权限；checkout 不保留凭据，不使用 `pull_request_target`、自托管 runner 或 PR 共享缓存。CodeQL 单独作业仅增加 `security-events:write`，本地 SARIF 门禁覆盖无上传权限的 fork。所有 Actions 固定提交；Gitleaks 固定 8.30.1 和下载 SHA256，并用临时合成 token 证明扫描器会拒绝泄露，输出始终脱敏。

`scripts/check-security.mjs` 追踪 Route Handler、proxy、BFF、上传下载/导入导出及可执行脚本的源码依赖闭包；新增 Server Action 违反现有分仓边界，直接拒绝。既有入口只保留精确摘要基线，**不代表已证明全部旧代码安全**。入口或传递 helper 变化后，在 `.github/security-policy.json` 更新对应 `reviews`：当前闭包摘要、每个 HTTP method 的认证、功能/对象/字段授权、当前权限、Origin/CSRF、限流、Schema、正文/响应上界、缓存、敏感数据、审计、状态机依据，以及实际负向测试的文件和标题。不适用项须写 `not-applicable: ` 和具体理由；首次基线来自真实 base 源码，后续使用 base policy，PR 自改 baseline 不能跳过门禁。

Web 传输层的 `permittedBrowserRequest` 只有在 handler 顶层明确 `if (!predicate(...))` 后无条件返回 4xx 或抛错时才获得 Origin 信用；忽略返回、反向/组合/嵌套条件与符号遮蔽不授信，未知形态需重新核对。`privateNoStoreHeaders` 仅登记私有响应缓存能力；二者不能证明身份、业务授权或当前权限。BFF/proxy 的精确 review 逐项说明 API 职责与 Web 职责，并关联实际入口的拒绝、缓存和 Cookie 回归。公开素材仍沿用 API 的缓存策略，成功页面 handoff 不新增私有缓存头；官方获奖路径和名人堂待审照片预览强制私有 no-store，传输回归同时检查上游误给 public 缓存头时仍不能覆盖该保护。合并后的同一入口只保留一份当前 review，并保留各功能的负向测试关联；没有更新历史 baseline 或漏洞例外来绕过变更检查。

静态 AST 识别导入别名、barrel 和公共包装函数委托，包括 `withApiGuard`、`officialAwardRequest`、`clubContentCommand`。普通 Route、函数和包装器只有可达性，不自动拥有任何控制能力；证明必须指向 `mechanismControls` 中显式登记的具体机制，且只获得对应控制（例如 scope 断言只获得 authorization）。`withApiGuard` 单独按调用选项判定，只有明确 `auth:true` 才算认证，当前权限同时要求认证和 requireCurrentAuthorization；spread/计算属性、禁用的 Origin 分支及相互冲突的调用不获得保障。未知机制按失败处理，需审查具体实现后登记，不按函数名称或前缀猜测。该检查确认机制引用，仍不证明所有分支的完整业务语义或参数作用域。静态引用与测试标题只能建立可复核的证据关联，不能证明完整业务语义；业务授权必须由实际负向测试和独立维护者 Review 共同核对，不以 PR 模板填表代替测试。修改公共 helper 可能影响多个入口，应逐项复核，不能批量补不适用绕过。

本地复现：先冻结安装，再运行 `SECURITY_BASE_SHA=<完整基线SHA> pnpm security:check`（PowerShell 使用 `$env:SECURITY_BASE_SHA`）；`node scripts/check-security.mjs snapshot` 输出当前入口摘要。`pnpm audit --json > build/security/audit.json` 后运行 `pnpm security:audit`；CodeQL `security-extended` 输出目录交给 `pnpm security:sast`。依赖扫描覆盖生产和开发依赖；moderate/high/critical、CodeQL 高危或 error、分析失败/缺失、密钥发现均失败。依赖例外绑定 GHSA/包/精确版本，SAST 例外绑定 finding fingerprint，均须原因和不超过 91 天的到期日并经 Review；初始无例外。Gitleaks 扫描 base..head 的提交范围，手动同 SHA 扫描最新提交；既有历史另由 GitHub 原生 Secret Scanning 覆盖，不能从增量通过推断历史无泄露。

Dependabot 每周检查 npm/pnpm 和 Actions，框架与认证依赖分别分组。2026-10-31门禁阶段曾将Next/ESLint升至16.4.1、Auth.js beta.32、Zod 4.6.6和sanitize-html 2.18.x；当前Web Next/ESLint为16.4.6、React/DOM为19.3.1、Zod为4.6.7，以package.json及冻结锁为准。API 另升级 Drizzle/Sharp，SheetJS 使用官方 0.20.3 tarball（锁文件固定 integrity），并限定旧版工具传递依赖的安全修复版本。该环境变化影响开发、CI 和今后构建的运行产物；**本次不改变现有生产实例**。

工作流汇总检查要求质量、构建/运行、安全继承/依赖/密钥与 SAST 全部成功；失败、取消、跳过均失败。按用户本轮范围，**不配置分支保护、Required Checks、CODEOWNERS 或独立受信任工作流**；这些仍是可由 PR 修改的自动检查，不宣称已建立不可绕过的合并门禁。测试文件/标题关联也仍是静态索引，本轮未加入测试实际执行及覆盖入口的动态证明。

Web 的 `regressionMatrix` 绑定匿名、Origin、public/trusted、上传下载和敏感数据边界测试；API 的撤权、对象/字段、scope、状态机和并发以 API 配对 HTTP/DB 作业为准。稳定的 `Web quality and runtime artifact` 名称现在用于汇总；`Web build and tests` 执行原质量/构建产物流程。

返回[文档入口](./README.md)。
