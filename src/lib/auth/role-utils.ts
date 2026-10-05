import type { UserRole } from "@/lib/types";

export type AssignableUserRole = Exclude<
  UserRole,
  "content_editor" | "club_admin"
>;

export const assignableUserRoles: AssignableUserRole[] = [
  "super_admin",
  "business_admin",
  "competition_admin",
  "analytics_viewer",
  "security_admin",
  "temporary_admin",
  "supervisor",
  "student_user",
];

export const roleLabelMap: Record<AssignableUserRole, string> = {
  super_admin: "超级管理员",
  business_admin: "业务管理员",
  competition_admin: "比赛管理员",
  analytics_viewer: "数据分析",
  security_admin: "安全权限",
  temporary_admin: "临时管理员",
  supervisor: "督导",
  student_user: "学生用户",
};

export const roleColorClassMap: Record<AssignableUserRole, string> = {
  super_admin: "border-rose-200 bg-rose-50 text-rose-700",
  business_admin: "border-orange-200 bg-orange-50 text-orange-700",
  competition_admin: "border-blue-200 bg-blue-50 text-blue-700",
  analytics_viewer: "border-cyan-200 bg-cyan-50 text-cyan-700",
  security_admin: "border-violet-200 bg-violet-50 text-violet-700",
  temporary_admin: "border-amber-200 bg-amber-50 text-amber-700",
  supervisor: "border-slate-200 bg-slate-50 text-slate-700",
  student_user: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const primaryRoleOrder: AssignableUserRole[] = [
  "super_admin",
  "temporary_admin",
  "business_admin",
  "competition_admin",
  "security_admin",
  "analytics_viewer",
  "supervisor",
  "student_user",
];

export function normalizeUserRole(role: UserRole): AssignableUserRole {
  if (role === "content_editor") {
    return "business_admin";
  }
  // 社团管理员是社团范围内的角色，其平台主角色视为学生用户。
  if (role === "club_admin") {
    return "student_user";
  }
  return role;
}

export function dedupeRoles(roles: UserRole[]) {
  return [...new Set(roles.map(normalizeUserRole))];
}

export function pickPrimaryRole(roles: UserRole[]) {
  const normalized = dedupeRoles(roles);
  for (const role of primaryRoleOrder) {
    if (normalized.includes(role)) {
      return role;
    }
  }
  return "student_user" as const;
}

export function getRoleLabel(role: UserRole) {
  return roleLabelMap[normalizeUserRole(role)];
}

export function getRoleColorClass(role: UserRole) {
  return roleColorClassMap[normalizeUserRole(role)];
}

export function isScopedCompetitionRole(role: UserRole) {
  return normalizeUserRole(role) === "competition_admin";
}

export function isTemporaryRole(role: UserRole) {
  return normalizeUserRole(role) === "temporary_admin";
}

export function describeRolePermissions(role: AssignableUserRole) {
  switch (role) {
    case "super_admin":
      return "全站读写，含系统配置、业务管理、安全中心和用户权限。";
    case "business_admin":
      return "可读写业务管理模块，并可查看全站后台页面。";
    case "competition_admin":
      return "可查看业务管理模块，并在授权比赛范围内读写比赛、报名、通知等内容。";
    case "analytics_viewer":
      return "只读数据看板与分析结果，不可修改业务数据。";
    case "security_admin":
      return "可访问并读写安全中心，同时可只读用户管理并执行用户删除。";
    case "temporary_admin":
      return "获得 6 小时超级管理员权限，到期后自动失效。";
    case "supervisor":
      return "后台只读，不可执行写操作。";
    case "student_user":
      return "学生端权限，不进入管理员工作台。";
  }
}
