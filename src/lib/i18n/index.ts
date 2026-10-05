// 社团模块：club-errors.ts 默认错误信息 + 常用提示，统一登记以便 toast/tt() 翻译。
export const defaultLocale = "zh-CN" as const;

export const supportedLocales = ["zh-CN", "en-US"] as const;

export type AppLocale = (typeof supportedLocales)[number];

type MessageMap = {
  "zh-CN": string;
  "en-US": string;
};

const exactMessages: Record<string, MessageMap> = {
  "Forbidden.": {
    "zh-CN": "无权访问。",
    "en-US": "Forbidden.",
  },
  "Unauthorized.": {
    "zh-CN": "未登录或登录状态已失效。",
    "en-US": "Unauthorized.",
  },
  "Invalid request origin.": {
    "zh-CN": "请求来源不合法。",
    "en-US": "Invalid request origin.",
  },
  "登录成功": {
    "zh-CN": "登录成功",
    "en-US": "Signed in successfully.",
  },
  "登录失败": {
    "zh-CN": "登录失败",
    "en-US": "Sign-in failed.",
  },
  "邮箱或密码错误": {
    "zh-CN": "邮箱或密码错误",
    "en-US": "Incorrect email or password.",
  },
  "请输入有效的邮箱地址": {
    "zh-CN": "请输入有效的邮箱地址",
    "en-US": "Enter a valid email address.",
  },
  "密码至少需要8个字符": {
    "zh-CN": "密码至少需要8个字符",
    "en-US": "Password must be at least 8 characters.",
  },
  "密码至少需要 8 位": {
    "zh-CN": "密码至少需要 8 位",
    "en-US": "Password must be at least 8 characters.",
  },
  "密码需包含字母": {
    "zh-CN": "密码需包含字母",
    "en-US": "Password must include letters.",
  },
  "密码需包含数字": {
    "zh-CN": "密码需包含数字",
    "en-US": "Password must include numbers.",
  },
  "注册失败": {
    "zh-CN": "注册失败",
    "en-US": "Sign-up failed.",
  },
  "注册中...": {
    "zh-CN": "注册中...",
    "en-US": "Creating account...",
  },
  "注册": {
    "zh-CN": "注册",
    "en-US": "Sign up",
  },
  "注册成功，请登录": {
    "zh-CN": "注册成功，请登录",
    "en-US": "Account created. Please sign in.",
  },
  "注册成功，已自动登录": {
    "zh-CN": "注册成功，已自动登录",
    "en-US": "Account created and signed in automatically.",
  },
  "发送验证码失败": {
    "zh-CN": "发送验证码失败",
    "en-US": "Failed to send verification code.",
  },
  "验证码已发送": {
    "zh-CN": "验证码已发送",
    "en-US": "Verification code sent.",
  },
  "发送中...": {
    "zh-CN": "发送中...",
    "en-US": "Sending...",
  },
  "发送验证码": {
    "zh-CN": "发送验证码",
    "en-US": "Send code",
  },
  "请输入姓名": {
    "zh-CN": "请输入姓名",
    "en-US": "Enter your name.",
  },
  "请输入学院": {
    "zh-CN": "请输入学院",
    "en-US": "Enter your college.",
  },
  "请输入班级": {
    "zh-CN": "请输入班级",
    "en-US": "Enter your class.",
  },
  "请输入年级": {
    "zh-CN": "请输入年级",
    "en-US": "Enter your grade.",
  },
  "请输入有效邮箱": {
    "zh-CN": "请输入有效邮箱",
    "en-US": "Enter a valid email address.",
  },
  "请输入有效邮箱地址": {
    "zh-CN": "请输入有效邮箱地址",
    "en-US": "Enter a valid email address.",
  },
  "请输入 6 位邮箱验证码": {
    "zh-CN": "请输入 6 位邮箱验证码",
    "en-US": "Enter the 6-digit email verification code.",
  },
  "请再次输入密码": {
    "zh-CN": "请再次输入密码",
    "en-US": "Enter the password again.",
  },
  "请同意平台使用条款": {
    "zh-CN": "请同意平台使用条款",
    "en-US": "Accept the platform terms to continue.",
  },
  "两次输入的密码不一致": {
    "zh-CN": "两次输入的密码不一致",
    "en-US": "The two passwords do not match.",
  },
  "学号格式不正确（6-12位字母或数字）": {
    "zh-CN": "学号格式不正确（6-12位字母或数字）",
    "en-US": "Student ID format is invalid. Use 6-12 letters or digits.",
  },
  "请输入学号": {
    "zh-CN": "请输入学号",
    "en-US": "Enter your student ID.",
  },
  "请输入 6 位验证码": {
    "zh-CN": "请输入 6 位验证码",
    "en-US": "Enter the 6-digit verification code.",
  },
  "登录": {
    "zh-CN": "登录",
    "en-US": "Sign in",
  },
  "使用您的账号访问竞赛申报和管理平台": {
    "zh-CN": "使用您的账号访问竞赛申报和管理平台",
    "en-US": "Use your account to access the competition submission and management platform.",
  },
  "登录中...": {
    "zh-CN": "登录中...",
    "en-US": "Signing in...",
  },
  "忘记密码？": {
    "zh-CN": "忘记密码？",
    "en-US": "Forgot password?",
  },
  "还没有账号？": {
    "zh-CN": "还没有账号？",
    "en-US": "Don't have an account?",
  },
  "立即注册": {
    "zh-CN": "立即注册",
    "en-US": "Sign up now",
  },
  "注册账号": {
    "zh-CN": "注册账号",
    "en-US": "Create account",
  },
  "注册学生账号以提交和跟踪竞赛申报": {
    "zh-CN": "注册学生账号以提交和跟踪竞赛申报",
    "en-US": "Create a student account to submit and track competition applications.",
  },
  "姓名": {
    "zh-CN": "姓名",
    "en-US": "Name",
  },
  "学号": {
    "zh-CN": "学号",
    "en-US": "Student ID",
  },
  "学院": {
    "zh-CN": "学院",
    "en-US": "College",
  },
  "班级": {
    "zh-CN": "班级",
    "en-US": "Class",
  },
  "年级": {
    "zh-CN": "年级",
    "en-US": "Grade",
  },
  "邮箱": {
    "zh-CN": "邮箱",
    "en-US": "Email",
  },
  "邮箱验证码": {
    "zh-CN": "邮箱验证码",
    "en-US": "Email verification code",
  },
  "密码": {
    "zh-CN": "密码",
    "en-US": "Password",
  },
  "确认密码": {
    "zh-CN": "确认密码",
    "en-US": "Confirm password",
  },
  "如：2024级": {
    "zh-CN": "如：2024级",
    "en-US": "Example: Class of 2024",
  },
  "我确认提交的信息真实有效，并同意平台使用条款": {
    "zh-CN": "我确认提交的信息真实有效，并同意平台使用条款",
    "en-US": "I confirm the submitted information is accurate and agree to the platform terms.",
  },
  "已有账号？": {
    "zh-CN": "已有账号？",
    "en-US": "Already have an account?",
  },
  "立即登录": {
    "zh-CN": "立即登录",
    "en-US": "Sign in now",
  },
  "教师注册通道": {
    "zh-CN": "教师注册通道",
    "en-US": "Teacher sign-up",
  },
  "发送失败，请稍后重试。": {
    "zh-CN": "发送失败，请稍后重试。",
    "en-US": "Sending failed. Please try again later.",
  },
  "如果该邮箱已注册，我们已发送重置链接，请注意查收。": {
    "zh-CN": "如果该邮箱已注册，我们已发送重置链接，请注意查收。",
    "en-US": "If this email is registered, a reset link has been sent.",
  },
  "重置链接缺失或无效，请重新申请。": {
    "zh-CN": "重置链接缺失或无效，请重新申请。",
    "en-US": "The reset link is missing or invalid. Request a new one.",
  },
  "重置密码失败，请稍后再试。": {
    "zh-CN": "重置密码失败，请稍后再试。",
    "en-US": "Failed to reset password. Please try again later.",
  },
  "密码已重置，请重新登录。": {
    "zh-CN": "密码已重置，请重新登录。",
    "en-US": "Password reset. Please sign in again.",
  },
  "请输入内容": {
    "zh-CN": "请输入内容",
    "en-US": "Enter content.",
  },
  "当前浏览器暂不支持该编辑功能": {
    "zh-CN": "当前浏览器暂不支持该编辑功能",
    "en-US": "This browser does not support this editing feature.",
  },
  "请输入链接地址（https://...）": {
    "zh-CN": "请输入链接地址（https://...）",
    "en-US": "Enter the link URL (https://...).",
  },
  "仅支持 http、https 或 mailto 链接": {
    "zh-CN": "仅支持 http、https 或 mailto 链接",
    "en-US": "Only http, https, or mailto links are supported.",
  },
  "请输入队员姓名": {
    "zh-CN": "请输入队员姓名",
    "en-US": "Enter the team member's name.",
  },
  "请输入队长姓名": {
    "zh-CN": "请输入队长姓名",
    "en-US": "Enter the team leader's name.",
  },
  "请输入学院名称": {
    "zh-CN": "请输入学院名称",
    "en-US": "Enter the college name.",
  },
  "请输入专业名称": {
    "zh-CN": "请输入专业名称",
    "en-US": "Enter the major name.",
  },
  "如：2023 级": {
    "zh-CN": "如：2023 级",
    "en-US": "Example: Class of 2023",
  },
  "请选择子赛道（可选）": {
    "zh-CN": "请选择子赛道（可选）",
    "en-US": "Select a sub-track (optional).",
  },
  "暂不选择子赛道": {
    "zh-CN": "暂不选择子赛道",
    "en-US": "Do not select a sub-track for now",
  },
  "请输入团队名称": {
    "zh-CN": "请输入团队名称",
    "en-US": "Enter the team name.",
  },
  "请说明参赛动机、基础能力与项目方向。": {
    "zh-CN": "请说明参赛动机、基础能力与项目方向。",
    "en-US": "Describe your motivation, baseline skills, and project direction.",
  },
  "请输入有效学号": {
    "zh-CN": "请输入有效学号",
    "en-US": "Enter a valid student ID.",
  },
  "请输入专业": {
    "zh-CN": "请输入专业",
    "en-US": "Enter the major.",
  },
  "请输入有效手机号": {
    "zh-CN": "请输入有效手机号",
    "en-US": "Enter a valid phone number.",
  },
  "已恢复本地草稿": {
    "zh-CN": "已恢复本地草稿",
    "en-US": "Local draft restored.",
  },
  "当前浏览器不支持本地草稿暂存": {
    "zh-CN": "当前浏览器不支持本地草稿暂存",
    "en-US": "This browser does not support local draft saving.",
  },
  "草稿已暂存": {
    "zh-CN": "草稿已暂存",
    "en-US": "Draft saved locally.",
  },
  "本地草稿已清除": {
    "zh-CN": "本地草稿已清除",
    "en-US": "Local draft cleared.",
  },
  "没有可恢复的本地草稿": {
    "zh-CN": "没有可恢复的本地草稿",
    "en-US": "No local draft is available to restore.",
  },
  "草稿数据异常，已清除": {
    "zh-CN": "草稿数据异常，已清除",
    "en-US": "The draft data is corrupted and has been cleared.",
  },
  "团队报名必须填写团队名称": {
    "zh-CN": "团队报名必须填写团队名称",
    "en-US": "A team name is required for team registration.",
  },
  "操作失败": {
    "zh-CN": "操作失败",
    "en-US": "Operation failed.",
  },
  "已新增新的子赛项报名，原报名记录已保留。": {
    "zh-CN": "已新增新的子赛项报名，原报名记录已保留。",
    "en-US": "A new sub-track registration has been created, and the original record was kept.",
  },
  "报名信息修改成功，已提交审核。": {
    "zh-CN": "报名信息修改成功，已提交审核。",
    "en-US": "Registration updated and resubmitted for review.",
  },
  "报名提交成功": {
    "zh-CN": "报名提交成功",
    "en-US": "Registration submitted successfully.",
  },
  "修改报名信息": {
    "zh-CN": "修改报名信息",
    "en-US": "Edit registration",
  },
  "收集校内报名信息": {
    "zh-CN": "收集校内报名信息",
    "en-US": "Collect internal registration details",
  },
  "提交中...": {
    "zh-CN": "提交中...",
    "en-US": "Submitting...",
  },
  "保存修改": {
    "zh-CN": "保存修改",
    "en-US": "Save changes",
  },
  "提交报名": {
    "zh-CN": "提交报名",
    "en-US": "Submit registration",
  },
  "暂存草稿": {
    "zh-CN": "暂存草稿",
    "en-US": "Save draft",
  },
  "恢复草稿": {
    "zh-CN": "恢复草稿",
    "en-US": "Restore draft",
  },
  "清除草稿": {
    "zh-CN": "清除草稿",
    "en-US": "Clear draft",
  },
  "加载报名数据失败": {
    "zh-CN": "加载报名数据失败",
    "en-US": "Failed to load registrations.",
  },
  "请先选择单个比赛，再导出报名数据": {
    "zh-CN": "请先选择单个比赛，再导出报名数据",
    "en-US": "Select a single competition before exporting registrations.",
  },
  "导出将记录到审计日志，是否继续？": {
    "zh-CN": "导出将记录到审计日志，是否继续？",
    "en-US": "This export will be recorded in the audit log. Continue?",
  },
  "请先选择要处理的报名记录": {
    "zh-CN": "请先选择要处理的报名记录",
    "en-US": "Select the registration records to process first.",
  },
  "请输入批量处理备注": {
    "zh-CN": "请输入批量处理备注",
    "en-US": "Enter a note for the bulk action.",
  },
  "批量审核通过": {
    "zh-CN": "批量审核通过",
    "en-US": "Bulk approved",
  },
  "批量驳回，请补充材料": {
    "zh-CN": "批量驳回，请补充材料",
    "en-US": "Bulk rejected. Please provide additional materials.",
  },
  "批量取消报名": {
    "zh-CN": "批量取消报名",
    "en-US": "Bulk registration cancellation",
  },
  "批量处理失败": {
    "zh-CN": "批量处理失败",
    "en-US": "Bulk action failed.",
  },
  "按比赛、申请人、学院筛选": {
    "zh-CN": "按比赛、申请人、学院筛选",
    "en-US": "Filter by competition, applicant, or college",
  },
  "状态筛选": {
    "zh-CN": "状态筛选",
    "en-US": "Filter by status",
  },
  "比赛筛选": {
    "zh-CN": "比赛筛选",
    "en-US": "Filter by competition",
  },
  "搜索比赛、申请人或学院": {
    "zh-CN": "搜索比赛、申请人或学院",
    "en-US": "Search by competition, applicant, or college",
  },
  "暂无报名申请": {
    "zh-CN": "暂无报名申请",
    "en-US": "No registration applications yet.",
  },
  "加载比赛数据失败": {
    "zh-CN": "加载比赛数据失败",
    "en-US": "Failed to load competitions.",
  },
  "请填写所有必填字段": {
    "zh-CN": "请填写所有必填字段",
    "en-US": "Fill in all required fields.",
  },
  "所属年份需在 2000 到 2100 之间": {
    "zh-CN": "所属年份需在 2000 到 2100 之间",
    "en-US": "Competition year must be between 2000 and 2100.",
  },
  "团队报名比赛的每队最大人数不能小于 2": {
    "zh-CN": "团队报名比赛的每队最大人数不能小于 2",
    "en-US": "For team registration, max team size cannot be smaller than 2.",
  },
  "报名开始时间必须早于报名截止时间": {
    "zh-CN": "报名开始时间必须早于报名截止时间",
    "en-US": "Registration start time must be earlier than the registration deadline.",
  },
  "比赛开始时间必须早于比赛结束时间": {
    "zh-CN": "比赛开始时间必须早于比赛结束时间",
    "en-US": "Competition start time must be earlier than the end time.",
  },
  "保存比赛失败": {
    "zh-CN": "保存比赛失败",
    "en-US": "Failed to save competition.",
  },
  "比赛已更新": {
    "zh-CN": "比赛已更新",
    "en-US": "Competition updated.",
  },
  "比赛已创建": {
    "zh-CN": "比赛已创建",
    "en-US": "Competition created.",
  },
  "删除比赛失败": {
    "zh-CN": "删除比赛失败",
    "en-US": "Failed to delete competition.",
  },
  "比赛已删除": {
    "zh-CN": "比赛已删除",
    "en-US": "Competition deleted.",
  },
  "如：学院楼B201": {
    "zh-CN": "如：学院楼B201",
    "en-US": "Example: College Building B201",
  },
  "直接复用通知富文本样板，支持段落、列表、链接和空行。": {
    "zh-CN": "直接复用通知富文本样板，支持段落、列表、链接和空行。",
    "en-US": "Reuse the notice rich-text editor with paragraphs, lists, links, and blank lines.",
  },
  "详细描述比赛要求、评审标准、奖项设置等...": {
    "zh-CN": "详细描述比赛要求、评审标准、奖项设置等...",
    "en-US": "Describe requirements, judging criteria, awards, and more...",
  },
  "如：国家级 · A类": {
    "zh-CN": "如：国家级 · A类",
    "en-US": "Example: National Level · Class A",
  },
  "输入子赛道后按回车添加，如：视觉导航": {
    "zh-CN": "输入子赛道后按回车添加，如：视觉导航",
    "en-US": "Type a sub-track and press Enter to add it, for example: Visual Navigation",
  },
  "https://": {
    "zh-CN": "https://",
    "en-US": "https://",
  },
  "https://mp.weixin.qq.com/...": {
    "zh-CN": "https://mp.weixin.qq.com/...",
    "en-US": "https://mp.weixin.qq.com/...",
  },
  "如：官网报名并填写资料": {
    "zh-CN": "如：官网报名并填写资料",
    "en-US": "Example: Register on the official site and fill in profile details",
  },
  "阶段名（如：初赛）": {
    "zh-CN": "阶段名（如：初赛）",
    "en-US": "Stage name (for example: Preliminary Round)",
  },
  "日期（如：2025-03-15）": {
    "zh-CN": "日期（如：2025-03-15）",
    "en-US": "Date (for example: 2025-03-15)",
  },
  "说明": {
    "zh-CN": "说明",
    "en-US": "Description",
  },
  "问题": {
    "zh-CN": "问题",
    "en-US": "Question",
  },
  "答案": {
    "zh-CN": "答案",
    "en-US": "Answer",
  },
  "附件名称（如：报名表模板）": {
    "zh-CN": "附件名称（如：报名表模板）",
    "en-US": "Attachment name (for example: Registration Form Template)",
  },
  "按比赛标题、分类或院系搜索": {
    "zh-CN": "按比赛标题、分类或院系搜索",
    "en-US": "Search by competition title, category, or department",
  },
  "比赛数据加载中...": {
    "zh-CN": "比赛数据加载中...",
    "en-US": "Loading competitions...",
  },
  "暂无比赛记录": {
    "zh-CN": "暂无比赛记录",
    "en-US": "No competition records yet.",
  },
  "加载通知失败": {
    "zh-CN": "加载通知失败",
    "en-US": "Failed to load notices.",
  },
  "草稿已暂存到本地浏览器": {
    "zh-CN": "草稿已暂存到本地浏览器",
    "en-US": "Draft saved to local browser storage.",
  },
  "没有可恢复的草稿": {
    "zh-CN": "没有可恢复的草稿",
    "en-US": "No draft is available to restore.",
  },
  "草稿已恢复": {
    "zh-CN": "草稿已恢复",
    "en-US": "Draft restored.",
  },
  "草稿内容损坏，恢复失败": {
    "zh-CN": "草稿内容损坏，恢复失败",
    "en-US": "The draft content is corrupted and could not be restored.",
  },
  "请选择归属比赛或全站通知": {
    "zh-CN": "请选择归属比赛或全站通知",
    "en-US": "Select a competition scope or a site-wide notice.",
  },
  "通知标题至少 2 个字符": {
    "zh-CN": "通知标题至少 2 个字符",
    "en-US": "Notice title must be at least 2 characters.",
  },
  "通知内容至少 2 个字符": {
    "zh-CN": "通知内容至少 2 个字符",
    "en-US": "Notice content must be at least 2 characters.",
  },
  "保存通知失败": {
    "zh-CN": "保存通知失败",
    "en-US": "Failed to save notice.",
  },
  "通知已更新": {
    "zh-CN": "通知已更新",
    "en-US": "Notice updated.",
  },
  "通知已创建": {
    "zh-CN": "通知已创建",
    "en-US": "Notice created.",
  },
  "删除通知失败": {
    "zh-CN": "删除通知失败",
    "en-US": "Failed to delete notice.",
  },
  "通知已删除": {
    "zh-CN": "通知已删除",
    "en-US": "Notice deleted.",
  },
  "请选择比赛或全站通知": {
    "zh-CN": "请选择比赛或全站通知",
    "en-US": "Select a competition or site-wide notice",
  },
  "支持加粗、斜体、列表和链接": {
    "zh-CN": "支持加粗、斜体、列表和链接",
    "en-US": "Supports bold, italic, lists, and links",
  },
  "搜索通知标题或归属范围": {
    "zh-CN": "搜索通知标题或归属范围",
    "en-US": "Search notice titles or scopes",
  },
  "加载通知中...": {
    "zh-CN": "加载通知中...",
    "en-US": "Loading notices...",
  },
  "暂无通知记录": {
    "zh-CN": "暂无通知记录",
    "en-US": "No notice records yet.",
  },
  "加载用户数据失败": {
    "zh-CN": "加载用户数据失败",
    "en-US": "Failed to load users.",
  },
  "比赛管理员必须至少指定一个比赛作用域": {
    "zh-CN": "比赛管理员必须至少指定一个比赛作用域",
    "en-US": "Competition admins must be assigned at least one competition scope.",
  },
  "更新用户失败": {
    "zh-CN": "更新用户失败",
    "en-US": "Failed to update user.",
  },
  "用户信息已更新": {
    "zh-CN": "用户信息已更新",
    "en-US": "User updated.",
  },
  "删除用户失败": {
    "zh-CN": "删除用户失败",
    "en-US": "Failed to delete user.",
  },
  "用户已删除": {
    "zh-CN": "用户已删除",
    "en-US": "User deleted.",
  },
  "请至少选择一个比赛": {
    "zh-CN": "请至少选择一个比赛",
    "en-US": "Select at least one competition.",
  },
  "按姓名、脱敏邮箱、院系、状态或权限搜索": {
    "zh-CN": "按姓名、脱敏邮箱、院系、状态或权限搜索",
    "en-US": "Search by name, masked email, department, status, or role",
  },
  "用户数据加载中...": {
    "zh-CN": "用户数据加载中...",
    "en-US": "Loading users...",
  },
  "暂无用户记录": {
    "zh-CN": "暂无用户记录",
    "en-US": "No user records yet.",
  },
  "读取动作失败": {
    "zh-CN": "读取动作失败",
    "en-US": "Failed to load actions.",
  },
  "读取动作详情失败": {
    "zh-CN": "读取动作详情失败",
    "en-US": "Failed to load action details.",
  },
  "请填写处置目标。": {
    "zh-CN": "请填写处置目标。",
    "en-US": "Enter the action target.",
  },
  "请填写处置原因。": {
    "zh-CN": "请填写处置原因。",
    "en-US": "Enter the action reason.",
  },
  "创建动作失败": {
    "zh-CN": "创建动作失败",
    "en-US": "Failed to create action.",
  },
  "处置动作已创建。": {
    "zh-CN": "处置动作已创建。",
    "en-US": "Action created.",
  },
  "执行失败": {
    "zh-CN": "执行失败",
    "en-US": "Execution failed.",
  },
  "处置动作已执行。": {
    "zh-CN": "处置动作已执行。",
    "en-US": "Action executed.",
  },
  "回滚失败": {
    "zh-CN": "回滚失败",
    "en-US": "Rollback failed.",
  },
  "处置动作已回滚。": {
    "zh-CN": "处置动作已回滚。",
    "en-US": "Action rolled back.",
  },
  "用于回溯是哪条告警触发了本次处置": {
    "zh-CN": "用于回溯是哪条告警触发了本次处置",
    "en-US": "Used to trace which alert triggered this action",
  },
  "例如具体 IP、用户账号或访问路径": {
    "zh-CN": "例如具体 IP、用户账号或访问路径",
    "en-US": "For example: a specific IP, user account, or access path",
  },
  "例如 1800 表示 30 分钟": {
    "zh-CN": "例如 1800 表示 30 分钟",
    "en-US": "For example, 1800 means 30 minutes",
  },
  "说明为什么要执行这次处置，便于后续审计和回滚。": {
    "zh-CN": "说明为什么要执行这次处置，便于后续审计和回滚。",
    "en-US": "Explain why this action is needed for future auditing and rollback.",
  },
  // 社团模块：club-errors.ts 默认错误信息 + 常用提示，统一登记以便 toast/tt() 翻译。
  // 社团内容标签页标题
  "招新信息": {
    "zh-CN": "招新信息",
    "en-US": "Recruitment"
  },
  "近期活动": {
    "zh-CN": "近期活动",
    "en-US": "Recent Activities"
  },
  "社团公告": {
    "zh-CN": "社团公告",
    "en-US": "Announcements"
  },
  "往期活动": {
    "zh-CN": "往期活动",
    "en-US": "Past Events"
  },
  "请先登录。": {
    "zh-CN": "请先登录。",
    "en-US": "Please sign in first.",
  },
  "无权执行该操作。": {
    "zh-CN": "无权执行该操作。",
    "en-US": "You do not have permission to perform this action.",
  },
  "资源不存在。": {
    "zh-CN": "资源不存在。",
    "en-US": "The resource does not exist.",
  },
  "内容状态已变更，请刷新后重试。": {
    "zh-CN": "内容状态已变更，请刷新后重试。",
    "en-US": "The content status has changed. Please refresh and try again.",
  },
  "无权管理该社团内容。": {
    "zh-CN": "无权管理该社团内容。",
    "en-US": "You do not have permission to manage this club's content.",
  },
  "当前角色无权审核社团内容。": {
    "zh-CN": "当前角色无权审核社团内容。",
    "en-US": "Your current role cannot review club content.",
  },
  "当前角色无权管理社团管理员。": {
    "zh-CN": "当前角色无权管理社团管理员。",
    "en-US": "Your current role cannot manage club admins.",
  },
  "内容不属于该社团。": {
    "zh-CN": "内容不属于该社团。",
    "en-US": "This content does not belong to this club.",
  },
  "当前状态不可编辑。": {
    "zh-CN": "当前状态不可编辑。",
    "en-US": "This content cannot be edited in its current status.",
  },
  "招新开始时间不能晚于结束时间。": {
    "zh-CN": "招新开始时间不能晚于结束时间。",
    "en-US": "The recruitment start time cannot be later than the end time.",
  },
  "活动开始时间不能晚于结束时间。": {
    "zh-CN": "活动开始时间不能晚于结束时间。",
    "en-US": "The event start time cannot be later than the end time.",
  },
  "没有可更新的字段。": {
    "zh-CN": "没有可更新的字段。",
    "en-US": "No fields to update.",
  },
  "社团功能尚未就绪，请联系管理员执行数据库迁移。": {
    "zh-CN": "社团功能尚未就绪，请联系管理员执行数据库迁移。",
    "en-US": "The club feature is not ready yet. Please ask an admin to run the database migration.",
  },
  "暂无招新信息": {
    "zh-CN": "暂无招新信息",
    "en-US": "No recruitment posts yet",
  },
  "请关注社团后续发布。": {
    "zh-CN": "请关注社团后续发布。",
    "en-US": "Check back for upcoming posts from this club.",
  },
  "暂无近期活动": {
    "zh-CN": "暂无近期活动",
    "en-US": "No upcoming activities yet",
  },
  "敬请期待。": {
    "zh-CN": "敬请期待。",
    "en-US": "Stay tuned.",
  },
  "暂无社团公告": {
    "zh-CN": "暂无社团公告",
    "en-US": "No announcements yet",
  },
  "社团发布公告后将在此展示。": {
    "zh-CN": "社团发布公告后将在此展示。",
    "en-US": "Announcements will appear here once the club publishes one.",
  },
  "暂无往期活动回顾": {
    "zh-CN": "暂无往期活动回顾",
    "en-US": "No past activity recaps yet",
  },
  "社团发布活动总结后将在此展示。": {
    "zh-CN": "社团发布活动总结后将在此展示。",
    "en-US": "Recaps will appear here once the club publishes one.",
  },
};

