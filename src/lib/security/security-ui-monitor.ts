"use client";

interface SecurityUiIssueInput {
  eventType: string;
  summary: string;
  severity?: "low" | "medium" | "high" | "critical";
  metadata?: Record<string, unknown>;
}

export function getFriendlyUiMessage(actionLabel: string) {
  return `${actionLabel}未完成，系统已记录事件，请稍后重试。`;
}

export async function reportSecurityUiIssue(input: SecurityUiIssueInput) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    await fetch("/api/security/events/client", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType: "security.client.sensitive_action_debug_context",
        metadata: {
          reportedEventType: input.eventType.slice(0, 120),
          summary: input.summary.slice(0, 500),
          path: window.location.pathname.slice(0, 255),
        },
      }),
    });
  } catch {
    // Ignore reporting failures to avoid secondary noise in the client.
  }
}
