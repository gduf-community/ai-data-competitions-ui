import { PageHeader } from "@/components/shared/page-header";
import { ExperiencePostList } from "@/components/profile/experience-post-list";
import { listMyExperiencePosts } from "@/lib/web-data";

export default async function MyExperiencesPage() {


  const posts = await listMyExperiencePosts();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="个人中心"
        title="经验文章"
        description="经验文章与成果分开管理。文章只能由超级管理员发起邀请并绑定比赛，个人可继续编辑、提交、撤回或删除自己的文章。"
      />
      <ExperiencePostList posts={posts} />
    </div>
  );
}
