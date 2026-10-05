"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/toast";

import type { ApplicationRecord } from "@/lib/types";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { ApplicationStatusTimeline } from "@/components/competitions/application-status-timeline";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ApplicationListProps {
  applications: ApplicationRecord[];
}

export function ApplicationList({ applications }: ApplicationListProps) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetchWithCsrf(`/api/me/applications/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "删除失败" }));
        throw new Error(err.message);
      }

      toast.success("报名记录已删除");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {applications.map((application) => (
        <div key={application.id} className="relative group">
          <ApplicationStatusTimeline application={application} />
          {!application.readOnly ? (
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 size-8 opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={deletingId === application.id}
              onClick={() => void handleDelete(application.id)}
            >
              <Trash2 className="size-4 text-muted-foreground hover:text-destructive" />
            </Button>
          ) : null}
        </div>
      ))}
    </div>
  );
}
