"use client";

import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { SecurityActionTable } from "@/components/security/security-action-table";
import { Button } from "@/components/ui/button";

export default function AdminSecurityActionsPage() {
  return (
    <div className="space-y-6 px-4 lg:px-6">
      <PageHeader
        eyebrow="安全中心"
        title="处置执行台"
        description="用按钮化流程完成创建、执行、回滚和回执追踪，减少直接理解动作编码的成本。"
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/security/events">查看事件列表</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link href="/admin/security/situation">查看访问态势</Link>
            </Button>
          </div>
        }
      />
      <SecurityActionTable />
    </div>
  );
}
