import {
  canAccessDashboard,
  canManageSecurityCenter,
  canManageUserRoles,
  canReadAnalytics,
  canReadBusinessManagement,
  canReadRestrictedContentManagement,
  canReadUserManagement,
  isAdminRole,
  type RoleCarrier,
} from "@/lib/auth/authorization";

export function getSessionCapabilities(user: RoleCarrier) {
  return {
    canAccessDashboard: canAccessDashboard(user),
    canReadAnalytics: canReadAnalytics(user),
    canReadBusinessManagement: canReadBusinessManagement(user),
    canReadRestrictedContentManagement:
      canReadRestrictedContentManagement(user),
    canReadUserManagement: canReadUserManagement(user),
    canManageUserRoles: canManageUserRoles(user),
    canManageSecurityCenter: canManageSecurityCenter(user),
    canManageCompetitions: isAdminRole(user),
  };
}

export type SessionCapabilities = ReturnType<typeof getSessionCapabilities>;
