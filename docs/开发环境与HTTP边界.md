# 开发环境与 HTTP 边界

2026-10-21 新增[阿里云迁移候选方案](阿里云ECS部署.md)：离线构建及独立 ECS 模板，未部署；原平台运行事实不变。

源码核对：2026-10-15；Web `0b0d594952897ea1d90c39b7afb5b7430571f078`，API `d9a789baed9f45ce033f97da5c627eb4cbcc8dee`。变量来自 [.env.example](../.env.example)、[传输配置](../src/lib/web-transport.ts) 和 [proxy](../src/proxy.ts)。本文提供开发/联调方法，生产密钥与真实运行材料保存在受限环境。

## 工具链和两个运行进程

使用 Node.js **22.23.3**、pnpm **10.34.5**；Next.js/eslint-config-next **16.3.8**、React/react-dom **19.2.3**。冻结安装并执行 `pnpm check:framework`；CI、manifest 与包管理版本检查见[CI 文档](./CI与构建.md)。不要为文档示例重生成锁文件。

1. 在 API 仓库按其[开发说明](https://github.com/gduf-community/competition-Q-A-website#readme)配置独立合成数据库、认证等后端变量，启动 `pnpm dev --port 3001`。数据库迁移/seed 由 API 的显式工具负责，Web 不执行。
2. 在 Web 复制 `.env.example` 为 `.env.local`，两端注入同一随机服务凭据。可本地执行 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` 生成测试值；不要提交生成值或把它写成 NEXT_PUBLIC_ 变量。
3. 只读门户使用默认 public；完整联调把 Web 的 `WEB_RELEASE_MODE=trusted`、`API_ORIGIN=http://127.0.0.1:3001`、`WEB_TRUSTED_ORIGIN=http://localhost:3000` 显式填写。API 的 WEB_TRUSTED_ORIGIN、AUTH_URL、NEXT_PUBLIC_APP_URL 使用同一 `http://localhost:3000`。
4. Web 执行 `pnpm install --frozen-lockfile`、`pnpm dev`，始终从规范 `http://localhost:3000` 访问。localhost 和 127.0.0.1 的 host/Cookie/origin 不等价，不能随意混用浏览器地址。
5. 确认公开页能读取合成 API，再验证登录与业务写入；先区分传输/身份/权限故障，不用页面假数据掩盖 API 不可用。

只有构建不够时，先 `pnpm build` 再 `pnpm start`；后者是 production 模式，trusted 必须满足真实入口 IP 约束，不能直接照搬开发配置。Web start 不启动 API、不执行迁移。

## Web 变量

| 变量 | 默认/校验 | 使用位置 |
| --- | --- | --- |
| `WEB_RELEASE_MODE` | 只有精确 trusted 启用业务模式，其他值走 public | proxy、SSR 与 BFF |
| `API_ORIGIN` | 默认 `http://127.0.0.1:3001`；trusted 必须显式填写 | 服务端固定 API origin |
| `API_SERVICE_TOKEN` | 必填，64 位小写 hex，两端相同；仅运行时 | Web 创建服务 Authorization |
| `WEB_TRUSTED_ORIGIN` | 默认 `http://localhost:3000`；trusted 必须显式填写 | 规范 host/proto、来源与 callback |
| `WEB_CLIENT_IP_HEADER` | 只允许 x-forwarded-for / x-real-ip / cf-connecting-ip；trusted production 必填 | 入口必须覆盖为单个有效 IPv4/IPv6 |
| `SEARCH_REGEX_ENABLED` | 仅 true 启用 Web 能力候选；默认 false | 还要求 API 同名开关/能力声明为 true |

两个 origin 只接受 http/https，不带用户名、密码、路径、查询或 fragment。不能从浏览器 Forwarded/XFF/地域头选择源站或规范 origin。API 管理凭据、AUTH_SECRET、数据库与对象存储配置只放 API；Web 不需要它们。

## public 与 trusted 的实际差别

| 行为 | public | trusted |
| --- | --- | --- |
| 公开 JSON | 仅 server-only 白名单读取 | SSR 读取仍受 API 当前权限/公开资格约束 |
| 浏览器素材/官网/通知跳转 | 显式 GET/HEAD 例外 | 同一策略允许项加业务接口 |
| 浏览器业务 JSON/写入 | 不允许，BFF 404 | 逐路径/方法允许，最终由 API 授权 |
| 身份 Cookie / Set-Cookie | 不转发 | 按传输策略转发 |
| 登录、注册、本人、后台、报名页 | proxy 返回 503 提示公开预览不接入身份 | 进入页面后检查会话/能力/对象 |
| 访问 API | 仍需服务凭据和可用源站 | 同时需规范 Host/Origin 与生产 IP 入口 |

`/login` 和 `/register` 保留别名跳转到 `/sign-in` 和 `/sign-up`。非 API、非错误页面先经 `/api/web/access?path=...` 做服务访问检查：403 跳地域拒绝页，其他失败/10 秒超时返回 503。proxy 覆写 `x-web-current-path` 为内部 path+query，用于登录后返回。

## Cookie、CSRF 与客户端 IP

trusted 的业务 CSRF Cookie 名为 `competition_csrf_token`，由页面 proxy 在缺失时生成，SameSite=strict、path=/，https 时 secure；它为客户端可读，业务请求头为 `x-csrf-token`。`fetchWithCsrf` 只给同源写请求补头，缺 Cookie 时不会自动获取。Auth.js 登录/退出另沿现有库的 CSRF 机制。

BFF 读取先核对规范 Host；写入核对 Origin，缺失时检查 Referer 的 origin。它仅保留显式请求头，剥离浏览器 Authorization 与平行转发/IP/地域头；然后创建服务 Bearer、固定 x-forwarded-host/proto，并将配置选中的单一有效 IP 写入 x-forwarded-for。选中值为空且为 trusted production，或不是单个合法 IP，均拒绝转发，不从逗号分隔的链中自行选值。

入口的覆盖能力必须由平台核验，环境变量存在不能证明已覆盖。API 服务身份验证与网络隔离分别成立；不要把公网 `/api/*` 直接映射到 API 源站绕过 Web。

## 按现象排查

| 现象 | 先核对 |
| --- | --- |
| 启动/页面配置错误 | token 是否 64 位小写 hex，origin 是否纯 origin，trusted 是否显式配置 |
| public 登录/后台 503 | 模式设计阻断；完整联调使用合成环境的 trusted |
| 页面或公开数据 503 | API 是否启动、Web→API 是否可达、服务凭据是否一致、访问检查是否失败 |
| 浏览器调用公开列表 404 | 该 JSON 只供 SSR；使用页面导航，不扩大 BFF 白名单补救 |
| 写请求 403 | 浏览器 host 是否规范、Origin/Referer、业务 CSRF Cookie/头，再区分 API 权限拒绝 |
| 会话读 401 | 当前未登录；其他 5xx 不能当匿名或空列表 |
| BFF 502 | 上游 fetch/转发故障；relay try 之前的配置错误可能是框架错误 |
| 搜索准备中/资源忙 | SEARCH_NOT_READY、REGEX_*、SEARCH_TIMEOUT，沿[搜索协议](./搜索协议.md)缩小条件/重试 |
| 封面 422 / 保存 409 | 检查 field/code，保留输入；核对真实对象或服务端新 revision |
| 图片 404 / 415 | 当前公开资格/版本、对象存在性及真实格式；不要复用已失效缓存 URL |
| SSE 中断 | 核对代理流式传输/超时；当前客户端错误后关闭连接，无业务重连保证 |

详细方法、DTO 和二进制/SSE 处理见[HTTP 参考](./HTTP接口参考.md)。SSR `no-store` 与请求内 cache() 不等于没有 API 内部缓存；以各侧实际合同分别判断。

## 生产配对与验证边界

当前 main/production Git 引用曾同步，不能据此证明平台实例、迁移、S3 或真机已验收。两仓 GitHub CD 已停止，不等于平台自己的自动部署设置已改变。实际发布由维护者按受控窗口配对切换，绑定精确 Web/API SHA、运行配置和 artifact；旧 Web 不发服务凭据，新 Web 依赖当前年份/搜索/社团合同，不能混配。

API 应仅私网可达，Web 不直连数据库/对象存储管理端；入口头覆盖、跨项目私网、egress、HTTPS/Cookie/SSE 与独立回滚均需真实平台证据。Zeabur Server Firewall 的 ingress 规则不等于 service/container egress 隔离。平台与迁移说明见[API 运行拆分](https://github.com/gduf-community/competition-Q-A-website/blob/main/docs/Web与API运行拆分.md)。

历史依赖升级与 `tar@7.5.22` 打包适配记录保留在 Git/PR；当前脚本不依赖 Next 私有 compiled/tar。安装、产物、配对 HTTP、浏览器和生产结果分别记录，见[测试与验收](./测试与验收.md)。

返回[文档入口](./README.md)。

## 注册邮件状态确认

注册验证码使用原POST路径，新增Accept: application/x-ndjson。服务器输出sending才显示“服务器开始投送”；仅收到sent末事件才显示“验证码发出”，不能将HTTP200当作成功。API以Zeabur同一邮件ID的sent/delivered状态确认发出，不保证收件箱送达。

浏览器从发起请求起设一个30秒总确认预算（包含连接和响应流），超时显示失败并忽略迟到事件；卸载取消请求。同步ref锁覆盖表单校验与请求全过程，防双击；遵守Retry-After，失败/超时不立即重发，避免放大已消费限额或重复邮件。服务器超时无法撤回上游已受理邮件，迟到邮件的码可能失效。旧API普通JSON成功不作为确认依据；发布顺序为API先、Web后，需验收代理不缓冲流。无新增公开状态查询接口或客户端凭据。

超时及服务器返回unconfirmed均提示“发送确认失败/结果未确认，邮件仍可能发出”，不承诺未发送、未送达或已撤销。服务器有独立30秒预算并取消provider请求；浏览器取消不是唯一保护，数据库清理仍是尽力执行。
