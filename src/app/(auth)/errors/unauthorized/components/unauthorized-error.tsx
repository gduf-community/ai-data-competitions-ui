"use client";

import { AuthStatusPanel } from "@/components/shared/auth-status-panel";

export function UnauthorizedError() {
  return (
    <AuthStatusPanel
      code="401"
      title="需要登录"
      description="你尚未完成身份验证，或当前登录状态已失效。第一阶段会先保留这套前端壳，后续再接学校统一认证和角色权限。"
      primaryHref="/sign-in"
      primaryLabel="前往登录"
      secondaryHref="/"
      secondaryLabel="返回首页"
    />
  );
}
