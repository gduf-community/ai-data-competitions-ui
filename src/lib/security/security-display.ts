export const securitySeverityLabelMap: Record<string, string> = {
  info: "提示",
  low: "低",
  medium: "中",
  high: "高",
  critical: "严重",
};

export const securitySourceLabelMap: Record<string, string> = {
  admin: "管理员工作台",
  app: "应用服务",
  auth: "登录认证",
  client: "浏览器端",
  cloudflare: "边界防护",
  middleware: "访问策略",
  upload: "上传链路",
  waf: "规则引擎",
  application: "应用服务",
};

export const securityActionTypeLabelMap: Record<string, string> = {
  rate_limit_ip: "临时限制访问",
  block_ip: "立即封禁来源",
  allow_ip: "加入白名单",
  review_user: "转人工复核",
  observe_ip: "加入观察名单",
};

export const securityTargetTypeLabelMap: Record<string, string> = {
  ip: "IP 地址",
  user: "用户账号",
  session: "会话标识",
  path: "访问路径",
};

export const securityActionStatusLabelMap: Record<string, string> = {
  pending: "待执行",
  executing: "执行中",
  success: "已执行",
  failed: "执行失败",
  expired: "已过期",
  rolled_back: "已回滚",
};

export const securityEventTypeLabelMap: Record<string, string> = {
  "auth.login.success": "登录成功",
  "auth.login.failed": "登录失败",
  "security.action.confirmation_required": "敏感动作二次确认",
  "security.action.executed": "安全动作已执行",
  "security.action.rollback": "安全动作已回滚",
  "security.alert.ack": "安全告警已确认",
  "security.client.devtools_detected": "检测到浏览器调试行为",
  "security.client.sensitive_action_debug_context": "敏感动作存在调试上下文",
  "security.proxy.blocked": "访问策略已拦截",
  "security.ui.load_failed": "后台页面加载失败",
  "security.ui.action_failed": "后台动作执行失败",
  view_competition_list: "查看赛事列表",
  view_competition_detail: "查看赛事详情",
  click_register_button: "点击报名按钮",
  click_competition_register: "点击赛事报名入口",
  view_notification: "查看通知",
  click_notification_competition: "点击通知内赛事入口",
  submit_registration: "提交报名",
  registration_approved: "报名审核通过",
  view_admin_analytics: "查看数据看板",
};

export const situationReasonLabelMap: Record<string, string> = {
  local_environment_allow: "本地调试环境放行",
  admin_bypass_allow: "管理员账号放行",
  province_allow: "省内来源放行",
  ip_whitelist_allow: "白名单来源放行",
  unknown_region_allow: "未知地区暂时放行",
  province_blocked: "非省内来源且不在白名单内，按策略拦截",
  unknown_region_blocked: "来源地区无法识别且不在白名单内，按策略拦截",
};

export const situationRiskLevelLabelMap: Record<string, string> = {
  low: "低风险",
  medium: "中风险",
  high: "高风险",
  critical: "严重风险",
};

export function getSecuritySeverityLabel(value: string) {
  return securitySeverityLabelMap[value] ?? "未分级";
}

export function getSecuritySourceLabel(value: string) {
  return securitySourceLabelMap[value] ?? "未归类来源";
}

export function getSecurityActionTypeLabel(value: string) {
  return securityActionTypeLabelMap[value] ?? "未归类处置";
}

export function getSecurityTargetTypeLabel(value: string) {
  return securityTargetTypeLabelMap[value] ?? "未归类目标";
}

export function getSecurityActionStatusLabel(value: string) {
  return securityActionStatusLabelMap[value] ?? "状态待确认";
}

export function getSecurityEventTypeLabel(value: string) {
  if (securityEventTypeLabelMap[value]) {
    return securityEventTypeLabelMap[value];
  }
  if (value.startsWith("security.action.")) return "安全动作流转";
  if (value.startsWith("security.alert.")) return "安全告警流转";
  if (value.startsWith("security.client.")) return "浏览器安全探针";
  if (value.startsWith("auth.login.")) return "登录认证事件";
  if (value.startsWith("view_")) return "页面浏览事件";
  if (value.startsWith("click_")) return "点击行为事件";
  return "未归类事件";
}

export function getSituationReasonLabel(value: string | null | undefined) {
  if (!value) return "未记录命中原因";
  return situationReasonLabelMap[value] ?? "命中访问策略";
}

export function getSituationRiskLevelLabel(value: string) {
  return situationRiskLevelLabelMap[value] ?? "待评估";
}
