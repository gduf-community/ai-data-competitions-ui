"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ClubListItem {
  slug: string;
  name: string;
  shortName: string | null;
}

























































































export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<ClubListItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/admin/clubs");
        const body = await res.json();
        if (!active) return;
        if (res.ok) {
          setClubs(body.data ?? []);
        } else {
          setClubs([]);
        }
      } catch {
        if (!active) return;
        setClubs([]);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);





  return (
    <div className="space-y-6 px-4 lg:px-6">
      <PageHeader
        eyebrow="业务管理"
        title="社团管理"
        description="管理社团基础信息、联系方式与社团管理员绑定关系。"
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/clubs/reviews">
              <ClipboardCheck className="mr-1 size-4" />
              内容审核队列
            </Link>
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : !clubs || clubs.length === 0 ? (
        <EmptyState
          title="暂无社团"
          description="社团列表来自系统固定配置，请联系超级管理员维护。"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <Link key={club.slug} href={`/admin/clubs/${club.slug}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardContent className="p-5">
                  <h3 className="truncate text-sm font-semibold">{club.name}</h3>
                  {club.shortName ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {club.shortName}
                    </p>
                  ) : null}
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    /clubs/{club.slug}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