const patternMessages: Array<{
  pattern: RegExp;
  translate: (locale: AppLocale, match: RegExpMatchArray) => string;
}> = [
  {
    pattern: /^批量处理完成：(\d+) 条$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `批量处理完成：${match[1]} 条`
        : `Bulk action completed: ${match[1]} item(s).`,
  },
  {
    pattern: /^报名编号：(.+)$/,
    translate: (locale, match) =>
      locale === "zh-CN" ? `报名编号：${match[1]}` : `Registration ID: ${match[1]}`,
  },
  {
    pattern: /^新报名编号：(.+)$/,
    translate: (locale, match) =>
      locale === "zh-CN" ? `新报名编号：${match[1]}` : `New registration ID: ${match[1]}`,
  },
  {
    pattern: /^确认删除比赛「(.+)」吗？$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `确认删除比赛「${match[1]}」吗？`
        : `Delete competition "${match[1]}"?`,
  },
  {
    pattern: /^确认删除通知《(.+)》吗？$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `确认删除通知《${match[1]}》吗？`
        : `Delete notice "${match[1]}"?`,
  },
  {
    pattern:
      /^确定删除用户“(.+)”吗？这会清理该用户的报名、会话、日志和个人资料数据，且不可恢复。$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `确定删除用户“${match[1]}”吗？这会清理该用户的报名、会话、日志和个人资料数据，且不可恢复。`
        : `Delete user "${match[1]}"? This will permanently remove the user's registrations, sessions, logs, and profile data.`,
  },
  {
    pattern: /^队伍总人数不能超过 (\d+) 人$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `队伍总人数不能超过 ${match[1]} 人`
        : `Total team size cannot exceed ${match[1]} member(s).`,
  },
  {
    pattern: /^亮点 #(\d+)$/,
    translate: (locale, match) =>
      locale === "zh-CN" ? `亮点 #${match[1]}` : `Highlight #${match[1]}`,
  },
  {
    pattern: /^问题 #(\d+)$/,
    translate: (locale, match) =>
      locale === "zh-CN" ? `问题 #${match[1]}` : `Question #${match[1]}`,
  },
  {
    pattern: /^检测到调试环境，敏感动作前必须输入“(.+)”。$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `检测到调试环境，敏感动作前必须输入“${match[1]}”。`
        : `Debug activity detected. Enter "${match[1]}" before performing sensitive actions.`,
  },
  {
    pattern: /^检测到当前环境存在调试行为。请输入“(.+)”以继续执行动作。$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `检测到当前环境存在调试行为。请输入“${match[1]}”以继续执行动作。`
        : `Debug activity detected in the current environment. Enter "${match[1]}" to continue.`,
  },
  {
    pattern: /^已选 (\d+) 条$/,
    translate: (locale, match) =>
      locale === "zh-CN" ? `已选 ${match[1]} 条` : `${match[1]} item(s) selected`,
  },
  {
    pattern: /^请输入“(.+)”后再继续$/,
    translate: (locale, match) =>
      locale === "zh-CN"
        ? `请输入“${match[1]}”后再继续`
        : `Enter "${match[1]}" to continue`,
  },
];

export function normalizeLocale(input?: string | null): AppLocale {
  if (!input) return defaultLocale;
  const value = input.toLowerCase();
  if (value.startsWith("en")) return "en-US";
  return "zh-CN";
}

export function getClientLocale(): AppLocale {
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement.lang;
    if (htmlLang) return normalizeLocale(htmlLang);
  }

  if (typeof navigator !== "undefined") {
    return normalizeLocale(navigator.language);
  }

  return defaultLocale;
}

export function translateText(
  value: string,
  locale: AppLocale = defaultLocale,
): string {
  const exact = exactMessages[value];
  if (exact) {
    return exact[locale];
  }

  for (const item of patternMessages) {
    const match = value.match(item.pattern);
    if (match) {
      return item.translate(locale, match);
    }
  }

  return value;
}
