"use client";

import { useEffect, useState } from "react";

import { fetchClientSessionUser } from "@/lib/auth/client-session";
import {
  isNoticeRead,
  markNoticeRead,
  NOTICE_READ_EVENT,
} from "@/lib/notice-read-state";

/**
 * 通知中心逐条已读：打开页面不再自动把全部通知标为已读。
 * 未登录时不显示控件；已登录用户可手动标为已读。
 */
export function NoticeReadState({ noticeId }: { noticeId: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [read, setRead] = useState(true);

  useEffect(() => {
    let active = true;
    void fetchClientSessionUser()
      .then((user) => {
        if (!active) return;
        setUserId(user?.id ?? null);
        setRead(user ? isNoticeRead(noticeId, user.id) : true);
      })
      .catch(() => undefined);
    const refresh = () => {
      setRead((current) => {
        const next = userId ? isNoticeRead(noticeId, userId) : current;
        return next;
      });
    };
    window.addEventListener(NOTICE_READ_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(NOTICE_READ_EVENT, refresh);
    };
  }, [noticeId, userId]);

  if (!userId) return null;

  if (read) {
    return (
      <span className="text-xs text-muted-foreground" aria-label="已读通知">
        已读
      </span>
    );
  }

  return (
    <button
      type="button"
      className="text-xs text-primary hover:underline"
      onClick={() => {
        markNoticeRead(noticeId, userId);
        setRead(true);
      }}
    >
      标为已读
    </button>
  );
}
