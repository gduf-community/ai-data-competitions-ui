"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/toast";

import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { Button } from "@/components/ui/button";

interface ApplicationCancelButtonProps {
  applicationId: string;
  label?: string;
}

export function ApplicationCancelButton({
  applicationId,
  label = "取消报名",
}: ApplicationCancelButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleCancel() {
    setSubmitting(true);
    try {
      const res = await fetchWithCsrf(`/api/me/applications/${applicationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "撤销失败" }));
        throw new Error(err.message);
      }

      toast.success("报名记录已撤销");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤销失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      onClick={() => void handleCancel()}
      disabled={submitting}
    >
      {submitting ? "处理中..." : label}
    </Button>
  );
}
