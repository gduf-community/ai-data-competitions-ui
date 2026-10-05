import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Award, BookOpen } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getPublicProfile } from "@/lib/web-data";

interface ProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfile(id);

  if (!profile) {
    notFound();
  }

  const initial = profile.name.charAt(0);

  return (
    <div className="space-y-10">
      <Link
        href="/hall-of-fame"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        返回名人堂
      </Link>

      <Card className="border-slate-200/70 bg-white/92 shadow-sm">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center sm:flex-row sm:text-left">
          <Avatar className="size-24 shrink-0 border border-slate-200/70">
            <AvatarImage
              src={profile.image ?? undefined}
              alt={`${profile.name} 头像`}
              className="object-cover"
            />
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-200 text-3xl font-bold text-indigo-700">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">
              {profile.name}
            </h1>
            <p className="text-sm text-slate-500">{profile.college}</p>
            <Badge
              variant="secondary"
              className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
            >
              <Award className="mr-1 size-3" />
              {profile.hallOfFame.tag}
            </Badge>
            <p className="max-w-lg text-sm leading-6 text-slate-600">
              {profile.hallOfFame.bio}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <BookOpen className="size-5 text-slate-700" />
          <h2 className="text-lg font-semibold text-slate-950">经验展示</h2>
        </div>

        {profile.experiencePosts.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {profile.experiencePosts.map((post) => (
              <Link
                key={post.id}
                href={`/profile/${profile.id}/experiences/${post.id}`}
                className="block"
              >
                <Card className="h-full border-slate-200/70 bg-white/92 shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-col gap-3 p-5">
                    <h3 className="text-base font-semibold text-slate-950">
                      {post.title}
                    </h3>
                    {post.awardLevel && (
                      <Badge
                        variant="secondary"
                        className="w-fit rounded-full bg-blue-50 text-blue-700 hover:bg-blue-50"
                      >
                        {post.awardLevel}
                      </Badge>
                    )}
                    {post.competitionTitle && (
                      <p className="text-sm text-slate-500">
                        {post.competitionTitle}
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      发布于 {post.publishedAt}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-slate-300 bg-white/86">
            <CardContent className="p-8 text-center">
              <p className="text-sm text-slate-500">暂无经验文章</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
