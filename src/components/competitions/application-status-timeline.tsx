import Link from "next/link";
import { Ban, CheckCircle2, Clock3, FileWarning, RotateCcw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ApplicationRecord } from "@/lib/types";

const statusMeta = {
  submitted: {
    label: "待审核",
    icon: Clock3,
  },
  draft: {
    label: "草稿",
    icon: Clock3,
  },
  approved: {
    label: "审核通过",
    icon: CheckCircle2,
  },
  rejected: {
    label: "审核驳回",
    icon: FileWarning,
  },
  withdrawn: {
    label: "已撤回",
    icon: RotateCcw,
  },
  cancelled: {
    label: "已取消",
    icon: Ban,
  },
};

interface ApplicationStatusTimelineProps {
  application: ApplicationRecord;
}

export function ApplicationStatusTimeline({
  application,
}: ApplicationStatusTimelineProps) {
  const meta = statusMeta[application.status];
  const StatusIcon = meta.icon;
  const modeLabel = application.mode === "team" ? "团队报名" : "个人报名";

  return (
    <Link href={`/me/applications/${application.id}`} className="block transition-colors hover:opacity-80">
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-xl">{application.competitionTitle}</CardTitle>
            {application.readOnly ? (
              <Badge variant="secondary" className="w-fit text-xs">
                组员只读
              </Badge>
            ) : null}
            <p className="text-sm text-muted-foreground">
              提交时间：{application.submittedAt} · {modeLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted px-3 py-1 text-sm font-medium">
            <StatusIcon className="size-4 text-primary" />
            {meta.label}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <p className="text-muted-foreground">申请人</p>
              <p className="font-medium">{application.applicantName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">学院与专业</p>
              <p className="font-medium">
                {application.college} · {application.major}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">审核人</p>
              <p className="font-medium">{application.reviewer}</p>
            </div>
          </div>
          {application.note ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/50 p-4">
              <p className="text-muted-foreground">处理备注</p>
              <p className="mt-2 leading-7">{application.note}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}
