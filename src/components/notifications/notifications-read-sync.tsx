"use client";

import { useEffect } from "react";

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
    if (!userId) return;
    markNoticesRead(noticeIds, userId);
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
