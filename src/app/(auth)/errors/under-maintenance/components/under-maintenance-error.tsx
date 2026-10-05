"use client";

import { AuthStatusPanel } from "@/components/shared/auth-status-panel";

export function UnderMaintenanceError() {
  return (
    <AuthStatusPanel
      code="503"
      title="系统维护中"
      description="平台当前处于维护或升级阶段。你可以稍后再试；如果只是想查看公开比赛信息，仍可返回门户首页继续浏览。"
      primaryHref="/"
      primaryLabel="返回首页"
      secondaryHref="/competitions"
      secondaryLabel="查看比赛"
    />
  );
}
