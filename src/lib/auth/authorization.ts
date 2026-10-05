import type { UserRole } from "@/lib/types";

import { dedupeRoles, normalizeUserRole } from "@/lib/auth/role-utils";

export type RoleCarrier =
  | UserRole
  | UserRole[]
  | {
      role?: UserRole;
      roles?: UserRole[];
    };

function resolveRoles(input: RoleCarrier) {
  if (Array.isArray(input)) {
    return dedupeRoles(input);
  }

  if (typeof input === "string") {
    return [normalizeUserRole(input)];
  }

  const roles = input.roles?.length ? input.roles : input.role ? [input.role] : [];
  return dedupeRoles(roles);
}

export function hasRole(input: RoleCarrier, role: UserRole) {
  const normalizedRole = normalizeUserRole(role);
  return resolveRoles(input).includes(normalizedRole);
}

export function isSuperAdminRole(input: RoleCarrier) {
  return hasRole(input, "super_admin") || hasRole(input, "temporary_admin");
}

export function canAccessDashboard(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    [
      "super_admin",
      "temporary_admin",
      "business_admin",
      "competition_admin",
      "analytics_viewer",
      "security_admin",
      "supervisor",
    ].includes(role),
  );
}

// Preserve the current private user-file reader set independently of dashboard navigation.
export function canReadPrivateUserUploads(input: RoleCarrier) {
  return resolveRoles(input).some((role) => ["super_admin", "temporary_admin", "business_admin", "competition_admin", "analytics_viewer", "security_admin", "supervisor"].includes(role));
}

export function canReadAnalytics(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    [
      "super_admin",
      "temporary_admin",
      "business_admin",
      "competition_admin",
      "analytics_viewer",
      "supervisor",
    ].includes(role),
  );
}

export function hasGlobalDashboardScope(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    [
      "super_admin",
      "temporary_admin",
      "business_admin",
      "analytics_viewer",
      "security_admin",
      "supervisor",
    ].includes(role),
  );
}

export function canManageSecurityCenter(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    ["super_admin", "temporary_admin", "security_admin"].includes(role),
  );
}

export function canReadUserManagement(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    ["super_admin", "temporary_admin", "security_admin", "supervisor"].includes(role),
  );
}

export function canDeleteUsers(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    ["super_admin", "temporary_admin", "security_admin"].includes(role),
  );
}

export function canManageUserRoles(input: RoleCarrier) {
  return isSuperAdminRole(input);
}

export function isAdminRole(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    [
      "super_admin",
      "temporary_admin",
      "business_admin",
      "competition_admin",
    ].includes(role),
  );
}

export function isContentManagerRole(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    [
      "super_admin",
      "temporary_admin",
      "business_admin",
      "competition_admin",
    ].includes(role),
  );
}

export function canReadBusinessManagement(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    [
      "super_admin",
      "temporary_admin",
      "business_admin",
      "competition_admin",
      "supervisor",
    ].includes(role),
  );
}

export function canReadRestrictedContentManagement(input: RoleCarrier) {
  const roles = resolveRoles(input);
  return roles.some((role) =>
    ["super_admin", "temporary_admin", "supervisor"].includes(role),
  );
}
