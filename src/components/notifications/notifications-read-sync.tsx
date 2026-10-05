"use client";

import { useEffect } from "react";

import { markNoticesRead } from "@/lib/notice-read-state";

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
