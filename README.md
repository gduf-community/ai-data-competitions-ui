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

#82 接入问答提问、回答、树形评论、采纳和治理。列表使用 API 分页，详情能力由 API 当前身份返回；命令成功后刷新，失败保留表单，提交期间锁定编辑和重复操作。Markdown 保持原 react-markdown/remark-gfm 配置，未启用原始 HTML。HTTP/SSR 回归已覆盖当前内容和隐藏/删除，键盘、IME、移动端及 Zeabur 实测仍另行验收。流式页面的 not-found 可返回 HTTP200，仍显示404并排除内容；API明确404。

## #99 管理端迁移

管理台、比赛/报名、用户/通知/审核、社团、分析/SQL、安全中心与社团工作台在本仓只消费 HTTP。保留 API main 的组件拆分与既有 UI 行为，授权、状态机、SQL、事务、PII、文件引用与存储留 API。管理壳/导航使用当前 API 会话，具体接口继续服务端对象授权；社团内容可编辑能力由 API 返回。#53 社团产品改版不在本次迁移范围。

配套 API 基线为 #98 main@0264c6c，#99 companion 按精确 SHA 和 PR 关联。开发/CI新增管理界面及原展示依赖；生产环境/Zeabur不改，Web启动不执行迁移。spr 管理新提交与堆叠 PR，维护者手动检查/晋级保留。

## #103 唯一入口

生产入口须覆盖Host为WEB_TRUSTED_ORIGIN authority，并将WEB_CLIENT_IP_HEADER覆盖为单一IPv4/IPv6；Web拒绝非法/多跳IP，只向API发送固定host/proto和规范x-forwarded-for，丢弃其他Forwarded、provider IP及地域头。trusted生产缺少IP拒绝请求，API继续核对Origin/CSRF、会话、当前角色和归属。API的AUTH_URL/NEXT_PUBLIC_APP_URL必须与规范Web一致。

平台须限制API业务源站只允许受控Web或ingress网络访问，规范头校验不能认证公网源站调用者。默认Browser→Web BFF→API；平台`/api/*→API`方式须保持同一头、Cookie、CSRF、下载与SSE契约。实际入口覆盖、网络隔离、Zeabur配置和生产回滚由#106核验。配置模板见.env.example和API仓库现行公共边界文档。

## #102 图片消费

公开DTO的上传素材由API返回当前授权版本URL；Web通过同源`/api/portal/assets`读取源字节，合法历史公开uploads地址保留。预览不转发Cookie，私有图片仍由API做对象授权。LazyFillImage失败显示占位，地址更新重新尝试，保留fill/object-cover/sizes；上传素材不进入Next优化缓存，避免优化缓存绕过源站撤回核验。普通静态图片保留优化。富文本只展示API已清洗并替换地址的HTML。生产CDN和真实撤回时限交#106。

## #104 检查、产物与手动晋级

`pnpm run ci`检查src/SSR、tsconfig别名、本地依赖闭包、静态import/require/dynamic import/re-export、根配置/构建脚本和安装后的生产/开发依赖图。计算模块路径、后端实现/凭据、Server Action及直接/间接后端依赖会拒绝；合法管理台`security/actions`展示路由保留。规则正反例使用隔离临时夹具；静态检查帮助评审，不能把任意未审核代码变成可信代码。

PR/fork、push和默认手动CI只有read权限，使用public模式与合成数据，不接生产密钥、真实身份或API发布权限。Next tracing固定在本仓；runtime包拒绝环境文件和指向包外的依赖链接。使用固定Next自带tar保留pnpm相对链接；打包后在临时目录解包启动，public身份页和私有写入须拒绝，避免源码安装掩盖依赖缺失。构建后`runtime-manifest.json`记录仓库、exact SHA、Node/平台/架构、锁文件与runtime.tar.gz的SHA256；Actions记录不可变artifact ID/digest（14天有效），仅上传runtime和manifest。不复用其他信任级别的依赖缓存。

维护者在main手动运行CI并明确`deploy=true`才会晋级：同次运行全部检查成功，artifact仓库/run/SHA/名字/有效期/digest正确，当前main仍等于candidate且已有production可快进。高权限job不checkout、不运行仓库代码、不下载执行产物；只调用固定GitHub API门禁并记录SHA/run/artifact/digest。旧运行、污染或过期产物、失败/取消/跳过检查、非快进均拒绝。API仓库有独立检查、runtime和production ref，不随Web晋级。

回滚只处理对应仓库：对main提交revert PR，经同一检查产生新的exact SHA/产物后手动晋级；不强推production，不让Web回滚修改数据库或存储。平台也可使用保存的已验证旧产物独立回部署，实际产物校验、Zeabur source配置和演练归#106。源码晋级回执不能证明平台已经部署或消费该artifact。本轮只改开发/CI与未来发布门禁，未触发生产发布。
