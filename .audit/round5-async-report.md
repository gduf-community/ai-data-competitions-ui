# 第五轮：异步状态与并发治理

日期：2026-11-16。执行范围：官方获奖更正/撤销弹窗、名单加载/导出、社团编辑/发布/列表动作/封面上传，以及相关 API 事务响应。两仓独立分支均为 `codex/governance-round5-async-20261116`。未推送、创建 PR、合并或部署。

## 1. 基线、方法与覆盖

从第一轮已提交结果建立独立 worktree：UI `3ca21f5` → `F:/ai-data-competitions/.worktrees/round5-ui`；API `22a7d2a` → `F:/ai-data-competitions/.worktrees/round5-api`。原 `ui/`、`api/` 工作目录的名人堂文档、README、索引和 `.audit/` 未纳入本轮提交，没有切换原分支或清理其现场。不依赖第二至第四轮成果。

理由是消除实际缺陷、降低重复异步错误，采用 oracle-first 的编译/类型和行为测试路线。先独立提交失败 oracle，再修复；没有数据算法迁移，不虚构 golden outputs。参考 [correct](https://github.com/cursor/plugins/blob/main/pstack/skills/correct/SKILL.md)、[code-audit](https://github.com/pietz/skills/blob/main/skills/code-audit/SKILL.md)、[oracle-first-refactor](https://github.com/pkuppens/skills/blob/main/skills/oracle-first-refactor/SKILL.md)。`how` 用于追踪实际调用与边界，按代码健康、跨模块一致性、安全/性能和正确性视角复核。`why`、`blast-radius` 本地技能未找到，使用 Git 历史、实际调用方、类型检查和跨仓测试分析意图与影响，不声称运行了不存在的工具。

既有官方名单历史 `d58e3ec`、`a1076fc`、`987d322`、`7a3174f`、`4937c78` 多次处理导出、409、三方更正和赛事残留，是需要重查行为的线索；不将提交次数视为错误率，不推断作者身份。本轮重复类别由不同实际调用路径的失败测试证明。API 官方更正/撤销已使用行锁、expectedVersion 与事务审计，未发现需要修改该服务端路径的证据。

覆盖不等于全仓审计。没有为所有 `fetch` 机械引入新框架或状态库，没有改变权限矩阵、Schema、迁移、BFF 白名单或对象存储配置。

## 2. 发现、复现时序与原因

| 问题 | 可复现时序与影响 | 原因及结果 |
| --- | --- | --- |
| P1 社团命令返回他人的 revision | A 保存/发布/创建 COMMIT → B 保存 COMMIT → A 构造响应；修前 A 返回 B 的较新 revision，下一次保存可携带自己未看过的版本 | service 在事务后重新 GET 当前行。改为返回本次事务行快照；真实 PG 测试证明 A 返回自己的版本，旧版本后续写入仍 409 |
| P1 发布快捷重试对应过时快照 | 保存 A → 发布失败 → 保存 B → 输入回到 A 并发布；修前可跳过保存 A，实际发布 B | `pendingPublishRef` 未因其它保存失效。现在仅最近成功保存且完全相同的快照可跳过 PATCH |
| P2 同一渲染内重复命令 | 更正、撤销、社团保存、跨列表行操作的两个回调在 React 下一次渲染前运行，修前均可发出两笔写请求 | `submitting/loading` 渲染态不是互斥锁。新增同步 ref 单飞锁；后端 CAS/事务仍是最终一致性边界 |
| P2 旧命令操作新弹窗 | A 提交 → 切 B/关闭/卸载 → A 成功、409 或失败返回；修前旧回调会关闭新弹窗、触发新冲突或显示过时通知 | 缺失任务所有权。官方命令共用 owner hook，layout cleanup 在新记录交互前失效旧任务，旧 catch/finally 不能改新请求 |
| P2 409 解除等待不对应本次读取 | 同 URL 增加 refreshKey 后的第一次渲染仍可能显示旧 `loading=false`；父页又按通用成功 revision 判断刷新 | 把页面身份、请求代际和独立 refreshing 状态混用。结果绑定完整请求 key，父页只接纳该次 settledRefreshKey，刷新序号由 ref 单调产生 |
| P2 409 状态残留或无法恢复 | 冲突刷新失败/403/404 隐藏表单；关闭冲突弹窗未释放 wait；社团仅提示重新加载，refresh 又保留旧客户端 revision | 官方读取失败保留弹窗并禁写/可重试，打开/关闭清理等待。社团新增读取、差异核对与明确重基，禁止未经核对的盲重试 |
| P2 载入最新值后仍用旧更正基线 | 409 载入 v2 后，把某字段改回 v1 原值；修前相对 v1 比较会错误认为未修改 | 载入最新值同时更新草稿比较基线；原因保留。三方成员/老师命令及稳定 ID 继续使用现有实现 |
| P2 过期导出落盘/旧 finally 清新状态 | 同帧双导出、取消后 blob 晚到、切赛事/筛选/卸载、旧请求在新请求期间结束 | controller 从 state 改为 ref，单飞、layout cleanup 取消、响应/body 后 owner 检查及有条件 finally，错误页仍不能下载 |
| P2 离开社团编辑器仍继续动作 | 保存响应在卸载后返回，修前仍能继续 publish/跳转；旧封面上传可继续占用连接 | 编辑器/列表/封面的 layout cleanup 失效任务；离开后不继续 publish 或 UI 副作用，读/上传取消且晚到值无效 |
| P2 首次创建重放借用较新版本 | 首次创建成功但响应丢失 → 他人编辑/发布 → 原 commandId 重试；修前直接返回他人版本 | 只有仍为 revision=1 的 draft 可重放；已改变返回 409，Web 保留同 commandId（内容 ID）进入 GET 核对，不重新创建 |

API 确定性 oracle 在真实 COMMIT 与服务响应之间插入另一笔真实事务，而非只判断源码形态；创建、保存、发布及创建重放四例修前 4/4 失败，修后 4/4 通过。服务端本次版本响应不能被误解为“在响应到达时仍为全局最新版”，后续并发仍依赖 CAS 拒绝。

## 3. 修改与架构选择

UI 官方名单：新增局部领域机制 `src/hooks/use-official-award-command.ts`，合并两个弹窗原先重复的提交生命周期与 409/错误处理。请求 controller 是唯一在途任务 owner，state 只展示进度。赛事/弹窗使用 key 确定状态寿命；列表结果自身记录请求代际，删除独立 refreshing/成功 revision 状态。命令等待时冻结编辑字段，失败继续保留用户输入。导出仍使用专用文件协议消费，不迁到 JSON 客户端。

UI 社团：在原编辑器、列表和封面组件内维护同步锁、保存基线与待发布快照；未增加通用状态管理层。409 显示本地/最新字段与经清洗的富文本，用户确认后保留尚未保存的修改、吸收未编辑字段，再用新 revision 继续。正文双方都修改时核对整段内容，不自动拼接 HTML。PATCH 只发送相对基线真正变化字段，也避免把未编辑的分钟格式日期重发覆盖秒精度。编辑页/新建页/列表增加对象 key；旧 `/me/clubs` 编辑入口只重定向，不复制实现。

API：`createClubContentRecord`、`updateClubContentRecord`、`changeClubContentStatusRecord` 返回事务生成的行快照，正文按该快照指向的不可变对象补读；service 不在 COMMIT 后再次 GET 当前行。保留当前授权复核、对象归属、行锁、revision/xmin CAS、状态机与日志事务。删除命令仍只返回 ID。类型变化由本仓全部源码与测试类型检查覆盖，没有据文本搜索宣称穷尽动态调用。

## 4. 防复发机制与验证证据

| Oracle / 约束 | 结果与边界 |
| --- | --- |
| 修前 UI 提交 `bd412d1` 原样重放三组 oracle | 22 例中 18 例明确失败、4 例通过，无跳过；独立 detached worktree `round5-ui-oracle-replay`（重放后已清理），日志 `.tools/round5-ui-oracle-replay-red.log`。这是真实修前代码，未用手工编造的坏实现 |
| 最终 UI 定向行为 | 37/37：official-awards-lifecycle 12、export-lifecycle 7、club-async 14、既有 club-workflow 4；涵盖成功/403/409/500、失败重试、旧 finally、layout cleanup、输入与快照。执行真实组件/hooks/handlers，React/DOM调度隔离，不冒充浏览器 |
| API 新确定性 DB oracle | 4/4 通过；完整 `pnpm test:db` 123/123，无跳过。保留既有并发保存/下线、官方更正/撤销、撤权/日志回滚测试 |
| 最终两仓真实 HTTP | 74/74，无跳过；真实 API standalone + trusted/public Web 构建 + 独立回环 PostgreSQL，覆盖 DTO、BFF、授权/CSRF、创建重放、409/GET恢复、更正/撤销与文件协议 |
| 实际 Chrome 157.0.8103.51 | 5 组场景通过，pageerror=0：500保留原因；409核对v2；同事件双击单写与切记录；社团409核对/吸收未编辑正文/差异PATCH；切导出筛选取消旧下载且下一次有效CSV可下载。真实ReactDOM/Radix/表单/编辑器/Next Router context，HTTP使用合成拦截，不是生产登录链路 |
| 两仓 framework/lint/边界/typecheck/生产 build | 通过；UI 2、API 5 个既有 lint warnings。Node22.23.3、pnpm10.34.5；UI Next16.4.5，API16.4.1。两仓 manifest/lock无修改 |
| UI 完整 `pnpm test` | 199/200，无跳过；唯一失败是既有 ECS fixture 的 Windows文件symlink EPERM，未删测试或放宽断言 |
| API 完整 `pnpm test` | 权限回归和107/107单元通过；CI规则128/130，无跳过。既有bash续期fixture与Windows文件symlink权限两项失败，不能描述为完整CI绿色 |
| 安全继承 | UI通过。API失败：22个受影响入口缺当前证据；详见伴随API `.audit/round5-security-impact.md`，保留真实失败，没有改policy/baseline/例外或给适用项虚填NA |
| 文档与diff | API既有check-docs通过；UI没有该脚本，执行本轮文档相对文件链接核对；两仓git diff --check通过 |

新测试直接进入既有 `tests/*.test.*` 或 API database/runtime 测试通配及 CI，没有新增平行测试入口。两仓 AGENTS 维护“规则→执行约束”；说明置于已有 HTTP、组件、测试、流程/社团模块文档。

遵循 correct 的层级选择：官方命令生命周期先集中到一个领域入口，事务响应直接返回本次行，消除手工同步来源；同帧锁和网络时序无法靠 TypeScript 证明，使用行为回归。社团保存/发布的业务阶段与导出文件生命周期不同，不强行合并成通用 command 框架。没有引入无法证明必要的 lint 正则或状态库。

## 5. 剩余风险与环境边界

- **集成门槛**：API安全继承失败仍需处理。22入口摘要变化部分源于共享仓储的整文件闭包；同时有既有 body读取无字节上界、部分后台集合无行数上界、users DELETE当前授权证据与机制登记缺口。没有据此声称线上已越权，也没有将这些缺口悄悄标为通过。
- **跨仓兼容**：路径/DTO/字段不变；创建重放条件收紧需要配对集成UI。旧UI不能提供本轮创建409恢复；不要只拣API提交后宣称完整修复。旧API仍可能返回他人版本，仅合UI也不能保证本轮一致性目标。
- **冲突决策**：同字段（尤其整段正文）双方修改仍由用户核对。本轮不建立协同编辑/自动文本合并。记录离开官方名单筛选时不伪造最新版；保留可复制输入、可重试读取，必要时重新查询。
- **取消语义**：取消客户端读取/上传/命令不保证服务端撤销已提交事务或对象。写命令不自动重试；响应丢失依赖原commandId、版本检查与显式核对。上传孤儿对象按既有运维规则处理，不在本轮删除。
- **范围**：其它表单可能仍使用仅state门禁；本轮不是全仓所有异步路径的统一迁移。第三轮若调整HTTP错误、超时/取消接口，需要保留这里的所有权检查。
- **证据缺口**：远程Ubuntu CI、真实S3、生产迁移/部署、真实移动设备/微信/Safari和OS IME未验收。浏览器fixture无完整平台登录/网络部署环境，跨仓HTTP与浏览器证据分别陈述。
- 依赖只在独立worktree按锁文件安装；没有升级业务依赖、修改生产环境配置或启动迁移。浏览器驱动只安装于 `.tools/round5-browser`，不进入两仓依赖；临时合成PG独立监听loopback，不连接已有生产/本机5432业务库。

## 6. Git 交付与改动范围

| 仓库 | 提交 | 范围 |
| --- | --- | --- |
| UI | `bd412d1` | 先提交官方弹窗/名单/导出、社团异步失败oracle |
| UI | `613f897` | 官方命令owner、请求代际、弹窗/赛事生命周期、导出取消及扩展回归 |
| UI | `af6b82d` | 社团单飞、409恢复、差异PATCH、快照失效、页面key、上传/卸载及回归 |
| API | `0be480b` | 先提交保存/发布响应竞争失败oracle |
| API | `ed9c2bd` | 创建/保存/状态命令快照、严格创建重放、4个DB oracle、HTTP回归、现有模块文档/规则 |

后续文档提交仅记录本报告、已有UI文档/规则和API安全影响附件；最终文档HEAD以交付时 `git log` 为准，不在文档中猜测自身提交SHA。全部在同名第五轮分支。主账号实际核验 `proffitteoy`，提交作者/邮箱保持仓库原配置；没有使用AI小号、切换GitHub认证或执行远端写入。

本轮主要源码为UI `src/hooks/use-official-award-{command,list,export}.ts`、两个官方弹窗/名单页、三个clubs-admin组件与三个社团页面；API仅社团repository/service。未改公共http-client、认证、上传API、官方获奖API、DB schema或安全checker。

## 7. 第三、第四轮交叉影响

其它轮尚未集成，以下是按当前文件/契约识别的交叉，不推测其完成状态：

| 轮次 | 交叉边界 | 集成要求 |
| --- | --- | --- |
| 第三轮 | `http-client`、`csrf-client`、错误/取消/重试、共享资源读取、BFF传输 | 保留响应body阶段与完成阶段的owner检查，不只依赖fetch抛AbortError；不得默认自动重试写命令/导出审计。社团使用HTTP409与VERSION_CONFLICT，最新版GET必须保留canEdit/revision |
| 第四轮 | 社团Schema/富文本/上传、repository/service、当前授权/安全policy、输入/列表上界 | 保留本次事务响应快照、revision/xmin与事务日志；差异PATCH必须继续支持省略未修改字段；新正文校验不得静默清空用户输入。22入口证据必须在最终闭包上重审，不能复用过时摘要 |
| 第三/四轮共有 | 官方名单DTO、成员/老师稳定ID、客户端生命周期测试harness、AGENTS规则表与文档 | 不回退三方更正命令、不因重命名或抽取删除时序oracle；组合两边AGENTS/docs改动，保留第一轮规则。API/Web锁定的Next小版本不同，分别冻结验证 |

## 8. 第六轮直接集成清单

1. 以两仓各自第一轮base建立最终集成分支；按各仓先oracle后修复的顺序集成上述提交和文档提交，保护其它轮worktree与未提交工作，不重复cherry-pick公共祖先。
2. 将UI社团恢复与API创建重放/命令快照作为一个跨仓验收单元；核对 `commandId === content.id`、revision字段、GET canEdit与差异PATCH合同。官方owner/list/export修改可独立审查，但不能漏测试或页面key。
3. 合入第三/第四轮相关边界治理后处理API附件22入口当前安全证据；不要改baseline刷绿。重新审阅每个HTTP method、可达机制与负向测试，`security:check`绿色才解除本轮记录的安全集成门槛。
4. 运行两仓framework、lint/typecheck、完整测试/build，UI37项定向、API123项DB和最终精确配对构建的74项HTTP。Linux补跑既有bash/symlink用例，不能以Windows环境失败归零代替验证。
5. 运行本地浏览器脚本或最终真实受控环境复验：慢请求切记录/赛事、取消导出、409读取失败再读、正文双边改动核对、发布失败后改稿、创建响应丢失、核对后再次并发。真机IME/实际S3另留证据。
6. 复核安全扫描、CI与最终兼容性后才进入用户授权的发布流程；本轮没有执行任何推送、合并或部署。

本地证据总目录为工作区 `.tools/round5-*`。Chrome脚本、构建fixture、截图与日志在 `.tools/round5-browser/`；浏览器fixture仅是验证工具，不是新增产品页面。API安全附件随API分支交付。本报告也复制到工作区 `.audit/round5-async-report.md`，作为第六轮跨仓入口。
