# Contributing

感谢参与这个 UI 仓库。这里的目标是让公开协作者能安全地改 UI，而不接触私有生产逻辑。

## 贡献规则

- 只提交前端 UI、样式、mock 数据、静态资源和文档。
- 不提交 `.env`、数据库连接、认证逻辑、API 路由、迁移脚本或真实用户数据。
- 新增组件优先放入现有分层：`ui`、`marketing`、`competitions`、`motion`。
- 涉及展示数据时使用 `src/lib/mock-data.ts`，不要请求真实服务端。
- PR 描述请说明改动范围、截图或录屏、验证命令。

## 本地验证

```bash
npm run lint
npm run build
```

如果暂时无法运行完整构建，请在 PR 中说明原因。
