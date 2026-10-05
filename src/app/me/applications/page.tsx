import { ApplicationList } from "@/components/profile/application-list";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { getRoleLabel } from "@/lib/auth/role-utils";
import { getSessionUser } from "@/lib/web-session";
import { listApplicationsVisibleToUser } from "@/lib/web-data";

export default async function MyApplicationsPage() {
  const sessionUser = await getSessionUser();
  const applications = sessionUser.id
    ? await listApplicationsVisibleToUser()
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="个人中心"
        title="我的报名"
        description={`当前用户：${sessionUser.name}（${getRoleLabel(sessionUser.role)}）`}
      />
      {applications.length ? (
        <ApplicationList applications={applications} />
      ) : (
        <EmptyState
          title="还没有报名记录"
          description="先去赛事详情页提交报名，提交后会在这里展示审核状态。"
        />
      )}
    </div>
  );
}
