"use client";

import { SecuritySituationDashboard } from "@/components/security/security-situation-dashboard";
import { PageHeader } from "@/components/shared/page-header";

export default function AdminSecuritySituationPage() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <PageHeader
        eyebrow="安全中心"
        title="态势感知"
        description="统一查看访问地图、风险事件、趋势波动和访问策略，页面时间按东八区展示。"
      />

      <SecuritySituationDashboard />
    </div>
  );
}
