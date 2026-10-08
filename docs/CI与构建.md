# Web CI 与构建

[工作流](../.github/workflows/ci.yml)在所有分支 push 和所有 PR 自动运行，也支持无发布参数的 `workflow_dispatch`。API CI 保持手动，两个仓库均停止 CD。

## 检查

固定 Node.js 22.23.3、pnpm 10.34.5；冻结安装后确认 manifest/lock 未被重写，再运行 `pnpm run ci`：

1. lint 与 [Web 边界检查](../scripts/check-web-boundaries.mjs)：源码/SSR、别名、静态模块边、根配置/脚本及依赖图。
2. `next typegen` 和 TypeScript 类型检查。
3. 前端、HTTP 传输、边界和产物回归。
4. Next standalone 生产构建。

检查保留 public 模式、合成 API_SERVICE_TOKEN 和只读 `contents` 权限，checkout 不持久化凭据。边界检查拒绝 SQL 恢复及服务凭据传输模块进入 client graph，打包检查浏览器 JS 中的后端配置/凭据名。fork/PR 不接生产密钥、真实身份或 API 发布权限。

## 产物

[打包脚本](../scripts/package-runtime.mjs)核验当前干净 HEAD 等于本次 SHA，保留 pnpm 相对依赖链接，拒绝环境文件和外部依赖链接。解包后在独立临时目录启动探针，验证 public 身份页和私有写入被拒绝。

只上传 `build/release/runtime.tar.gz` 和 `runtime-manifest.json`，保留 14 天。manifest 记录仓库、精确 SHA、工具链、平台/架构、锁文件与 payload 摘要；Actions 提供不可变 artifact ID/digest。不同平台产物不能混用。

## 停止 CD

工作流没有 deploy 输入、promote job、写权限、production ref 更新、平台部署调用或迁移步骤；上传构建产物不会发布。API 的原检查、模块计划、PostgreSQL 与固定 companion Web HTTP 回归保持现状，仅移除 CD。

源码回退通过目标仓库的 revert PR 和检查；实际生产回部署由维护者在平台单独执行，Web 回退不能改变 API 数据库或存储。当前生产分支和平台 source 没有因本次工作流修改自动变化，Zeabur 的独立自动部署设置须另行核对。旧晋级设计仅保留在[归档](./archive/README.md)。

环境影响：开发/CI 触发与校验、停止 GitHub CD；没有执行生产发布、数据库迁移或平台配置更改。源码、本地检查、远程 run 和真实部署分别记录。

返回[文档入口](./README.md)。


当前框架固定 Next.js/eslint-config-next **16.3.8**，React/react-dom **19.2.3**。冻结安装后执行 `pnpm run check:framework`（已接入 CI），再运行既有质量、构建和 runtime 校验；[兼容依赖与环境影响](./开发环境与HTTP边界.md)记录官方依据。
