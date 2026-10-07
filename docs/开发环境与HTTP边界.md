# 开发环境与 HTTP 边界

当前调用链：浏览器交互 → Web BFF → 私有 API；公开数据由 Server Component 私网读取并渲染。Web 只持有 HTTP 配置和独立服务凭据，数据库、Auth.js 签名、业务授权、事务和存储管理留在 API。

## 配置与联调

从 [.env.example](../.env.example) 复制本地配置，API 单独启动。使用合成测试库和合成身份，Web 与 API 的规范 Web origin 必须一致。

| Web 变量 | 默认/要求 |
| --- | --- |
| `API_ORIGIN` | 默认 `http://127.0.0.1:3001`；trusted 必须显式填写固定 origin |
| `API_SERVICE_TOKEN` | 两端相同的 32 随机字节、64 位小写 hex；仅运行时注入，不得使用 NEXT_PUBLIC_ 或提交真实值 |
| `WEB_TRUSTED_ORIGIN` | 默认 `http://localhost:3000`；trusted 必须显式填写，禁止凭浏览器转发头选择 |
| `WEB_RELEASE_MODE` | 默认 public；仅 `trusted` 接受身份 Cookie 和业务写入 |
| `WEB_CLIENT_IP_HEADER` | 只允许 `x-forwarded-for`、`x-real-ip`、`cf-connecting-ip`；trusted production 必填，且入口必须覆盖为单一有效 IP |

完整本地联调将 API_ORIGIN、WEB_TRUSTED_ORIGIN 设为上述 loopback origin，WEB_RELEASE_MODE 设为 `trusted`，并在两端注入同一合成服务凭据，运行 `pnpm dev`。API 的 `WEB_TRUSTED_ORIGIN`、`AUTH_URL`、`NEXT_PUBLIC_APP_URL` 设为同一 `http://localhost:3000`；API 管理密钥只注入 API。本地 `pnpm start` 属于 production 模式，仍要求已验证的 IP 头，不能以本地开发配置绕过生产入口约束。

public 模式仅允许 server-only 公开 DTO 读取及显式素材字节/跳转 BFF，不转发 Cookie 或 Set-Cookie，拒绝写入并阻断认证、报名、本人和后台页面。它仍需要可用 API，不使用 Mock fallback。trusted 开关只选择传输行为，受控产物、隔离环境与入口验证仍需分别确认。

## HTTP 与读取

- [BFF](<../src/app/api/[...path]/route.ts>) 对每个允许路径显式列出方法；未命中在 fetch 前返回 404。允许的请求保持状态、重定向、多 Set-Cookie、multipart、下载、SSE 与取消信号；自身失败返回 502。
- [传输策略](../src/lib/web-transport.ts) 固定 host/proto，剥离客户端 Forwarded、平行 IP/地域头和 Authorization，由 Web 创建服务 Bearer。trusted 写入核对规范 Host 与 Origin/Referer；API 在会话、地域和数据库前恒时验证服务身份，再核对 CSRF、当前身份、作用域和对象归属。缺失、错误或未配置服务凭据返回 403，仅无业务数据的 `/api/health` 例外。
- [SSR 读取](../src/lib/web-api.ts) 使用 `cache: no-store`；404 才转不可见，[会话](../src/lib/web-session.ts)只有 401 转匿名。其他故障保留错误，不回退演示数据。客户端写成功刷新，失败保留可操作反馈。
- API 业务源站必须仅私网可达；平台不得把公网 `/api/*` 直接映射到 API 绕过 BFF。服务认证不能代替网络隔离。[API 入口契约](https://github.com/gduf-community/competition-Q-A-website/blob/main/docs/公开门户运行边界.md)维护完整服务端约束。

浏览器不能代理 competitions/homepage/notices/published/portal competitions/awards/hall-of-fame/profiles/clubs/questions 等公开业务 JSON；SSR 读取策略与浏览器策略独立。素材字节、官方链接和通知打开跳转是显式例外。身份、报名、交互、私有文件、后台与 SSE 保留逐接口权限。

比赛列表按 URL 的 keyword/status/year/page 在 API 内筛选，每页 30 条；年份来自聚合计数，Filter Bar 只更新 URL，Flight 只含当前页。通知铃铛/弹窗使用最多 20 条 SSR 通知；成果比赛选择器使用需登录、限流、每次最多 20 个 id/title 的 `/api/me/competition-options`。SQL 页面、组件、类型和专属测试已删除；API companion 删除 schema/run/validate 与执行能力，固定 `/api/admin/analytics` 保留。Web 边界与产物检查禁止 SQL 恢复及服务凭据进入 client graph/浏览器 JS。

## 图片与富文本

API 返回当前授权版本的素材 URL，Web 同源读取 `/api/portal/assets`；合法历史公开 uploads 地址保留。上传素材不进入 Next 图片优化缓存，避免旧缓存绕过源站撤回检查；静态外部图片按 [next.config.ts](../next.config.ts) 配置优化。使用 [LazyFillImage](../src/components/shared/lazy-fill-image.tsx) 保留尺寸、失败占位及地址变化后的重试。

私有图片继续由 API 对象授权。富文本展示 API 已清洗的 HTML，Markdown 使用现有 react-markdown/remark-gfm 配置，不启用原始 HTML。

## 环境与生产证据

GitHub CI 固定工具链、public 模式与合成夹具，既不连接生产服务，也不执行 CD。Zeabur、HTTPS、入口头覆盖、源站网络限制、SSE 和独立回滚须在平台核验，[API #95](https://github.com/gduf-community/competition-Q-A-website/issues/95)承接原 Web #106。两仓停止 GitHub CD 不等于已改变 Zeabur 自身部署开关。

正式启用需维护窗口配对发布或平台原子切换：两端先配置同一服务凭据，旧 Web 不发送凭据，新 Web 依赖比赛年份聚合响应，不能混配旧版本。API 无 public domain/port forwarding；跨 Project 私网、Web→DB/MinIO 禁连须真实容器实测。Zeabur Server Firewall 只管 ingress，不能替代 service/container egress policy。本轮未修改生产变量、网络、数据库或部署；浏览器 DevTools、实际平台验收独立留证。

返回[文档入口](./README.md)。
