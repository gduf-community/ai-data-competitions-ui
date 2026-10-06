"use client";

import { PageHeader } from "@/components/shared/page-header";
import { SecurityAlertTable } from "@/components/security/security-alert-table";

export default function AdminSecurityAlertsPage() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <PageHeader
        eyebrow="安全中心"
        title="告警中心"
        description="按规则引擎聚合安全事件，辅助管理员研判风险。"
      />
      <SecurityAlertTable />
    </div>
  );
}
