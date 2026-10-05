"use client";

import { AuthStatusPanel } from "@/components/shared/auth-status-panel";

interface ForbiddenErrorProps {
  blockedIp?: string | null;
  blockedProvince?: string | null;
  blockedCity?: string | null;
  blockedPath?: string | null;
  policyBlocked?: boolean;
}

export function ForbiddenError({
  blockedIp,
  blockedProvince,
  blockedCity,
  blockedPath,
  policyBlocked = false,
}: ForbiddenErrorProps) {
  const regionText = [blockedProvince, blockedCity].filter(Boolean).join(" / ");

  return (
    <AuthStatusPanel
      code="403"
      title={policyBlocked ? "访问已被策略拦截" : "无权访问"}
      description={
        policyBlocked
          ? `当前请求 IP${blockedIp ? ` ${blockedIp}` : ""} 不满足访问策略，系统已拒绝继续访问。`
          : "你当前没有访问该页面或资源的权限。请确认账号角色、访问范围或联系管理员处理。"
      }
      details={
        policyBlocked ? (
          <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>当前线上策略仅允许白名单 IP 和广东省境内流量访问。</p>
            <p>命中 IP：{blockedIp ?? "未识别"}</p>
            <p>命中地区：{regionText || "未识别"}</p>
            <p>被拦截路径：{blockedPath ?? "当前页面"}</p>
          </div>
        ) : null
      }
      primaryHref="/"
      primaryLabel="返回首页"
      secondaryHref="/sign-in"
      secondaryLabel="前往登录"
    />
  );
}
