"use client";

import { AuthStatusPanel } from "@/components/shared/auth-status-panel";

export function InternalServerError() {
  return (
    <AuthStatusPanel
      code="500"
      title="服务异常"
      description="页面已进入当前项目骨架，但后端接口、认证流程或服务端渲染逻辑仍未全部接入。请稍后重试，或先返回比赛门户查看公开信息。"
      primaryHref="/"
      primaryLabel="返回首页"
      secondaryHref="/competitions"
      secondaryLabel="查看比赛"
    />
  );
}
