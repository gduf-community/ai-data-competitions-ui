"use client";

import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { SecurityEventTable } from "@/components/security/security-event-table";
import { Button } from "@/components/ui/button";

export default function AdminSecurityEventsPage() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <PageHeader
        eyebrow="安全中心"
        title="事件列表"
        description="集中查看策略拦截、后台异常、登录风险和浏览器探针等事件。"
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/security/actions">进入处置执行台</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/security/situation">查看访问态势</Link>
            </Button>
          </div>
        }
      />
      <SecurityEventTable />
    </div>
  );
}
