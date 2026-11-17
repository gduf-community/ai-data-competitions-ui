"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

/** One in-flight command belongs to one open award. Cancellation does not undo a server write. */
export function useOfficialAwardCommand(awardId: string | undefined) {
  const requestRef = useRef<AbortController | null>(null);
  const [pending, setPending] = useState<{ awardId: string; controller: AbortController } | null>(null);

  // Invalidate before the next record is interactive, rather than after paint.
  useLayoutEffect(() => () => {
    requestRef.current?.abort();
    requestRef.current = null;
  }, [awardId]);

  const submit = async (command: {
    url: string;
    method: "PATCH" | "POST";
    payload: unknown;
    successMessage: string;
    conflictMessage: string;
    failureMessage: string;
    onConflict: () => void;
    onSubmitted: () => void;
  }) => {
    // State alone cannot reject two callbacks before React commits the next render.
    if (!awardId || requestRef.current) return;
    const controller = new AbortController();
    requestRef.current = controller;
    setPending({ awardId, controller });
    const current = () => requestRef.current === controller && !controller.signal.aborted;
    try {
      const response = await fetchWithCsrf(command.url, {
        method: command.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command.payload),
        signal: controller.signal,
      });
      if (!current()) return;
      if (response.status === 409) {
        command.onConflict();
        toast.error(command.conflictMessage);
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `${command.failureMessage}（HTTP ${response.status}）`);
      }
      toast.success(command.successMessage);
      command.onSubmitted();
    } catch (cause) {
      if (current()) toast.error(cause instanceof Error ? cause.message : command.failureMessage);
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null;
        setPending(null);
      }
    }
  };

  return { submitting: pending?.awardId === awardId && Boolean(pending && !pending.controller.signal.aborted), submit };
}
