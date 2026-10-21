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

export type SessionCapabilities = ReturnType<typeof getSessionCapabilities> & {
  canAccessClubManagement: boolean;
  canModerateClubContent: boolean;
  /**
   * 官方获奖名单的受限读取能力，按「当前有效 grant + 赛事范围」由 API 下发。
   * 缺失时按无权限处理（fail-closed），Web 不依据角色自行推导。
   */
  canReadOfficialAwards?: boolean;
};
