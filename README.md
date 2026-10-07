# 学院竞赛管理与问答平台 Web

本仓库是平台唯一完整 Web，负责全部页面、组件、SSR、同源 BFF 和前端测试。可信 API、认证签名、授权、事务、数据库与对象存储由 [gduf-community/competition-Q-A-website](https://github.com/gduf-community/competition-Q-A-website) 承担。Browser → Web → API → DB / Object Storage。原 Git 历史保留。

## 本地运行

Node.js 22.23.3、pnpm 10.34.5，使用唯一 pnpm-lock.yaml。运行 pnpm install --frozen-lockfile、pnpm dev；质量检查为 pnpm run ci。

复制 .env.example 并配置 API_ORIGIN、API_SERVICE_TOKEN。默认 WEB_RELEASE_MODE=public 仅允许 Server Component 私网公开读取，以及受限素材/跳转 BFF；网关不转发 Cookie，也不接受写入；登录、报名、本人资料和后台路由被阻断。受控业务版本须设置 WEB_RELEASE_MODE=trusted、精确 WEB_TRUSTED_ORIGIN，并使用已审核产物和隔离的预览源。环境标志不能使未审核代码成为可信代码。

Web 的 /api/** 仅作 HTTP 传输：固定 API origin 和浏览器 authority，不信任客户端 forwarded host/proto。保留状态、重定向、多个 Set-Cookie、上传流、下载和 SSE，并传播取消。浏览器使用原 URL、Cookie 和 CSRF；API 的 AUTH_URL 与 WEB_TRUSTED_ORIGIN 须指向可信 Web origin。Web 仅持有独立服务凭据 API_SERVICE_TOKEN；数据库、认证签名、S3/MinIO 管理凭据禁止放入 Web。生产还须设置已在入口验证覆盖的 WEB_CLIENT_IP_HEADER；未经验证的客户端自报 IP 不可作为地域或限流依据。

SSR 每次 cache:no-store 读取当前 API，只有 401 视为匿名、404 视为不可见；API 故障显示错误并允许重试。客户端写后刷新当前读取，不使用数据库检查或 Mock fallback。

## 本轮范围与后续

#81 迁移比赛公开展示、登录/注册/重置、报名、本人报名/成果/经验/资料及现有公开页面；业务判断继续由 API 执行。#82 承接问答互动，#83 承接管理和社团工作台。API 物理清理删除了旧页面、组件和 Server Actions，Web 实现全部在本仓维护。两仓分别评审和晋级；本地检查不代表生产验收。

Zeabur 按负责人决策使用同服务器两个独立 project。#84 验证双部署、入口 IP、会话、上传/流式传输、连接池与独立回滚；#85 切换来源，#86 记录同机成本，不宣称释放服务器资源。不要让 Web 启动执行迁移。

本地固定工具链下：生产构建、类型、边界和3项测试通过。维护者在合成PostgreSQL上验证20项真实双进程HTTP，包含报名、会话、上传、SSR、SSE和失败；不代表浏览器或Zeabur验收。公开素材的独立分发按后续任务实施，预览不放开混合私有下载。旧Mock反向同步workflow已移除，新检查不部署。

#82 接入问答提问、回答、树形评论、采纳和治理。列表使用 API 分页，详情能力由 API 当前身份返回；命令成功后刷新，失败保留表单，提交期间锁定编辑和重复操作。Markdown 保持原 react-markdown/remark-gfm 配置，未启用原始 HTML。HTTP/SSR 回归已覆盖当前内容和隐藏/删除，键盘、IME、移动端及 Zeabur 实测仍另行验收。流式页面的 not-found 可返回 HTTP200，仍显示404并排除内容；API明确404。

## #99 管理端迁移

管理台、比赛/报名、用户/通知/审核、社团、固定分析、安全中心与社团工作台在本仓只消费 HTTP。保留 API main 的组件拆分与既有 UI 行为，授权、状态机、事务、PII、文件引用与存储留 API。管理壳/导航使用当前 API 会话，具体接口继续服务端对象授权；社团内容可编辑能力由 API 返回。#53 社团产品改版不在本次迁移范围。

配套 API 基线为 #98 main@0264c6c，#99 companion 按精确 SHA 和 PR 关联。开发/CI新增管理界面及原展示依赖；生产环境/Zeabur不改，Web启动不执行迁移。spr 管理新提交与堆叠 PR，维护者手动检查/晋级保留。

## #103 唯一入口

生产入口须覆盖Host为WEB_TRUSTED_ORIGIN authority，并将WEB_CLIENT_IP_HEADER覆盖为单一IPv4/IPv6；Web拒绝非法/多跳IP，只向API发送固定host/proto和规范x-forwarded-for，丢弃其他Forwarded、provider IP及地域头。trusted生产缺少IP拒绝请求，API继续核对Origin/CSRF、会话、当前角色和归属。API的AUTH_URL/NEXT_PUBLIC_APP_URL必须与规范Web一致。

平台须限制API业务源站只允许受控Web或ingress网络访问，规范头校验不能认证公网源站调用者。默认Browser→Web BFF→API；平台不得绕过 Web BFF 将公网 `/api/*` 直接映射到 API。实际入口覆盖、网络隔离、Zeabur配置和生产回滚由#106核验。配置模板见.env.example和API仓库现行公共边界文档。

## #102 图片消费

公开DTO的上传素材由API返回当前授权版本URL；Web通过同源`/api/portal/assets`读取源字节，合法历史公开uploads地址保留。预览不转发Cookie，私有图片仍由API做对象授权。LazyFillImage失败显示占位，地址更新重新尝试，保留fill/object-cover/sizes；上传素材不进入Next优化缓存，避免优化缓存绕过源站撤回核验。普通静态图片保留优化。富文本只展示API已清洗并替换地址的HTML。生产CDN和真实撤回时限交#106。

## #104 检查、产物与手动晋级

`pnpm run ci`检查src/SSR、tsconfig别名、本地依赖闭包、静态import/require/dynamic import/re-export、根配置/构建脚本和安装后的生产/开发依赖图。计算模块路径、后端实现/凭据、Server Action及直接/间接后端依赖会拒绝；合法管理台`security/actions`展示路由保留。规则正反例使用隔离临时夹具；静态检查帮助评审，不能把任意未审核代码变成可信代码。

PR/fork、push和默认手动CI只有read权限，使用public模式与合成数据，不接生产密钥、真实身份或API发布权限。Next tracing固定在本仓；runtime包拒绝环境文件和指向包外的依赖链接。使用固定Next自带tar保留pnpm相对链接；打包后在临时目录解包启动，public身份页和私有写入须拒绝，避免源码安装掩盖依赖缺失。构建后`runtime-manifest.json`记录仓库、exact SHA、Node/平台/架构、锁文件与runtime.tar.gz的SHA256；Actions记录不可变artifact ID/digest（14天有效），仅上传runtime和manifest。不复用其他信任级别的依赖缓存。

维护者在main手动运行CI并明确`deploy=true`才会晋级：同次运行全部检查成功，artifact仓库/run/SHA/名字/有效期/digest正确，当前main仍等于candidate且已有production可快进。高权限job不checkout、不运行仓库代码、不下载执行产物；只调用固定GitHub API门禁并记录SHA/run/artifact/digest。旧运行、污染或过期产物、失败/取消/跳过检查、非快进均拒绝。API仓库有独立检查、runtime和production ref，不随Web晋级。

回滚只处理对应仓库：对main提交revert PR，经同一检查产生新的exact SHA/产物后手动晋级；不强推production，不让Web回滚修改数据库或存储。平台也可使用保存的已验证旧产物独立回部署，实际产物校验、Zeabur source配置和演练归#106。源码晋级回执不能证明平台已经部署或消费该artifact。本轮只改开发/CI与未来发布门禁，未触发生产发布。

## 物理拆分后的测试归属

前端列表、比赛编辑、报名表单、浏览器 HTTP 客户端和安全态势 presenter 测试从 API 迁入本仓 tests。报名回归执行本仓实际源码声明与提交 handler，不引入另一套表单实现；API 保留 DB、权限、事务、HTTP、存储和运行时回归。

环境影响为开发/CI 与后续构建；本次未部署、未修改数据库或存储。API 默认 build/start 仅运行 API，迁移为显式 release runner 步骤。build:api/start:api 保留一个发布周期后再移除。

## 私有 API 与最小 BFF

BFF 仅属于本仓 Web 传输层：`src/app/api/[...path]/route.ts`执行代理，`src/lib/web-transport.ts`逐路径/方法允许；未命中在 fetch 前返回 404。Host、Origin/Referer、Cookie、CSRF 契约继续保持。授权与业务判断仍归 API。公开 DTO 只由`src/lib/web-api.ts`的 server-only 私网读取，浏览器不能访问 competitions/homepage/notices/published/awards/profiles/clubs/questions 等公开 JSON。素材字节、官方链接/通知打开跳转是明确例外；这些例外不返回公开业务 DTO。

所有 Web→API 请求由服务端创建 Authorization Bearer，浏览器 Authorization 不透传。两仓运行环境需配置相同 `API_SERVICE_TOKEN`（32 随机字节，64 位小写十六进制）；仅在运行时注入，禁止 NEXT_PUBLIC_、提交到仓库或提供给公开预览真实凭据。PR/CI 仅用合成值及合成 API。Web 不持有 DB/PG、AUTH_SECRET、S3/MinIO 管理凭据。边界检查拒绝服务凭据传输模块进入 client graph。

比赛列表按 URL 的 keyword/status/year/page 在 Server Component 查询，每页 30 条；年份导航只传聚合计数。Filter Bar 只更新 URL，不请求 API，也不下载全表；Flight 只含当前页记录。通知铃铛与弹窗读取服务端提供的最多 20 条通知。成果上传的比赛选择器仅使用需登录、限流、最多 20 个 id/title 的查询入口 `/api/me/competition-options`。

SQL 页面、组件、草稿类型和专属测试已删除，API companion 同时删除 schema/run/validate 与执行服务。固定 `/api/admin/analytics`保留。Web 边界检查与 API 构建门禁阻止查询台恢复。

环境影响：开发、CI 与未来生产均需服务认证配置；本次没有部署、网络或数据库变更。正式启用需在维护窗口配对发布或原子切换：两端先配置同一新凭据；旧 Web 不携带凭据，新 Web 依赖比赛年份聚合响应，因此不能混配旧版本。API 无公网 domain/port forwarding，仅私网地址；Web→DB/MinIO 必须由 service/container egress policy 约束。Zeabur Server Firewall 的 ingress 设置不能替代 egress 隔离；跨 Project 私网可达性与禁连必须在真实容器实测。

2026-10-07 本地验证（Node 22.23.3 / pnpm 10.34.5）：lint/边界、typecheck、47 项 Web 回归和生产构建通过；配套 API 的 PostgreSQL 18 合成数据库 50 项、API+trusted Web+public preview HTTP 29 项均通过且无跳过。SSR 第二页仅出现该页 30 条记录，BFF 公共 JSON/SQL 404，登录退出、报名撤回、上传下载、问答与 SSE 回归通过。源代码及本地 HTTP 不替代浏览器 DevTools、远程 CI 或真实 Zeabur 网络/egress 验收。
