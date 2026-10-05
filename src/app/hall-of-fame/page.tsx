import Link from "next/link";
import { Award } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PortalNavbar } from "@/components/marketing/portal-navbar";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { getWebSession as auth } from "@/lib/web-session";
import { getHallOfFameEntries } from "@/lib/web-data";

export default async function HallOfFamePage() {
  const [session, entries] = await Promise.all([
    auth(),
    getHallOfFameEntries(),
  ]);

  const currentUser = session?.user
    ? {
        name: session.user.name ?? "未命名用户",
        role: session.user.role,
      }
    : null;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf8_38%,#f5f1e8_100%)]">
      <PortalNavbar currentUser={currentUser} />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <div className="space-y-8">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-950">名人堂</h1>
            <p className="text-sm text-slate-500">
              展示在各类竞赛中表现突出的同学，分享备赛经验与获奖心得。
            </p>
          </div>

          {entries.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry) => {
                const initial = entry.userName.charAt(0);
                return (
                  <Link
                    key={entry.id}
                    href={`/profile/${entry.userId}`}
                    className="block"
                  >
                    <Card className="h-full border-slate-200/70 bg-white/92 shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="flex flex-col items-center gap-4 p-6 text-center">
                        <Avatar className="size-20 border border-slate-200/70">
                          <AvatarImage
                            src={entry.userImage ?? undefined}
                            alt={`${entry.userName} 头像`}
                            className="object-cover"
                          />
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-indigo-200 text-2xl font-bold text-indigo-700">
                            {initial}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1.5">
                          <h3 className="text-base font-semibold text-slate-950">
                            {entry.userName}
                          </h3>
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-amber-50 text-amber-800 hover:bg-amber-50"
                          >
                            <Award className="mr-1 size-3" />
                            {entry.tag}
                          </Badge>
                        </div>
                        <p className="text-sm leading-6 text-slate-600">
                          {entry.bio}
                        </p>
                        <p className="text-xs text-slate-400">
                          {entry.college}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </main>
      <PortalFooter />
    </div>
  );
}
