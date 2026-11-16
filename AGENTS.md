<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 规则与执行约束

| 规则 | 执行约束 |
| --- | --- |
| 通知中心公开正文只等待必需通知数据，身份/已读增强由客户端处理；严格受保护会话错误语义不变 | `notifications/page.tsx` 与 `NotificationsReadSync` 分离职责；`node --import tsx --test tests/public-ssr.test.mjs` 验证挂起/失败会话、正文保持、匿名/卸载不写和按用户已读，由 `pnpm test` 与 CI 执行 |
| 通知已读状态仅追加；较旧服务器快照不能撤销当前用户的本地已读，也不能跨用户合并 | `mergeReadNoticeIdsFromServer` 是唯一快照入口；`tests/public-ssr.test.mjs` 的旧快照/去重/用户隔离/无额外 POST 用例由 `pnpm test` 与 CI 执行 |
| 官方名单及本人奖状成员的 UUID 域与 API `z.uuid()` 一致；路径/方法和 trusted/public 白名单不扩大 | `web-transport.ts` 复用 Zod UUID 正则；`tests/official-awards-bff.test.ts` 随 `pnpm test`/CI 执行；API `test:contracts` 直接加载当前 Web 对拍 |
| Web 传输层的 Origin/私有缓存证据不能替代 API 身份、对象授权及当前权限 | 安全门禁只为 `permittedBrowserRequest` 明确否定后无条件拒绝的调用授 origin，`privateNoStoreHeaders` 仅授 cache；`tests/security.test.mjs` 验证无效调用和能力冒领被拒，实际 BFF/proxy 回归验证行为 |
| 官方获奖命令仅能影响所属弹窗；同一事件内不得重复写入，409 仅接受该次刷新结果，过期导出不得落盘 | `useOfficialAwardCommand` 统一命令所有权；赛事/弹窗 key、列表请求代际与导出 controller 所有权；`tests/official-awards-lifecycle.test.mjs`、`tests/official-awards-export-lifecycle.test.ts` 由 `pnpm test` 与 CI 执行 |
| 社团失败保留输入；409 核对前不能推进 revision，发布重试必须对应最近保存快照；离开编辑器不得自动继续发布 | 编辑器/列表同步 ref 锁、显式核对与差异 PATCH、页面 key、上传取消；`tests/club-async.test.ts` 与 `tests/club-workflow.test.ts` 由 `pnpm test` 与 CI 执行 |
