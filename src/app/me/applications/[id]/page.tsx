import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, User, Users } from "lucide-react";

import { ApplicationCancelButton } from "@/components/competitions/application-cancel-button";
import { ApplicationWithdrawButton } from "@/components/competitions/application-withdraw-button";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/web-session";
import {
  getApplicationDetailForUser,
  listRegistrationAuditLogsByApplicationIds,
} from "@/lib/web-data";

interface PageProps {
  params: Promise<{ id: string }>;
}

const statusMeta: Record<string, { label: string; colorClass: string }> = {
  draft: {
    label: "草稿",
    colorClass: "border-slate-200 bg-slate-50 text-slate-600",
  },
  submitted: {
    label: "待审核",
    colorClass: "border-sky-200 bg-sky-50 text-sky-700",
  },
  approved: {
    label: "审核通过",
    colorClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  rejected: {
    label: "审核驳回",
    colorClass: "border-rose-200 bg-rose-50 text-rose-700",
  },
  withdrawn: {
    label: "已撤回",
    colorClass: "border-amber-200 bg-amber-50 text-amber-700",
  },
  cancelled: {
    label: "已取消",
    colorClass: "border-slate-200 bg-slate-100 text-slate-500",
  },
};

const actionLabel: Record<string, string> = {
  save_draft: "保存草稿",
  submit: "提交报名",
  resubmit: "重新提交",
  withdraw: "撤回报名",
  approve: "审核通过",
  reject: "审核驳回",
  cancel: "取消报名",
};

export default async function ApplicationDetailPage({ params }: PageProps) {
  const sessionUser = await getSessionUser();
  if (!sessionUser.id) {
    redirect("/sign-in?callbackUrl=/me/applications");
  }

  const { id } = await params;
  const application = await getApplicationDetailForUser(id);
  if (!application) {
    notFound();
  }

  const meta = statusMeta[application.status] ?? {
    label: application.status,
    colorClass: "border-border/70",
  };

  const logs = await listRegistrationAuditLogsByApplicationIds([id]);
  const modeLabel = application.mode === "team" ? "团队报名" : "个人报名";
  const canManage = !application.readOnly;
  const canEdit =
    canManage && ["rejected", "withdrawn"].includes(application.status);
  const canWithdraw =
    canManage && ["submitted", "approved", "rejected"].includes(application.status);
  const canCancel = canManage && ["draft", "withdrawn"].includes(application.status);
  const cancelLabel = ["withdrawn", "cancelled"].includes(application.status)
    ? "撤销记录"
    : "取消报名";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/me/applications">
            <ArrowLeft className="mr-1 size-4" />
            返回
          </Link>
        </Button>
        {canEdit ? (
          <>
            <Button variant="default" size="sm" asChild>
              <Link href={`/me/applications/${id}/edit`}>修改报名</Link>
            </Button>
          </>
        ) : null}
        {canWithdraw ? <ApplicationWithdrawButton applicationId={id} /> : null}
        {canCancel ? (
          <ApplicationCancelButton applicationId={id} label={cancelLabel} />
        ) : null}
        <PageHeader
          eyebrow="报名详情"
          title={application.competitionTitle}
          description={`${application.submittedAt} · ${modeLabel}`}
        />
      </div>

      {application.readOnly ? (
        <Card className="border-border/70 bg-muted/30">
          <CardContent className="py-4 text-sm text-muted-foreground">
            当前报名由队长提交，你作为组员仅可查看，不能修改、撤回或取消。
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <CardTitle>基本信息</CardTitle>
          <Badge variant="outline" className={meta.colorClass}>
            {meta.label}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">姓名</p>
              <p className="font-medium">{application.applicantName}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">学院</p>
              <p className="font-medium">{application.college}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">专业</p>
              <p className="font-medium">{application.major}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">年级</p>
              <p className="font-medium">{application.grade}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">审核人</p>
              <p className="font-medium">{application.reviewer}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">提交时间</p>
              <p className="font-medium">{application.submittedAt}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {application.statement ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>备注</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap leading-7">{application.statement}</p>
          </CardContent>
        </Card>
      ) : null}

      {application.selectedSubTrack ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>所选子赛道</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{application.selectedSubTrack}</p>
          </CardContent>
        </Card>
      ) : null}

      {application.mode === "team" ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>
              <Users className="mr-2 inline size-5" />
              团队信息
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {application.teamName ? (
              <div>
                <p className="text-xs text-muted-foreground">团队名称</p>
                <p className="font-medium">{application.teamName}</p>
              </div>
            ) : null}
            {application.teamMembers.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">队员列表（含队长）</p>
                {application.teamMembers.map((member, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <User className="size-4 text-muted-foreground" />
                      <span className="font-medium">{member.name}</span>
                      {index === 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          队长
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2 grid gap-2 text-sm md:grid-cols-3">
                      <div>
                        <span className="text-muted-foreground">学院：</span>
                        {member.college}
                      </div>
                      <div>
                        <span className="text-muted-foreground">专业：</span>
                        {member.major}
                      </div>
                      <div>
                        <span className="text-muted-foreground">年级：</span>
                        {member.grade}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {application.note ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>审核备注</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-7">{application.note}</p>
          </CardContent>
        </Card>
      ) : null}

      {logs.length > 0 ? (
        <Card className="border-border/70">
          <CardHeader>
            <CardTitle>状态记录</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative space-y-4 pl-6 before:absolute before:bottom-2 before:left-2.5 before:top-2 before:w-px before:bg-border">
              {logs.map((log, index) => (
                <div key={index} className="relative">
                  <div className="absolute -left-[18px] mt-1.5 size-3 rounded-full border-2 border-border bg-background" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {actionLabel[log.action] ?? log.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.createdAt} · {log.operatorName}
                    </p>
                    {log.comment ? (
                      <p className="text-sm text-muted-foreground">{log.comment}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
