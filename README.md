# 学院竞赛管理与问答平台 Web

此仓库承接真实 Web，取代原 Mock 演示；API、认证实现、数据库、事务、有效赋权和对象存储管理留在维护者的 API 仓库。原 Git 历史保留。

## 本地运行

Node.js 22.23.3、pnpm 10.34.5，使用唯一 pnpm-lock.yaml。运行 pnpm install --frozen-lockfile、pnpm dev；质量检查为 pnpm run ci。

复制 .env.example 并配置 API_ORIGIN。默认 WEB_RELEASE_MODE=public 仅接公开读取，网关不转发 Cookie，也不接受写入；登录、报名、本人资料和后台路由被阻断。受控业务版本须设置 WEB_RELEASE_MODE=trusted、精确 WEB_TRUSTED_ORIGIN，并使用已审核产物和隔离的预览源。环境标志不能使未审核代码成为可信代码。

Web 的 /api/** 仅作 HTTP 传输：固定 API origin 和浏览器 authority，不信任客户端 forwarded host/proto。保留状态、重定向、多个 Set-Cookie、上传流、下载和 SSE，并传播取消。浏览器使用原 URL、Cookie 和 CSRF；API 的 AUTH_URL 与 WEB_TRUSTED_ORIGIN 须指向可信 Web origin。后端凭据禁止放入 Web。生产还须设置已在入口验证覆盖的 WEB_CLIENT_IP_HEADER；未经验证的客户端自报 IP 不可作为地域或限流依据。

SSR 每次 cache:no-store 读取当前 API，只有 401 视为匿名、404 视为不可见；API 故障显示错误并允许重试。客户端写后刷新当前读取，不使用数据库检查或 Mock fallback。

## 本轮范围与后续

#81 迁移比赛公开展示、登录/注册/重置、报名、本人报名/成果/经验/资料及现有公开页面；业务判断继续由 API 执行。#82 承接问答互动，#83 承接管理和社团工作台。旧全栈保持兼容，PR 按 issue 堆叠，维护者审查后晋级；本地构建和静态边界检查不代表生产完成。

Zeabur 按负责人决策使用同服务器两个独立 project。#84 验证双部署、入口 IP、会话、上传/流式传输、连接池与独立回滚；#85 切换来源，#86 记录同机成本，不宣称释放服务器资源。不要让 Web 启动执行迁移。

本地固定工具链下：生产构建、类型、边界和3项测试通过。维护者在合成PostgreSQL上验证20项真实双进程HTTP，包含报名、会话、上传、SSR、SSE和失败；不代表浏览器或Zeabur验收。公开素材的独立分发按后续任务实施，预览不放开混合私有下载。旧Mock反向同步workflow已移除，新检查不部署。
