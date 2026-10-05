import { notFound } from "next/navigation";

import { ExperiencePostEditor } from "@/components/profile/experience-post-editor";
import { getMyExperiencePost } from "@/lib/web-data";

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditExperiencePostPage({
  params,
}: EditPageProps) {
  const { id } = await params;
  const post = await getMyExperiencePost(id);

  if (!post) {
    notFound();
  }

  if (post.status !== "draft" && post.status !== "offline") {
    notFound();
  }

  return (
    <ExperiencePostEditor
      postId={post.id}
      defaultValues={{
        title: post.title,
        competitionTitle: post.competitionTitle ?? "",
        awardLevel: post.awardLevel ?? "",
        content: post.content,
      }}
    />
  );
}
