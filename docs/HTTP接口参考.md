# Web HTTP 接口参考

## API #162 第一阶段配套（2026-10-26）

学生注册、本人资料提供的学号与报名申请人/队员表单均要求恰好 9 位 ASCII 字母/数字，拒绝前后空格、换行和特殊字符；资料空值/未提供保留原可选语义。API 是最终校验边界，教师注册、历史数据、身份和唯一性规则不变。

通知 GET `/api/notices/[id]/open` 仅检查有效性并跳转，不再保存已读或点击。显式已读继续 POST `/api/me/notices/read`，Web 复用 requestJSON 自动附加 CSRF/Origin 所需头，keepalive 保留导航时的请求机会。导航链接与公开 BFF 白名单保持原路径/方法。

密码重置后所有旧 Cookie（包括其他设备）失效，需要重新登录。安全中心 SSE 最多 60 秒并按既有客户端重连，API 持续复核权限/账号/会话版本和到期时间；每进程每用户最多 2 条、总计 50 条。统计响应保留 DTO，但不返回具名用户意向；数据规模/超时或忙碌返回 503/Retry-After，不展示截断统计。精确 API 实现和迁移见 [API 认证模块](https://github.com/gduf-community/competition-Q-A-website/blob/main/docs/modules/认证与会话.md)。生产未部署，须与 API 0037 迁移后配对验收。


官方获奖名单通过 `parseOfficialAwardList` 验证 API 的 competitionId/items/rowCount/summary/hasMore/nextCursor/permissions；成员 displayName/identityState/snapshotSource 转换为页面字段，已核实人数读取 verifiedPersonCount。接口没有赛事 facets、草稿数或 lastUpdatedAt，页面不伪造这些数据；年份/赛道支持直接输入，等级使用规范枚举。操作权限仅来自 API 的 permissions，每次写入仍由 API 复核。

更正 PATCH 使用 `{expectedVersion,reason,fields,members,advisors}`，成员为 operation=create/update/remove 命令；更新只发送用户实际更改的字段，新增用 officialName，展示名更新用 displayName。老师的完整目标列表使用 decision=manual/displayName，既有老师保留 advisorId，新老师省略 ID；省略未修改的学院可保留服务端快照。409 等到新响应返回后再启用提交，基线/草稿/最新版三方比较保留并发新增与未改字段，同名老师按 ID 区分。

官方获奖导出在 BFF 转发前验证 MIME、规范 Content-Disposition 与起始签名（CSV UTF-8 BOM / XLSX ZIP local header）。仅预读签名所需前缀，原字节依序转发，失败或取消会取消上游；不读取整份文件，也不据此证明 ZIP 完整性或内容语义。

源码核对：2026-10-15；Web `0b0d594952897ea1d90c39b7afb5b7430571f078`，配套 API `d9a789baed9f45ce033f97da5c627eb4cbcc8dee`。本文记录 Web 使用的请求、响应与传输限制；后端内部实现、数据库和运维操作由私有 API 文档维护。示例均为合成数据。

## 先选择调用入口

| 调用方 | 使用入口 | 可访问范围 |
| --- | --- | --- |
| 浏览器组件 | 同源 `/api/...`，JSON 优先用 `requestJSON`，上传用 `fetchWithCsrf` | 必须命中 BFF 的路径和方法策略；完整业务要求 trusted 模式 |
| Server Component / 服务端数据函数 | `readAPI`、`readOptionalAPI`、`requiredAPI` 或 `web-data.ts` 的适配函数 | public 只允许公开读取策略；trusted 可带当前会话读取业务数据 |
| Web 页面入口检查 | `proxy.ts` → API `/api/web/access?path=...` | Web 内部服务调用，浏览器 BFF 不开放此路径 |

源码：[BFF](<../src/app/api/[...path]/route.ts>)、[传输策略](../src/lib/web-transport.ts)、[SSR 客户端](../src/lib/web-api.ts)、[数据适配](../src/lib/web-data.ts)、[浏览器客户端](../src/lib/http-client.ts)、[页面 proxy](../src/proxy.ts)。运行配置见[开发环境与 HTTP 边界](./开发环境与HTTP边界.md)。

**API 有一个路由，不代表浏览器可以访问它。** 例如 `/api/competitions`、`/api/questions` 和 `/api/homepage` 的 JSON 由 Web 服务端读取；浏览器通过页面导航取得 HTML/RSC。public 模式的浏览器例外只有素材读取、比赛官网跳转和通知打开跳转。

`[id]`、`[slug]` 等是路径占位符，实际请求须编码 ID。表中的 GET 对应 BFF 通常同时允许 HEAD；源站如何生成 HEAD 由对应 GET/框架处理，不代表新增业务操作。OPTIONS 虽由 catch-all 导出，当前策略没有允许项，返回 404。

## 官方获奖正式名单与文件流（API #135 配套）

trusted BFF 新增且仅新增两个 GET：`/api/admin/official-awards/competitions/{competitionId}` 与 `/export`。competitionId为UUID；HEAD/写方法、导入/消歧/确认/汇总等其它路径均未开放，public仍404。API逐请求验证当前用户及同比赛有效授权，菜单或服务Token不授予用户权限。页面/向导由Web #136后续实现，本次只承接正式读取与文件传输。

列表参数为year/level/subTrack/q/sort/cursor/limit；兼容awardYear/levelCode，但别名不能并用，重复/未知参数400。q是字面子串，`%/_/反斜线`不作为通配符。summary中的awardCount/memberCount/verifiedPersonCount/unverifiedMemberCount是当前筛选总量，rowCount是本页奖项数；items一奖一项，含明确学生与老师，老师不计学生人次。未知快照null、学号掩码，同名不推断人物身份。默认limit50、最多100；nextCursor/hasMore只支持按游标前进，换筛选从第一页重查，不提供任意页跳转。

导出必填format=csv|xlsx和view=award|member，筛选/排序与列表一致，不接受cursor/limit。award一奖一行，member一学生一行且重复awardId；最多500奖项或5000学生，超限413、不截断。导出可含授权范围内完整学号，不含电话/邮箱；浏览器不要把具名结果或文件写入localStorage。空结果仍有固定表头；更正/撤销后查询与下载由同一有效集合生成。

下载先检查状态、Content-Type和Content-Disposition，再消费Response.body/blob；JSON错误不能作为文件。CSV为`text/csv; charset=utf-8`、UTF-8 BOM；XLSX严格为`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`，不接受application/octet-stream。固定文件名`official-awards-{competitionId}-{view}.{format}`，Disposition同时含quoted filename与UTF-8 filename*，API中和所有表格公式文本。BFF在任何文件字节转发前检查协议，MIME/文件名/Disposition异常502；合法文件原样流转并强制private/no-store，保留X-Request-Id。授权/持久审计失败503不出文件；401/403/400/413/429按状态呈现，不自动重试。

本次没有新增环境变量、依赖、页面或数据库访问；开发与后续生产的BFF策略均受影响，生产未部署。两仓PR记录精确配对SHA与真实文件流回归；本地HTTP不等于完整浏览器或线上验收。

## 请求、会话与错误约定

- 普通请求体用 `application/json`；表单上传用 `FormData`，不要手填 multipart 的 Content-Type/boundary。响应包裹按接口分别为 `data`、`application`、`competitions` 等，没有统一的 `{code,data}` 成功封装。
- 浏览器不发送服务 Bearer。Web 从运行时创建 `Authorization`，不转发浏览器自带的 Authorization；仅 trusted 转发会话 Cookie 和上游 Set-Cookie。会话签名、权限、对象归属和状态转换由 API 再次校验。
- trusted BFF 要求 Host 等于配置的 Web host；写请求要求 Origin，缺失时使用 Referer 的 origin。业务 CSRF 使用 `competition_csrf_token` Cookie 与 `x-csrf-token` 头；`fetchWithCsrf` 仅在同源写入且 Cookie 存在时补头，不负责获取缺失令牌。Auth.js 登录/退出另使用其自身 CSRF 流程。
- `requestJSON<T>` 的 `json` 与 `body` 互斥；`expect: 'empty'` 允许无成功载荷。非 2xx 抛 `HttpRequestError`，保留 `status`/`payload` 并优先采用 `message`；不会自动重试写入。泛型是消费端声明，不是运行时响应校验。
- `readAPI<T>` 使用 `no-store`、手动重定向和 15 秒超时；`readOptionalAPI` 只将 404 变成 null，`requiredAPI` 据此调用 `notFound()`。`getWebSession` 仅把 401 视为匿名，其余服务故障继续抛出。
- BFF 保留上游状态、流式 body、下载响应头和重定向；API 同源的 Location 改写到 Web origin。SSE、multipart 和多 Set-Cookie 按传输策略转发，不能一律调用 `response.json()`。

| 状态/来源 | 典型含义 | Web 处理 |
| --- | --- | --- |
| BFF 404 | 当前模式、路径或方法不在策略中 | 先核对调用入口，不视为业务对象不存在 |
| BFF 403 | trusted Host/Origin/Referer 不符 | 检查规范 origin 与代理配置 |
| API 400 / 422 | 参数或字段不合法 | 读取 `message`，有 `field` 时定位表单字段，保留输入 |
| API 401 / 403 | 未登录、无权限或对象范围不符 | 按页面流程登录/展示拒绝；不要重试绕过权限 |
| API 404 | 对象不存在或当前不可见 | 详情页显示不可见；素材保留文字与失败状态 |
| API 409 | 状态或版本冲突 | 保留编辑，重新读取核对；不要覆盖服务端版本 |
| API 410 | 旧社团审核/授权写入口退役 | 转向当前工作台或用户授权入口 |
| API 429 | 限流 | 尊重 `Retry-After`（若返回），给出稍后重试 |
| API 501 | 安全动作没有真实执行器 | 明确未执行，不能显示动作成功 |
| BFF 502 / API 503 / 5xx | 传输失败、服务未就绪或内部故障 | 提示服务错误及可操作重试，不伪装成空列表 |

错误体至少按实际返回检查 `message?`，部分接口只有 `code`；社团可带 `code`/`field`，搜索有专门错误码。配置解析发生在 BFF relay 的 try 之前，非法运行配置可能形成框架错误，不能全部归为 502。公开错误不输出内部日志或响应中的敏感数据。

## 公开门户：SSR 读取合同

下列 JSON 路由供 Web 服务端调用，浏览器 BFF 不开放（官网跳转单列在素材节）。DTO 字段定义在 [public-portal](../src/lib/contracts/public-portal.ts)、[portal](../src/lib/contracts/portal.ts)、[profiles](../src/lib/contracts/profiles.ts)、[clubs](../src/lib/contracts/clubs.ts)、[questions](../src/lib/contracts/questions.ts)。

| GET 路径 | 参数与返回包裹 | 主要消费者 |
| --- | --- | --- |
| `/api/homepage` | 无查询；`{featuredCompetitions, awardShowcaseEntries, hallOfFameEntries}` | 首页；`getHomepagePortalData` |
| `/api/competitions` | 搜索使用 `search=1&q&mode&page&pageSize`，可加 `year/status`；返回 `{competitions, items, total, query, years, searchCapabilities}`。旧有界读取用 `limit/offset/sort/keyword/year/status`，返回 `{competitions,total,years,limit,offset,searchCapabilities}` | 比赛列表；先用 `limit=1` 读取年份/能力，再请求当前页 |
| `/api/portal/competitions/[id]` | `{competition: PublicCompetitionDetail}`；不包含报名表与私有行 | 公开比赛详情 |
| `/api/competitions/[id]/showcase` | `{posts, entries}` | 比赛经验文章与人物展示 |
| `/api/notices/published` | `limit`；`{notices: PublishedNoticeRecord[]}` | 通知页、导航铃铛、弹窗；导航使用最多 20 条 SSR 记录 |
| `/api/awards` | `{awards: AwardGalleryRow[]}` | 当前奖状长廊 |
| `/api/awards/[id]` | `{award: PublicAwardDetail}` | 单张奖状详情 |
| `/api/hall-of-fame` | `{entries: PublicHallOfFameEntry[]}` | 名人堂 |
| `/api/profiles/[id]` | `{profile: PublicProfile}` | 公开人物资料与经验列表 |
| `/api/profiles/[id]/experiences/[postId]` | `{post: PublicExperiencePost}` | 公开经验详情 |
| `/api/clubs/[slug]` | `{data: {contacts}}`；公开联系人仅消费 `contactType/label/value` | 社团详情 |
| `/api/clubs/[slug]/contents` | `type` 为四种社团内容之一，`limit`；`{data: ClubContentSummaryRow[]}` | 社团分类内容列表 |
| `/api/clubs/[slug]/contents/[id]` | `{data: PublicClubContent}` | 社团公开内容详情 |
| `/api/questions` | 必须指定 `competitionId`；搜索用 `search=1&q&mode&page&pageSize`、可选 `status=open/closed`；`{questions,items,total,query,competitionId,filters,page,pageSize,hasMore}`。旧有界列表只返回 `{questions,page,pageSize,hasMore}` | 比赛问答列表、比赛详情问答摘要 |
| `/api/questions/[id]` | `competitionId` 绑定比赛作用域；`{question,answers,comments,canModerate,canAccept}` | 问答详情 |

`PublicCompetitionSummary` 只含 ID、标题、分类、年份、认定、状态、摘要、负责单位、报名模式/人数限制、四类时间、官网/推文 URL 和 CTA 字段。详情增加地点、说明、亮点、时间线、FAQ、附件和关联问答；报名表使用 trusted 的 `/api/competitions/[id]` 返回 `{competition: Competition}`。不要将公开详情类型当成完整报名配置。

合同中的社团/经验 `Date` 是适配后的本地类型，JSON 时间仍为字符串或 null；`web-data.ts` 显式恢复其日期。其他 DTO 的字符串时间按各自定义消费，不能对整个响应盲目转 Date。

比赛、问答的参数边界、排序、错误码与示例见[搜索协议](./搜索协议.md)。当前 `/awards` 仍读取长廊；年度 A/B/C 路由及聚合接口属于待办，不能据设计任务调用不存在的接口。

## 登录与注册

这些请求只在 trusted 的同源 BFF 可用。客户端入口位于 [认证页面](<../src/app/(auth)>)，业务会话 DTO 在 [client-session](../src/lib/auth/client-session.ts)。

| 路径与方法 | 请求 | 成功消费/限制 |
| --- | --- | --- |
| GET `/api/auth/csrf`、`/session`、`/providers`、`/signin`、`/error` | Auth.js 协议 | 由 `next-auth/react` 等现有调用消费；不是平台通用 JSON 包裹 |
| POST `/api/auth/callback/credentials` | 由 `signIn('credentials', ...)` 发送凭据及 Auth.js CSRF | 沿用 Auth.js 登录/重定向协议，不手工保存服务 Token |
| POST `/api/auth/signout` | 由 Auth.js signOut 发送 | 退出后使用当前页面的刷新/跳转逻辑 |
| POST `/api/auth/register/send-code` | `{email}` | `{message}`；邮箱重复 409、发送限流 429；响应成功不等于真实邮箱投递已核验 |
| POST `/api/auth/register` | `{name,studentId,college,className,grade,email,password,verificationCode}` | 201 `{user:{id,name,email}}`；学号 6–12 位字母/数字，验证码 6 位数字，密码至少 8 位且含字母/数字 |
| POST `/api/auth/register/teacher` | `{email,password}` | 201 `{user:{id,name,email}}`；沿用教师注册业务规则，不能从路径推断获得管理权限 |
| POST `/api/auth/forgot-password` | `{email}` | `{message}`；统一成功文案不暴露账号存在性 |
| POST `/api/auth/reset-password` | `{email,password,confirmPassword,verificationCode? ,token?}` | `{message}`；要求有效 token 或 6 位验证码，密码两次一致 |
| GET `/api/me/session` | 当前会话 Cookie | `{user: ClientSessionUser}`；401 表示未登录 |

`ClientSessionUser` 包含 `id/name/email/image/role/roles/scopedCompetitionIds/scopedClubSlugs/capabilities`。导航使用 API capability，敏感动作仍须 API 复核；不要仅用一个 role 推断所有权限。登录 callback 只保留经过 Web proxy 覆写/校验的内部路径，不能信任浏览器自带 `x-web-current-path`。

## 报名与审核

字段与校验事实源：[applications 合同](../src/lib/contracts/applications.ts)、[报名表单](../src/components/competitions/application-form.tsx)、[审核弹窗](../src/components/admin/application-review-dialog.tsx)。

| 方法/路径 | 输入 | 输出/用途 |
| --- | --- | --- |
| SSR GET `/api/competitions/[id]` | 比赛 ID；trusted | `{competition}`，用于报名字段与限制 |
| POST `/api/applications` | `ApplicationSubmission` | 201 `{application}` |
| PUT `/api/applications/[id]` | `ApplicationFields`，身份/既有模式不由客户端改写 | `{application}` |
| POST `/api/applications/[id]/withdraw` | `{comment?}`，最长 300 字符 | `{application}` |
| GET `/api/me/applications` | 当前身份 | `{applications: ApplicationRecord[]}` |
| GET `/api/me/applications/[id]` | 本人或可见团队记录 | `{application,logs,editData}`；`editData` 可为 null |
| DELETE `/api/me/applications/[id]` | 无业务请求体 | `{application}`；取消记录后刷新 |
| GET `/api/admin/applications` | `competitionId? / status? / q? / keyword? / mode?` | `{applications}`，完整授权集合，不接受公共分页参数 |
| GET `/api/admin/applications/[id]` | ID，独立的报名 PII 读取权限 | `{application}` |
| POST `/api/admin/applications/[id]/review` | `{action,comment}` | `{application}`；action 为 approve/reject/withdraw/cancel，comment 必填 |
| POST `/api/admin/applications` | `{ids,action,comment,competitionId?}` | `{updated: number}`；先检查 HTTP 成功再消费实际处理计数，失败按 message 呈现 |
| GET `/api/admin/applications/export` | 必须为单个 `competitionId`；`format=csv/xlsx`，可选 q/keyword/mode/status | 文件字节与下载头；独立 PII 导出授权，禁止用 JSON 客户端解析 |

`ApplicationSubmission` = `competitionId` + `mode=individual/team` + `ApplicationFields`。基本字段为 `applicantName/studentId/college/major/grade/phone/email`，可带 `selectedSubTrack/statement/teamName/teamMembers/advisors`。队员使用 `name/studentId/college/major/grade/phone/email`；指导老师使用 `name/college/major/phone/email`。Web Schema 中队员最多 30，指导老师最多 5；比赛自身限制仍由 API/当前报名配置约束。团队至少一位队员和团队名，个人不能夹带团队信息。

详情中的 `accessRole=owner/team_member`、`readOnly` 与 `editData` 决定界面可编辑范围；列表可见不代表拥有完整个人信息或导出权限。报名状态为 draft/submitted/approved/rejected/withdrawn/cancelled，不能把枚举当作任意两状态均可互转。

## 问答命令

统一 POST `/api/questions/commands`，请求是 [QuestionCommand](../src/lib/contracts/questions.ts)，成功 `{result}`。入口组件：[提问](../src/components/questions/question-list.tsx)、[详情](../src/components/questions/question-detail.tsx)、[评论](../src/components/questions/comment-tree.tsx)。

| operation | 除 operation 外的字段 |
| --- | --- |
| ask | `competitionId,title,body`；标题 4–255 字符、正文至少 10 |
| answer | `competitionId,questionId,body` |
| comment | `competitionId,questionId,body,answerId?,parentId?`；两个可选 ID 可为 null |
| accept | `competitionId,questionId,answerId` |
| moderate | `competitionId,questionId,action`；close/reopen/hide/pin/unpin |
| deleteQuestion | `competitionId,questionId` |
| deleteAnswer | `competitionId,questionId,answerId` |
| deleteComment | `competitionId,commentId` |

调用 `submitQuestionCommand(command)` 后刷新；不要调用浏览器未开放的旧 POST `/api/questions`。`canModerate/canAccept` 来自详情响应，API 仍复核对象与比赛范围；Markdown 使用现有 react-markdown/remark-gfm 配置，不开启原始 HTML。

## 个人资料、成果与通知已读

消费者：[profile 组件](../src/components/profile)、[通知组件](../src/components/notifications)、[个人 DTO](../src/lib/contracts/profiles.ts)。

| 方法/路径 | 输入 | 返回/限制 |
| --- | --- | --- |
| GET / PUT `/api/me/profile` | PUT 可更新基础信息、展示开关和公开资料 | `{data: MeProfileData,titles: TitleInfo[]}`；不在此更新邮箱/权限 |
| POST `/api/me/avatar` | multipart `file`，PNG/JPEG/WebP，最大 2 MiB | `{url}`；归属为当前账号 |
| GET `/api/me/competition-options` | `keyword` 最长 120 字符 | `{competitions:[{id,title}]}`，最多 20 项；登录/限流保护 |
| GET / POST `/api/me/award-certificates` | POST multipart `file,competitionId,awardLevel?`；图片最大 5 MiB | GET `{awards}`；POST `{id,url}`，走奖状专用入口 |
| DELETE `/api/me/award-certificates/[id]` | 本人奖状 ID | `{success:true}`，成功后刷新 |
| GET `/api/me/experience-posts` | 当前身份 | `{data: ExperiencePostRow[]}` |
| POST `/api/me/experience-posts` | 当前自助创建入口停用 | 403；管理员邀请草稿；`/me/experiences/new` 实际重定向到列表 |
| GET / PUT / DELETE `/api/me/experience-posts/[id]` | PUT `{title?,content?,awardLevel?}` | GET/PUT `{data}`；DELETE `{success:true}` |
| POST `/api/me/experience-posts/[id]/submit`、`/withdraw`、`/offline` | 对应文章动作 | 沿现有服务端状态校验，成功后刷新 |
| GET / POST / PUT / DELETE `/api/me/hall-of-fame` | PUT `{tag,bio?}`；tag 1–120，bio 最长 500 | GET `{entry}` 可为 null；POST 403；PUT `{id,status}`；DELETE `{success:true}`；需已有邀请/有效记录 |
| GET / POST `/api/me/notices/read` | POST `{noticeIds: UUID[]}`，1–100 个 | GET `{noticeIds}`；POST `{success:true}`；匿名已读在本地维护 |

个人资料 PUT 可选字段：`name/studentNo/college/major/grade/phone/nickname/gender/birthday/schoolName/department/enrollmentYear/educationLevel/inSchoolStatus/publicBio/skillTags/publicShowAvatar/publicShowCollegeMajor/publicShowTitles`。`gender=male/female/other/null`，`inSchoolStatus=yes/no/graduated/null`；入学年份 1990–2100 或 null，简介最长 500，技能最多 10 个、每个最长 30。字段是否允许 null 按 DTO/现有编辑器逐项处理，不把空值泛化到所有字段。

## 社团工作台、封面与版本

当前入口为 `/admin/clubs/[slug]/contents`；`slug` 来自固定 [社团配置](../src/lib/data/clubs.ts)，页面目录中的 `[id]` 实际也是 slug。消费者：[编辑器](../src/components/clubs-admin/club-content-editor.tsx)、[列表动作](../src/components/clubs-admin/club-content-manage-list.tsx)、[封面上传](../src/components/clubs-admin/club-cover-upload-field.tsx)。

| 方法/路径 | 输入 | 返回 |
| --- | --- | --- |
| GET `/api/admin/clubs` | 当前有效授权 | `{data:[{slug,name,shortName,...,canManageContent}]}`；Web 工作台过滤可管理内容的社团 |
| GET / POST `/api/admin/clubs/[slug]/contents` | GET 可用 `type/status`；POST 为新建合同 | `{data}`；POST 201，创建草稿 |
| GET / PATCH `/api/admin/clubs/[slug]/contents/[id]` | PATCH 为变更字段与必填 `expectedRevision` | GET `{data,canEdit}`；PATCH `{data}`，返回新 revision |
| DELETE 同上；POST 后缀 `/publish`、`/offline`、`/archive` | `{expectedRevision: 正整数}` | `{data}`；按 API allowedActions 显示动作 |
| GET `/api/admin/clubs/contents` | `status/clubSlug` 可选，默认 published | `{data}`；治理入口只消费已发布列表，权限与内容管理不同 |
| POST `/api/admin/clubs/contents/[id]/offline`、`/archive` | `{expectedRevision}` | `{data}`；治理权限单独判定 |
| GET / PUT `/api/admin/clubs/[slug]/contacts` | PUT 顶层数组 `[{contactType,label?,value,displayOrder?}]`，最多 50 项 | `{data}`；设置仅全局管理员可用 |
| GET `/api/admin/clubs/[slug]/admins` | 有管理授权的身份 | `{data: ClubAdminRow[]}`；旧绑定 POST、解绑 DELETE 已退役 |

新建公共字段：`contentType,title,coverImage,content?,coverImages?,commandId?`。类型为 recruitment/activity/announcement/event_summary；标题 1–300 字符、正文最长 80,000、图集最多 20。Web 为新建生成 UUID `commandId` 并在失败重试中复用。招新可带 `recruitmentStartAt/recruitmentEndAt/registrationUrl`，活动可带 `eventStartAt/eventEndAt/eventLocation`；公告/回顾不能混入别的类型字段，创建成功后不可改变 contentType。

`coverImage` 必须是实际上传并经 API 对象归属/可读/解码校验的资源。PATCH 省略时保留既有有效封面，null/空串不能清空；上传进行中禁止按钮和键盘提交。可选时间用 ISO 字符串或 null，开始不得晚于结束；报名外链为 https。图集/正文中的图片也由 API 对合并后的内容校验。

保存/发布顺序：POST 创建得到 ID/revision → 必要时 PATCH 得到新 revision → POST publish 携带该 revision。已发布内容 PATCH 保持公开；已下线内容保存仍私有，重新公开须显式 publish。发布失败保留已存草稿，原样重试可只重试 publish，避免重复创建。409 `VERSION_CONFLICT` 保留用户输入并要求重新读取核对；422 可带 `field=coverImage`。

旧 `/api/me/clubs/...` 仍有兼容读取/写路由，但 Web 新流程使用 admin 工作台。submit/withdraw 与旧治理 review 在鉴权后返回 410 `WORKFLOW_RETIRED`；旧社团管理员 POST/DELETE 绑定返回 410 `ASSIGNMENT_ENTRY_RETIRED`。`/api/me/clubs/[slug]/contents/[id]/publish` 虽在 API 存在，浏览器策略不开放；使用 admin publish。不要把 BFF 允许转发退役方法解读为功能仍可用。

## 管理台其他合同

消费者：[admin 组件](../src/components/admin)、[后台页面](<../src/app/(dashboard)/admin>)；类型见 [types](../src/lib/types.ts)、[profiles](../src/lib/contracts/profiles.ts)、[analytics-types](../src/lib/admin/analytics-types.ts)。所有读取/操作均受 API 当前身份与范围控制。

| 方法/路径 | 输入 | 响应/使用说明 |
| --- | --- | --- |
| GET / POST `/api/admin/competitions` | POST 为比赛编辑器请求 | GET `{competitions}`；POST `{competition}` |
| GET / PATCH / DELETE `/api/admin/competitions/[id]` | PATCH 编辑请求、DELETE 无业务体 | GET/PATCH `{competition}`；删除成功后重载列表 |
| GET `/api/admin/users` | `q/keyword/mode`，不支持公共分页 | `{users,competitions,permissions,roles}`；用户权限、可分配角色按响应显示 |
| PATCH / DELETE `/api/admin/users/[id]` | PATCH `{status?,roleAssignments?}` 或独立 `{clubAssignment}` | PATCH `{user}`；删除走独立管理权限 |
| GET / POST `/api/admin/notices` | POST `{competitionId: string|null,title,content,status}` | GET `{notices,competitions,canManageGlobal}`；POST 201 `{notice}` |
| PATCH / DELETE `/api/admin/notices/[id]` | PATCH 上述可选字段 | PATCH `{notice}`；DELETE `{success:true}` |
| GET `/api/admin/award-certificates` | `status=pending/approved/rejected` 可选 | `{data,permissions}` |
| POST `/api/admin/award-certificates/[id]/review` | `{action:approve/reject,comment?}` | `{success:true}`；只有待审核记录可审核 |
| PATCH / DELETE `/api/admin/award-certificates/[id]` | PATCH `{showOnHomepage?,displayOrder?}` | `{success:true}`，展示/排序与审核分别处理 |
| GET `/api/admin/experience-posts` | `status=draft/pending_review/published/offline` 可选 | `{data,permissions}` |
| POST `/api/admin/experience-posts/invite` | `{userId,competitionId,awardLevel?,title?}`，前两个为 UUID | 201 `{data}`，为用户创建受邀草稿 |
| POST `/api/admin/experience-posts/[id]/review` | `{action:approve/reject/offline,comment?}` | `{success:true}` |
| GET / POST `/api/admin/hall-of-fame` | POST `{email,tag?,bio?,adminBio?,status?,displayOrder?}` | GET `{data,permissions}`；POST 201 `{data}`，默认 invited |
| GET / PUT / DELETE `/api/admin/hall-of-fame/[id]` | PUT 可改 tag/bio/adminBio/status/displayOrder | GET/PUT `{data}`；DELETE `{success:true}`；非 invited 状态要求非空 tag |
| GET `/api/admin/dashboard` | 当前管理身份 | `{stats,reviewTrend,statusDistribution}` |
| GET `/api/admin/analytics` | 当前授权作用域 | `AdminAnalyticsPayload`；generatedAt/scope/assumptions/methodology/overview/competitions/funnel/users/notifications/risk |
| GET `/api/admin/search` | `target,q/keyword,mode,page,pageSize` 与目标允许的筛选字段 | `{target,keywordType,data,pagination:{page,pageSize,total}}`；权限/敏感精确检索按目标决定，页长最多 200 |

比赛编辑器的字段与默认值由 [competition-form-model](../src/components/admin/competition-form-model.ts) 统一产生：包括标题、分类、年份、认定、摘要、单位、报名方式/团队上限、是否要求指导老师、状态、CTA/外链、报名/活动时间、地点、描述及各数组。`buildCompetitionRequest` 执行 trim、日期转换和空数组整理；不要复制另一套请求转换或从 summary 拼详情。

用户 `status=active/pending_verification/disabled`。`roleAssignments` 为 `{role,competitionId?}` 数组，比赛管理员须带比赛作用域。社团授权为单独的 `{clubAssignment:{clubSlug,action:grant/revoke,expectedAssignmentId: UUID|null,expiresAt?: ISO|null}}`；不能和 status/roleAssignments 混在一次更新中。当前有效 assignment ID 从用户响应读取，不能凭 slug 构造。

通用后台搜索 target 仅为 users/questions/notices/events。对应可筛选字段分别是 status；status/competition_id；status/priority/competition_id；event_type/user_id。敏感字段搜索/明文可见性仍由 API 当前权限控制，数据字段和允许筛选字段不是同一集合，不增加公共 URL 分享。

通知的创建标题 2–255 字符、正文非空，status 为 draft/published/withdrawn；priority/deliveryScope/allowPopup 是读取 DTO 字段，当前 CRUD 请求 Schema 未开放这些编辑字段。名人堂创建/更新支持的 status 为 invited/candidate/active，不因本地类型含 hidden 就自行发送 hidden。

当前奖状管理、经验审核、名人堂和社团治理的部分列表在对应关系未初始化时可能返回 200 `{data:[]}`；这类兼容返回不能证明数据库已初始化或实际不存在记录，完整联调仍须 API 环境/迁移证据。其他非 2xx 故障继续按错误处理，不能在 Web 主动吞错回退空数据。

## 安全事件、动作与 SSE

类型事实源：[security/types](../src/lib/security/types.ts)，客户端：[security 组件](../src/components/security)。此处描述已有能力；GeoIP #123 的每日补全 worker 仍是计划，当前没有可调用的新接口。

| 方法/路径 | 输入 | 返回 |
| --- | --- | --- |
| GET `/api/admin/security/events`、`/alerts`、`/actions` | `page/page_size` 与该资源支持的 snake_case 筛选 | `SecurityListPayload<T>={items,total,page,pageSize}`；页长最多 200 |
| GET `/api/admin/security/events/[id]`、`/alerts/[id]` | ID | 分别 `{event}`、`{alert}` |
| GET `/api/admin/security/actions/[id]` | ID | `{action,receipts}` |
| POST `/api/admin/security/alerts/[id]/ack`、`/resolve`、`/ignore` | 无业务请求体 | `{alert}`；更新后刷新列表 |
| POST `/api/admin/security/actions` | `{sourceAlertId?,actionType,targetType,targetValue,ttlSeconds?,reason}` | 201 `{action}`；来源可为 null，TTL 0–86400 秒，reason 1–2000 |
| POST `/api/admin/security/actions/[id]/execute`、`/rollback` | `{detail?}`，最长 2000 字符 | `{action,receipt}`；当前真实执行/回滚仅 allow_ip + ip，其他动作 501 |
| GET / PATCH `/api/admin/security/access-policy` | PATCH `{enabled?,config?}` | `{policy}`；config 可含 allowProvinces/allowWhitelist/blockUnknownRegion/adminBypass/allowLocalhost |
| GET / POST `/api/admin/security/ip-whitelist` | POST `{ipCidr,remark?,enabled?,expiresAt?}` | GET `{items}`；POST 201 `{item}` |
| DELETE `/api/admin/security/ip-whitelist/[id]` | ID | 删除反馈后重载，不与安全动作回执混淆 |
| GET `/api/admin/security/situation/overview` | 无分页 | `SituationOverviewView` |
| GET `/api/admin/security/situation/map` | 无分页 | `SituationMapView` |
| GET `/api/admin/security/situation/events` | `page_size` 等当前筛选 | `SecurityListPayload<SituationAccessLogView>` |
| GET `/api/admin/security/situation/live` | `EventSource` 同源连接 | `text/event-stream`，业务事件名 `access`，data 为 JSON 访问事件 |
| POST `/api/security/events/client` | `{eventType,metadata?}` | 客户端安全辅助上报；事件仅允许 devtools_detected / sensitive_action_debug_context 的完整 security.client.* 名称 |

事件表支持 event_type/severity/source/ip/user_id/path/status/from/to；告警表支持 alert_type/severity/status/target_type/target_value/rule_id/from/to；动作表支持 action_type/target_type/target_value/status。态势事件另有 from/to/ip/risk_level/is_blocked/path。日期与 ID 的合法性由 API 验证，事件/态势事件不接受 q/keyword/mode；不能把 page_size 改成公共 pageSize，或把本地已载入样本搜索当成全库检索。

[use-situation-data](../src/components/security/use-situation-data.ts) 当前在 `access` 到达时将事件前插并保留最多 200 条；每 15 秒刷新 overview，卸载时取消请求、定时器并关闭连接。onerror 会关闭 EventSource，当前没有重新建立连接的业务循环；overview 轮询也不能补齐全部漏失事件。不要承诺断网后无缝补发或全量历史消费。

## 图片、上传、下载与跳转

| 方法/路径 | 输入 | 响应与限制 |
| --- | --- | --- |
| GET/HEAD `/api/portal/assets` | `key`、64 位小写 hex `version`，可选 `check=1` | 默认文件字节；check 返回 `{version}`；当前资格/版本失效 404，格式不符 415；按源站 Cache-Control 重新验证 |
| GET/HEAD `/api/uploads` | 单个 `key` | 历史/私有素材按 API 规则读取；public BFF 仅接受规范公开候选路径及唯一 key 参数 |
| POST `/api/uploads` | multipart `scope,files`，按范围带 `competitionId` 或 `clubSlug`；旧 clubId 仅兼容且不得与 slug 冲突 | 201 `{files:[{publicUrl,...}]}`；scope 为 notice/competition/avatar/club，文件类型/数量/大小按当前 API 规则 |
| GET/HEAD `/api/competitions/[id]/official-link` | 比赛 ID | 公开官网跳转，按响应 Location 导航，不解析 JSON |
| GET/HEAD `/api/notices/[id]/open` | 通知 ID | 通知目标跳转，按 Location 导航 |

社团封面 UI 接受 PNG/JPEG/WebP、最大 5 MiB；头像和奖状分别走上节专用入口，不能将其 field 名 file 与通用上传的 files 混用。API 返回的素材 URL 是可见性/版本合同的一部分，不自行拼对象桶地址或重算 version。上传图片经 [LazyFillImage](../src/components/shared/lazy-fill-image.tsx) 直接同源读取，绕过 Next 图片优化缓存；静态外部图才按 next.config 的远程域配置优化。

### 最小调用示例

服务端读取公开比赛使用 server-only helper：

```ts
import { readAPI } from '@/lib/web-api';
import type { PublicCompetitionSummary } from '@/lib/contracts/public-portal';

const result = await readAPI<{ competitions: PublicCompetitionSummary[]; total: number }>(
  '/api/competitions?search=1&q=数学&mode=fuzzy&page=1&pageSize=20',
);
```

已登录客户端提问使用现有命令 helper（competitionId 必须替换为当前真实可见的合成测试赛事 ID）：

```ts
import { submitQuestionCommand } from '@/lib/http-client';

await submitQuestionCommand({
  operation: 'ask',
  competitionId: '11111111-1111-4111-8111-111111111111',
  title: '团队报名资料要求',
  body: '请问本场比赛的团队成员需要提供哪些资料？',
});
```

社团上传使用 `FormData.set('scope','club')`、`set('clubSlug',slug)`、`set('files',file)`，传给 `fetchWithCsrf('/api/uploads',{method:'POST',body:formData})`；先检查 response.ok，再消费 files[0].publicUrl。无登录、无 CSRF Cookie、无对应社团授权或无可用 API 都不能靠示例绕过。

## 完整路径与方法核对表

下表按配套 API 的 109 个 Route 文件核对 Web 策略。它用于查漏与判断可达性，具体参数和响应以上文各模块为准；`—` 表示相应策略不开放。public SSR GET 表示读取白名单匹配，响应格式仍须按合同处理，例如官网跳转不能用 readAPI 当 JSON 解析。HEAD 仅在 BFF 策略允许该 GET 路径时随 GET 透传。可信模式的服务端读取不受 public SSR 白名单限制，但仍受 API 权限与对应方法约束。

Auth.js 动态路由需按前文具体子路径使用，不可以把 catch-all 视为任意认证路径开放。旧接口退役及服务内部路由在备注中单独标明。

<!-- web-api-route-matrix:start -->
| API 路径 | API 方法 | trusted 浏览器 BFF | public 浏览器 | public SSR GET | 备注 |
| --- | --- | --- | --- | --- | --- |
| `/api/admin/analytics` | GET | GET | — | — |  |
| `/api/admin/applications` | GET/POST | GET/POST | — | — |  |
| `/api/admin/applications/[id]` | GET | GET | — | — |  |
| `/api/admin/applications/[id]/review` | POST | POST | — | — |  |
| `/api/admin/applications/export` | GET | GET | — | — |  |
| `/api/admin/award-certificates` | GET | GET | — | — |  |
| `/api/admin/award-certificates/[id]` | DELETE/PATCH | DELETE/PATCH | — | — |  |
| `/api/admin/award-certificates/[id]/review` | POST | POST | — | — |  |
| `/api/admin/clubs` | GET | GET | — | — |  |
| `/api/admin/clubs/[clubSlug]/admins` | GET/POST | GET/POST | — | — | 旧 POST/DELETE 绑定退役；GET 保留 |
| `/api/admin/clubs/[clubSlug]/admins/[userId]` | DELETE | DELETE | — | — | 旧 POST/DELETE 绑定退役；GET 保留 |
| `/api/admin/clubs/[clubSlug]/contacts` | GET/PUT | GET/PUT | — | — |  |
| `/api/admin/clubs/[clubSlug]/contents` | GET/POST | GET/POST | — | — |  |
| `/api/admin/clubs/[clubSlug]/contents/[id]` | DELETE/GET/PATCH | DELETE/GET/PATCH | — | — |  |
| `/api/admin/clubs/[clubSlug]/contents/[id]/archive` | POST | POST | — | — |  |
| `/api/admin/clubs/[clubSlug]/contents/[id]/offline` | POST | POST | — | — |  |
| `/api/admin/clubs/[clubSlug]/contents/[id]/publish` | POST | POST | — | — |  |
| `/api/admin/clubs/contents` | GET | GET | — | — |  |
| `/api/admin/clubs/contents/[id]/archive` | POST | POST | — | — |  |
| `/api/admin/clubs/contents/[id]/offline` | POST | POST | — | — |  |
| `/api/admin/clubs/contents/[id]/review` | POST | POST | — | — | 鉴权后 410 WORKFLOW_RETIRED |
| `/api/admin/competitions` | GET/POST | GET/POST | — | — |  |
| `/api/admin/competitions/[id]` | DELETE/GET/PATCH | DELETE/GET/PATCH | — | — |  |
| `/api/admin/dashboard` | GET | GET | — | — |  |
| `/api/admin/experience-posts` | GET | GET | — | — |  |
| `/api/admin/experience-posts/[id]/review` | POST | POST | — | — |  |
| `/api/admin/experience-posts/invite` | POST | POST | — | — |  |
| `/api/admin/hall-of-fame` | GET/POST | GET/POST | — | — |  |
| `/api/admin/hall-of-fame/[id]` | DELETE/GET/PUT | DELETE/GET/PUT | — | — |  |
| `/api/admin/notices` | GET/POST | GET/POST | — | — |  |
| `/api/admin/notices/[id]` | DELETE/PATCH | DELETE/PATCH | — | — |  |
| `/api/admin/search` | GET | GET | — | — |  |
| `/api/admin/security/access-policy` | GET/PATCH | GET/PATCH | — | — |  |
| `/api/admin/security/actions` | GET/POST | GET/POST | — | — |  |
| `/api/admin/security/actions/[id]` | GET | GET | — | — |  |
| `/api/admin/security/actions/[id]/execute` | POST | POST | — | — |  |
| `/api/admin/security/actions/[id]/rollback` | POST | POST | — | — |  |
| `/api/admin/security/alerts` | GET | GET | — | — |  |
| `/api/admin/security/alerts/[id]` | GET | GET | — | — |  |
| `/api/admin/security/alerts/[id]/ack` | POST | POST | — | — |  |
| `/api/admin/security/alerts/[id]/ignore` | POST | POST | — | — |  |
| `/api/admin/security/alerts/[id]/resolve` | POST | POST | — | — |  |
| `/api/admin/security/events` | GET | GET | — | — |  |
| `/api/admin/security/events/[id]` | GET | GET | — | — |  |
| `/api/admin/security/ip-whitelist` | GET/POST | GET/POST | — | — |  |
| `/api/admin/security/ip-whitelist/[id]` | DELETE | DELETE | — | — |  |
| `/api/admin/security/situation/events` | GET | GET | — | — |  |
| `/api/admin/security/situation/live` | GET | GET | — | — |  |
| `/api/admin/security/situation/map` | GET | GET | — | — |  |
| `/api/admin/security/situation/overview` | GET | GET | — | — |  |
| `/api/admin/users` | GET | GET | — | — |  |
| `/api/admin/users/[id]` | DELETE/PATCH | DELETE/PATCH | — | — |  |
| `/api/applications` | POST | POST | — | — |  |
| `/api/applications/[id]` | PUT | PUT | — | — |  |
| `/api/applications/[id]/withdraw` | POST | POST | — | — |  |
| `/api/auth/[...nextauth]` | GET/POST | 见认证节 | — | — | 按认证节具体子路径；动态 GET/POST 非任意路径放行 |
| `/api/auth/forgot-password` | POST | POST | — | — |  |
| `/api/auth/register` | POST | POST | — | — |  |
| `/api/auth/register/send-code` | POST | POST | — | — |  |
| `/api/auth/register/teacher` | POST | POST | — | — |  |
| `/api/auth/reset-password` | POST | POST | — | — |  |
| `/api/awards` | GET | — | — | 是 |  |
| `/api/awards/[id]` | GET | — | — | 是 |  |
| `/api/clubs` | GET | — | — | — | 当前 Web 总览使用静态配置 |
| `/api/clubs/[slug]` | GET | — | — | 是 |  |
| `/api/clubs/[slug]/contents` | GET | — | — | 是 |  |
| `/api/clubs/[slug]/contents/[id]` | GET | — | — | 是 |  |
| `/api/competitions` | GET | — | — | 是 |  |
| `/api/competitions/[id]` | GET | — | — | — | trusted SSR 报名配置，浏览器不开放 |
| `/api/competitions/[id]/official-link` | GET | GET | GET/HEAD | 是 |  |
| `/api/competitions/[id]/showcase` | GET | — | — | 是 |  |
| `/api/hall-of-fame` | GET | — | — | 是 |  |
| `/api/health` | GET | — | — | — | API 运维健康，不经 Web BFF |
| `/api/homepage` | GET | — | — | 是 |  |
| `/api/me/applications` | GET | GET | — | — |  |
| `/api/me/applications/[id]` | DELETE/GET | DELETE/GET | — | — |  |
| `/api/me/avatar` | POST | POST | — | — |  |
| `/api/me/award-certificates` | GET/POST | GET/POST | — | — |  |
| `/api/me/award-certificates/[id]` | DELETE | DELETE | — | — |  |
| `/api/me/clubs` | GET | GET | — | — |  |
| `/api/me/clubs/[clubSlug]/contents` | GET/POST | GET/POST | — | — |  |
| `/api/me/clubs/[clubSlug]/contents/[id]` | DELETE/GET/PATCH | DELETE/GET/PATCH | — | — |  |
| `/api/me/clubs/[clubSlug]/contents/[id]/offline` | POST | POST | — | — |  |
| `/api/me/clubs/[clubSlug]/contents/[id]/publish` | POST | — | — | — | 使用 admin publish，BFF 不开放本路径 |
| `/api/me/clubs/[clubSlug]/contents/[id]/submit` | POST | POST | — | — | 鉴权后 410 WORKFLOW_RETIRED |
| `/api/me/clubs/[clubSlug]/contents/[id]/withdraw` | POST | POST | — | — | 鉴权后 410 WORKFLOW_RETIRED |
| `/api/me/competition-options` | GET | GET | — | — |  |
| `/api/me/experience-posts` | GET/POST | GET/POST | — | — | 自助 POST 403，已有邀请流程另处理 |
| `/api/me/experience-posts/[id]` | DELETE/GET/PUT | DELETE/GET/PUT | — | — |  |
| `/api/me/experience-posts/[id]/offline` | POST | POST | — | — |  |
| `/api/me/experience-posts/[id]/submit` | POST | POST | — | — |  |
| `/api/me/experience-posts/[id]/withdraw` | POST | POST | — | — |  |
| `/api/me/hall-of-fame` | DELETE/GET/POST/PUT | DELETE/GET/POST/PUT | — | — | 自助 POST 403，已有邀请流程另处理 |
| `/api/me/notices/read` | GET/POST | GET/POST | — | — |  |
| `/api/me/profile` | GET/PUT | GET/PUT | — | — |  |
| `/api/me/session` | GET | GET | — | — |  |
| `/api/notices/[id]/open` | GET | GET | GET/HEAD | — |  |
| `/api/notices/published` | GET | — | — | 是 |  |
| `/api/portal/assets` | GET | GET | GET/HEAD | — |  |
| `/api/portal/competitions/[id]` | GET | — | — | 是 |  |
| `/api/profiles/[id]` | GET | — | — | 是 |  |
| `/api/profiles/[id]/experiences/[postId]` | GET | — | — | 是 |  |
| `/api/questions` | GET/POST | — | — | 是 | POST 兼容接口不经 BFF；命令走 /commands |
| `/api/questions/[id]` | GET | — | — | 是 |  |
| `/api/questions/commands` | POST | POST | — | — |  |
| `/api/security/events/client` | POST | POST | — | — |  |
| `/api/security/events/server` | POST | — | — | — | 服务内部接口，Web 不开放 |
| `/api/uploads` | GET/POST | GET/POST | GET/HEAD | — |  |
| `/api/web/access` | GET | — | — | — | Web proxy 内部调用 |
<!-- web-api-route-matrix:end -->

返回[文档入口](./README.md) · [页面与流程](./页面结构与用户流程.md) · [测试与验收](./测试与验收.md)。
