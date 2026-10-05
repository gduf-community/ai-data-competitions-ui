"use client";

import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

import { fetchClientSessionUser } from "@/lib/auth/client-session";
import {
  markNoticeRead,
  replaceReadNoticeIdsFromServer,
  isNoticeRead,
} from "@/lib/notice-read-state";
import { formatNoticeDate } from "@/lib/notice-format";
import { getSafeStorageItem, setSafeStorageItem } from "@/lib/safe-storage";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "dismissed_notice_popups";

interface PublishedNoticeItem {
  id: string;
  title: string;
  content: string;
  priority: "normal" | "important" | "critical";
  allowPopup: boolean;
  publishedAt: string;
  expiresAt: string | null;
}

function getDismissedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(getSafeStorageItem(DISMISSED_KEY, "session") || "[]");
  } catch {
    return [];
  }
}

function dismissNotice(id: string) {
  const dismissed = getDismissedIds();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    setSafeStorageItem(DISMISSED_KEY, JSON.stringify(dismissed), "session");
  }
}

function toPlainText(content: string) {
  return content
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getPopupNotice(
  notices: PublishedNoticeItem[],
  userId: string | null,
): PublishedNoticeItem | null {
  const dismissed = getDismissedIds();
  const now = new Date();

  return (
    notices.find(
      (notice) =>
        notice.allowPopup &&
        (notice.priority === "important" || notice.priority === "critical") &&
        !dismissed.includes(notice.id) &&
        !isNoticeRead(notice.id, userId) &&
        (notice.expiresAt ? new Date(notice.expiresAt) > now : true),
    ) ?? null
  );
}

export function NoticePopup() {
  const [notice, setNotice] = useState<PublishedNoticeItem | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [sessionUser, noticesResponse, readResponse] = await Promise.all([
            fetchClientSessionUser(),
            fetch("/api/notices/published?limit=20", { cache: "no-store" }).catch(
              () => null,
            ),
            fetch("/api/me/notices/read", { cache: "no-store" }).catch(() => null),
          ]);
          if (!active) return;

          const currentUserId = sessionUser?.id ?? null;
          setUserId(currentUserId);
          if (currentUserId && readResponse?.ok) {
            const readPayload = (await readResponse.json()) as { noticeIds?: string[] };
            replaceReadNoticeIdsFromServer(
              readPayload.noticeIds ?? [],
              currentUserId,
            );
          }

          if (!noticesResponse?.ok) {
            setNotice(null);
            return;
          }
          const payload = (await noticesResponse.json()) as {
            notices?: PublishedNoticeItem[];
          };
          const list = payload.notices ?? [];
          setNotice(getPopupNotice(list, currentUserId));
        } catch {
          if (!active) return;
          setNotice(null);
        }
      })();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, []);

  if (!notice) return null;

  function handleClose() {
    if (!notice) return;
    dismissNotice(notice.id);
    markNoticeRead(notice.id, userId);
    setNotice(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          aria-label="关闭"
        >
          <X className="size-5" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-amber-100">
            <Megaphone className="size-5 text-amber-700" />
          </div>
          <div>
            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
              {notice.priority === "critical" ? "紧急通知" : "重要通知"}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatNoticeDate(notice.publishedAt)}
            </p>
          </div>
        </div>

        <h2 className="mb-2 text-lg font-semibold text-slate-900">
          {notice.title}
        </h2>
        <p className="text-sm leading-6 text-slate-600">{toPlainText(notice.content)}</p>

        <div className="mt-5 flex justify-end">
          <Button size="sm" onClick={handleClose}>
            我知道了
          </Button>
        </div>
      </div>
    </div>
  );
}
