"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/i18n/toast";

import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { Button } from "@/components/ui/button";

interface ApplicationWithdrawButtonProps {
  applicationId: string;
}

export function ApplicationWithdrawButton({
  applicationId,
}: ApplicationWithdrawButtonProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleWithdraw() {
    setSubmitting(true);
    try {
      const res = await fetchWithCsrf(
        `/api/applications/${applicationId}/withdraw`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "撤回失败" }));
        throw new Error(err.message);
      }

      toast.success("报名已撤回");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤回失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void handleWithdraw()}
      disabled={submitting}
    >
      {submitting ? "撤回中..." : "撤回报名"}
    </Button>
  );
}
