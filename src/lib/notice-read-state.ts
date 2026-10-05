"use client";

import {
  getSafeStorageItem,
  setSafeStorageItem,
} from "@/lib/safe-storage";

export const NOTICE_READ_KEY = "read_notice_ids";
export const NOTICE_READ_EVENT = "notice-read-updated";

function notifyUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(NOTICE_READ_EVENT));
}

function persistReadState(noticeIds: string[]) {
  if (noticeIds.length === 0) return;
  void fetch("/api/me/notices/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ noticeIds }),
  }).catch(() => undefined);
}

function normalizeUserId(userId?: string | null) {
  if (!userId) return null;
  const normalized = userId.trim();
  return normalized.length > 0 ? normalized : null;
}

function getReadStateKey(userId?: string | null) {
  const normalizedUserId = normalizeUserId(userId);
  if (!normalizedUserId) return null;
  return `${NOTICE_READ_KEY}:${normalizedUserId}`;
}

function parseReadNoticeIds(raw: string | null) {
  if (!raw) return [] as string[];
  try {
    const decoded = decodeURIComponent(raw);
    const parsed = JSON.parse(decoded);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter((item): item is string => typeof item === "string");
    } catch {
      return [];
    }
  }
}

export function getReadNoticeIds(userId?: string | null): string[] {
  const key = getReadStateKey(userId);
  if (!key) return [];
  const raw = getSafeStorageItem(key);
  if (!raw) return [];
  return parseReadNoticeIds(raw);
}

export function isNoticeRead(id: string, userId?: string | null): boolean {
  return getReadNoticeIds(userId).includes(id);
}

export function markNoticeRead(id: string, userId?: string | null) {
  if (!id) return;
  const key = getReadStateKey(userId);
  if (!key) return;

  const readIds = getReadNoticeIds(userId);
  if (readIds.includes(id)) {
    persistReadState([id]);
    return;
  }
  readIds.push(id);
  if (setSafeStorageItem(key, JSON.stringify(readIds))) {
    notifyUpdated();
    persistReadState([id]);
  }
}

export function markNoticesRead(ids: string[], userId?: string | null) {
  if (ids.length === 0) return;
  const key = getReadStateKey(userId);
  if (!key) return;

  const current = new Set(getReadNoticeIds(userId));
  let changed = false;
  for (const id of ids) {
    if (!id || current.has(id)) continue;
    current.add(id);
    changed = true;
  }
  if (!changed) {
    persistReadState(ids);
    return;
  }
  if (setSafeStorageItem(key, JSON.stringify([...current]))) {
    notifyUpdated();
    persistReadState(ids);
  }
}

export function replaceReadNoticeIdsFromServer(
  ids: string[],
  userId?: string | null,
) {
  const key = getReadStateKey(userId);
  if (!key) return;
  const normalized = [...new Set(ids.filter(Boolean))];
  if (setSafeStorageItem(key, JSON.stringify(normalized))) {
    notifyUpdated();
  }
}
