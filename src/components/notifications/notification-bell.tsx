"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";

import { fetchClientSessionUser } from "@/lib/auth/client-session";
import {
  getReadNoticeIds,
  markNoticeRead,
  replaceReadNoticeIdsFromServer,
  NOTICE_READ_EVENT,
} from "@/lib/notice-read-state";
import { formatNoticeDate } from "@/lib/notice-format";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PublishedNoticeItem {
  id: string;
  title: string;
  content: string;
  priority: "normal" | "important" | "critical";
  publishedAt: string;
}

function toPlainText(content: string) {
  return content
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);
  const [notices, setNotices] = useState<PublishedNoticeItem[]>([]);

  useEffect(() => {
    let active = true;
    const bootstrap = async () => {
      try {
        const [sessionUser, noticesResponse, readResponse] = await Promise.all([
          fetchClientSessionUser(),
          fetch("/api/notices/published?limit=20", { cache: "no-store" }).catch(
            () => null,
          ),
          fetch("/api/me/notices/read", { cache: "no-store" }).catch(() => null),
        ]);
        if (!active) return;

        setUserId(sessionUser?.id ?? null);
        if (sessionUser?.id && readResponse?.ok) {
          const readPayload = (await readResponse.json()) as { noticeIds?: string[] };
          replaceReadNoticeIdsFromServer(
            readPayload.noticeIds ?? [],
            sessionUser.id,
          );
        }

        if (!noticesResponse?.ok) {
          setNotices([]);
          return;
        }
        const payload = (await noticesResponse.json()) as {
          notices?: PublishedNoticeItem[];
        };
        setNotices(payload.notices ?? []);
      } catch {
        setNotices([]);
        if (active) {
          setUserId(null);
        }
      }
    };
    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const refresh = () => {
      setReadNoticeIds(getReadNoticeIds(userId));
    };
    refresh();
    window.addEventListener(NOTICE_READ_EVENT, refresh);
    return () => window.removeEventListener(NOTICE_READ_EVENT, refresh);
  }, [userId]);

  const readSet = useMemo(() => new Set(readNoticeIds), [readNoticeIds]);
  const unreadCount = notices.reduce(
    (count, notice) => (readSet.has(notice.id) ? count : count + 1),
    0,
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="通知"
        >
          <Bell className="size-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-semibold">通知公告</h3>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {notices.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              暂无新通知
            </div>
          ) : (
            notices.map((notice) => (
              <div
                key={notice.id}
                className="border-b border-border/50 px-4 py-3 last:border-b-0 hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-5">{notice.title}</p>
                  <div className="flex items-center gap-1.5">
                    {!readSet.has(notice.id) ? (
                      <span className="size-1.5 rounded-full bg-rose-500" />
                    ) : null}
                    {notice.priority !== "normal" && (
                      <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                        {notice.priority === "critical" ? "紧急" : "重要"}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {toPlainText(notice.content)}
                </p>
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground/70">
                    {formatNoticeDate(notice.publishedAt)}
                  </p>
                  {!readSet.has(notice.id) ? (
                    userId ? (
                      <button
                        type="button"
                        className="text-xs text-primary hover:underline"
                        onClick={() => markNoticeRead(notice.id, userId)}
                      >
                        标记已读
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">
                        登录后可标记
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground/70">已读</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-full text-xs"
            onClick={() => setOpen(false)}
          >
            <Link href="/notifications">查看全部通知</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
