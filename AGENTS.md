<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## 规则与执行约束

| 规则 | 执行约束 |
| --- | --- |
| 通知中心公开正文只等待必需通知数据，身份/已读增强由客户端处理；严格受保护会话错误语义不变 | `notifications/page.tsx` 与 `NotificationsReadSync` 分离职责；`node --import tsx --test tests/public-ssr.test.mjs` 验证挂起/失败会话、正文保持、匿名/卸载不写和按用户已读，由 `pnpm test` 与 CI 执行 |
