import { PageHeader } from "@/components/shared/page-header";
import { MyAwardList } from "@/components/profile/my-award-list";
import { listMyAwards } from "@/lib/web-data";

export default async function MyAchievementsPage() {


  const awards = await listMyAwards();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="个人中心"
        title="我的成果"
        description="管理获奖证书并上传奖状图片。审核通过后，还需要管理员单独选择是否展示到首页作品墙。"
      />
      <MyAwardList awards={awards} />
    </div>
  );
}
