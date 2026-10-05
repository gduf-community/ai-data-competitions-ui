"use client";

import { AuthStatusPanel } from "@/components/shared/auth-status-panel";

export function NotFoundError() {
  return (
    <AuthStatusPanel
      code="404"
      title="页面不存在"
      description="这个地址不在当前学院竞赛平台的有效路由内。模板演示页已经开始清理，后续只保留和竞赛门户、报名、审核相关的页面。"
      primaryHref="/"
      primaryLabel="返回首页"
      secondaryHref="/competitions"
      secondaryLabel="浏览比赛"
    />
  );
}
