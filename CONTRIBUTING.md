# 参与贡献

此仓库提供真实 Web 页面、组件、HTTP 消费者与透明传输网关。请沿已有目录和产品行为做最小修改，数据使用明确的公开合同或本地合成 API。

不得提交环境密钥、真实学生数据、数据库/认证实现、原 Server Action 或对象存储管理代码。SSR 和构建同样受此边界限制；pnpm lint 会检查源码与依赖。默认公开预览不允许真实登录或业务写入，不应将维护者业务环境配置给贡献分支。

使用Node.js 22.23.5、pnpm 10.34.5，先`pnpm install --frozen-lockfile`；业务改动执行`pnpm check:framework`与`pnpm run ci`，纯文档检查链接/锚点、命令/源码与`git diff --check`即可。完整要求见[协作指南](./docs/开源协作指南.md)，当前任务从[Project #2](https://github.com/orgs/gduf-community/projects/2)的“可领取”进入。提交PR记录范围与实际验证，跨仓附配套PR/精确SHA；涉及UI提供脱敏截图。可信产物发布、平台切换和生产配置由维护者流程管理。
