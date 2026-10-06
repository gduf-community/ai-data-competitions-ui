"use client";

import type { AntiDebugPolicy } from "@/lib/security/anti-debug-policy";

const SESSION_REPORTED_KEY = "security:devtools:reported:session";
const PATH_REPORTED_PREFIX = "security:devtools:reported:path:";
const DAILY_COUNTER_KEY = "security:devtools:reported:daily";
const SENSITIVE_DETECTED_KEY = "security:devtools:sensitive:detected";

interface DailyCounterShape {
  date: string;
  count: number;
}

function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPathKey(pathname: string) {
  return `${PATH_REPORTED_PREFIX}${pathname}`;
}

function readDailyCounter(): DailyCounterShape {
  try {
    const raw = localStorage.getItem(DAILY_COUNTER_KEY);
    if (!raw) {
      return { date: getTodayKey(), count: 0 };
    }
    const parsed = JSON.parse(raw) as DailyCounterShape;
    if (parsed.date !== getTodayKey()) {
      return { date: getTodayKey(), count: 0 };
    }
    return {
      date: parsed.date,
      count: Number.isFinite(parsed.count) ? parsed.count : 0,
    };
  } catch {
    return { date: getTodayKey(), count: 0 };
  }
}

function writeDailyCounter(counter: DailyCounterShape) {
  localStorage.setItem(DAILY_COUNTER_KEY, JSON.stringify(counter));
}

function shouldReport(pathname: string) {
  const sessionReported = sessionStorage.getItem(SESSION_REPORTED_KEY) === "1";
  if (sessionReported) {
    return false;
  }

  const pathKey = getPathKey(pathname);
  const lastPathReportRaw = localStorage.getItem(pathKey);
  if (lastPathReportRaw) {
    const lastPathReportMs = Number(lastPathReportRaw);
    if (Number.isFinite(lastPathReportMs)) {
      const withinHalfHour = Date.now() - lastPathReportMs < 30 * 60 * 1000;
      if (withinHalfHour) {
        return false;
      }
    }
  }

  const dailyCounter = readDailyCounter();
  if (dailyCounter.count >= 5) {
    return false;
  }

  return true;
}

function markReported(pathname: string) {
  sessionStorage.setItem(SESSION_REPORTED_KEY, "1");
  localStorage.setItem(getPathKey(pathname), String(Date.now()));
  const counter = readDailyCounter();
  counter.count += 1;
  writeDailyCounter(counter);
}

export function markSensitiveDebugDetected() {
  sessionStorage.setItem(SENSITIVE_DETECTED_KEY, String(Date.now()));
}

export function getSensitiveDebugDetectedAt() {
  const raw = sessionStorage.getItem(SENSITIVE_DETECTED_KEY);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

export function hasSensitiveDebugDetected() {
  return getSensitiveDebugDetectedAt() !== null;
}

export async function reportClientSecurityEvent(input: {
  policy: AntiDebugPolicy;
  detection: "viewport_delta" | "debugger_delay";
  pathname: string;
  tab: string;
  eventType?: "security.client.devtools_detected" | "security.client.sensitive_action_debug_context";
  severity?: "low" | "medium" | "high";
}) {
  if (typeof window === "undefined") {
    return false;
  }

  if (!shouldReport(input.pathname)) {
    return false;
  }

  const eventType =
    input.eventType ??
    (input.policy === "sensitive"
      ? "security.client.sensitive_action_debug_context"
      : "security.client.devtools_detected");
  const severity = input.severity ?? (input.policy === "sensitive" ? "medium" : "low");

  const metadata = {
    policy: input.policy,
    detection: input.detection,
    path: input.pathname,
    tab: input.tab,
    ua: navigator.userAgent.slice(0, 255),
  };

  try {
    const response = await fetch("/api/security/events/client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType,
        severity,
        metadata,
      }),
    });

    if (response.ok) {
      markReported(input.pathname);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
