# WAF 规则集并入方案：安全中心页面原稿

> 归属整理：2026-10-16。原稿来自 API `docs/archive/plans/waf规则集并入方案.md`（`d9a789baed9f45ce033f97da5c627eb4cbcc8dee`）；[原始版本](https://github.com/gduf-community/competition-Q-A-website/blob/d9a789baed9f45ce033f97da5c627eb4cbcc8dee/docs/archive/plans/waf规则集并入方案.md)。本次保留研究正文、原日期、示例和阶段语义，仅调整归属及导航。原稿中的“本仓/当前/已完成”指原记录时点；不能据此推断今天的实现或验收。

本仓保存：第3–5章页面、事件与告警呈现；第7章动作列表和手动交互；第10章前端交互。规则、数据、接口、权限及动作执行器留在 API。原稿的动作清单不是当前可执行能力清单。

其余章节见 [API 配套原稿](https://github.com/gduf-community/competition-Q-A-website/blob/main/docs/archive/plans/waf规则集并入方案.md)。章节编号保留原稿，缺号表示对应内容在 API。

现行行为见[页面与流程](./../../页面结构与用户流程.md)、[HTTP 接口参考](./../../HTTP接口参考.md)和[测试与验收](./../../测试与验收.md)；设计与调研入口见[专题索引](./../../设计与调研.md)。SQL 查询台已删除，旧 Server Actions、Mock、全量前端搜索和发布步骤均不可直接作为现行实现依据。

---

<!-- source-lines: 134-386; sha256-lf: c6694b8ea43c59642661a0922839c77f82e5fdcd45c5129fe0b0cbcda889ac1e -->
# 三、后台页面设计

## 页面路径

```text
/admin/security
```

内部三个标签页：

```text
/admin/security?tab=events
/admin/security?tab=alerts
/admin/security?tab=actions
```

或者直接做三个子页面：

```text
/admin/security/events
/admin/security/alerts
/admin/security/actions
```

我建议用三个子页面，后期权限和数据加载更清楚。

---

# 四、事件列表设计

## 1. 页面功能

事件列表用于展示所有安全埋点事件。

表格字段：

```text
时间
事件类型
风险等级
来源
IP
用户
请求方法
路径
状态码
User-Agent
Request ID
详情
```

筛选条件：

```text
事件类型
风险等级
IP
用户 ID
路径
状态码
时间范围
来源 source
是否已生成告警
```

事件类型建议枚举：

```text
auth.login.success
auth.login.failed
auth.register.success
auth.register.failed
security.rate_limited
security.origin_rejected
security.permission_denied
security.upload_rejected
security.upload_failed
admin.user.updated
admin.competition.updated
api.error
request.suspicious_path
waf.rule_matched
```

风险等级：

```text
info
low
medium
high
critical
```

来源 source：

```text
app
middleware
auth
upload
admin
waf
cloudflare
```

---

## 2. 事件详情抽屉

点击一条事件，右侧弹出详情：

```text
基础信息
- event_id
- event_type
- source
- severity
- created_at

请求信息
- ip
- method
- path
- status
- user_agent
- origin
- referer
- request_id

用户信息
- user_id
- role
- session_id_hash

规则信息
- rule_id
- rule_name
- rule_message

原始数据
- metadata JSON
- raw JSON
```

注意：不要记录明文密码、Cookie、Authorization、完整 token。

---

# 五、告警中心设计

## 1. 告警中心的定位

告警中心展示的是 WAF 规则引擎识别出来的风险内容。

也就是说，告警不是一条原始日志，而是规则判断结果。

例如：

```text
事件：
10 分钟内 auth.login.failed 出现 23 次

告警：
疑似暴力破解登录
严重等级：high
影响对象：IP 1.2.3.4
建议动作：临时限制登录 30 分钟
```

---

## 2. 告警表格字段

```text
告警时间
告警类型
严重等级
状态
目标对象
触发规则
关联事件数
摘要
建议动作
最近发生时间
操作
```

状态：

```text
new        新告警
ack        已确认
resolved   已解决
ignored    已忽略
```

告警类型：

```text
brute_force_login
credential_stuffing
scanner_activity
suspicious_upload
permission_probe
csrf_probe
rate_limit_abuse
admin_anomaly
api_error_burst
waf_rule_burst
```

严重等级：

```text
low
medium
high
critical
```

---

## 3. 告警详情页

点击告警后展示：

```text
告警摘要
触发规则
风险解释
影响对象
关联事件时间线
证据列表
建议动作
当前处置状态
动作历史
```

示例：

```text
告警类型：brute_force_login
严重等级：high
影响对象：IP 1.2.3.4
触发规则：AUTH_LOGIN_FAIL_IP_BURST
规则条件：10 分钟内同一 IP 登录失败 >= 20
关联事件数：23
建议动作：限制该 IP 登录接口 30 分钟
```

---


<!-- source-lines: 491-567; sha256-lf: a5fce9986d1e9e0aa2566a7f07743dfc1454c7f9eb96254fd541d6f386fc5d7c -->
# 七、动作执行设计

动作执行必须是管理员手动控制。

## 1. 动作列表

动作执行页展示：

```text
动作时间
动作类型
目标对象
来源告警
执行状态
执行人
过期时间
原因
回执
操作
```

动作类型：

```text
block_ip
unblock_ip
rate_limit_ip
rate_limit_user
upload_ban_user
remove_upload_ban_user
mark_risk_user
unmark_risk_user
force_logout_user
ignore_alert
resolve_alert
```

状态：

```text
pending
executing
success
failed
expired
rolled_back
```

---

## 2. 手动执行流程

```text
管理员打开告警
 ↓
点击“创建处置动作”
 ↓
选择动作类型
 ↓
填写原因和 TTL
 ↓
确认执行
 ↓
写入 security_actions
 ↓
调用应用侧执行器
 ↓
写入 security_action_receipts
 ↓
更新动作状态
```

第一版不要做自动处置。\
即使告警等级是 critical，也只生成建议动作，由管理员确认。

---


<!-- source-lines: 897-987; sha256-lf: 686320717e21ababd6b4ce30542b827a83673c98270fa5df6d3eeef30dd85723 -->
# 十、前端交互设计

## 1. 安全中心首页

顶部放三张统计卡：

```text
今日安全事件数
未处理告警数
高危告警数
生效中的动作数
```

下方三个标签页：

```text
事件列表
告警中心
动作执行
```

---

## 2. 事件列表 Tab

组件：

```text
SecurityEventTable
SecurityEventFilter
SecurityEventDetailDrawer
```

主要操作：

```text
查看详情
复制 IP
复制 Request ID
查看关联告警
手动生成告警，后期可选
```

---

## 3. 告警中心 Tab

组件：

```text
SecurityAlertTable
SecurityAlertDetailDrawer
AlertEvidenceTimeline
SuggestedActionPanel
```

主要操作：

```text
确认告警
忽略告警
标记已解决
创建处置动作
查看关联事件
```

---

## 4. 动作执行 Tab

组件：

```text
SecurityActionTable
CreateSecurityActionDialog
ActionReceiptDrawer
RollbackActionButton
```

主要操作：

```text
创建动作
执行动作
回滚动作
查看回执
查看过期时间
```

---
