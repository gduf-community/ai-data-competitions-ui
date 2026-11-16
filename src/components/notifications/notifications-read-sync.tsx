"use client";

import { useEffect } from "react";

import { fetchClientSessionUser } from "@/lib/auth/client-session";
import { markNoticesRead } from "@/lib/notice-read-state";
import { requestJSON } from "@/lib/http-client";

interface NotificationsReadSyncProps {
  noticeIds: string[];
  userId?: string | null;
}

export function NotificationsReadSync({
  noticeIds,
  userId,
}: NotificationsReadSyncProps) {
  useEffect(() => {
    if (userId !== undefined) {
      if (userId) markNoticesRead(noticeIds, userId);
      return;
    }
    let active = true;
    // Identity is optional enhancement; public notice rendering never waits for it.
    void fetchClientSessionUser().then((user) => {
      if (active && user?.id) markNoticesRead(noticeIds, user.id);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [noticeIds, userId]);

  return null;
}

export function NoticeCompetitionLink({ noticeId }: { noticeId: string }) {
  const href = `/api/notices/${noticeId}/open`;
  return (
    <a
      href={href}
      className="text-primary hover:underline"
      onClick={() => {
        // Start before navigation and retain the request during page unload.
        // Telemetry failure must not prevent the user's original navigation.
        void requestJSON(href, { method: "POST", keepalive: true }).catch(() => undefined);
      }}
    >
      查看关联比赛
    </a>
  );
}
