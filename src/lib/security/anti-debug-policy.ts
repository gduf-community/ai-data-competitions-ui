export type AntiDebugPolicy = "off" | "light" | "sensitive";

export interface AntiDebugRoutePolicy {
  policy: AntiDebugPolicy;
  tab:
    | "events"
    | "alerts"
    | "actions"
    | "situation"
    | "analytics"
    | "dashboard"
    | "other";
}

export function getAntiDebugRoutePolicy(pathname: string): AntiDebugRoutePolicy {
  if (pathname === "/admin/security/events") {
    return { policy: "light", tab: "events" };
  }
  if (pathname === "/admin/security/alerts") {
    return { policy: "light", tab: "alerts" };
  }
  if (pathname === "/admin/security/actions") {
    return { policy: "sensitive", tab: "actions" };
  }
  if (pathname === "/admin/security/situation") {
    return { policy: "light", tab: "situation" };
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/analytics")) {
    return {
      policy: "light",
      tab: pathname === "/admin" ? "dashboard" : "analytics",
    };
  }

  if (
    pathname.startsWith("/admin/users") ||
    pathname.startsWith("/admin/competitions") ||
    pathname.startsWith("/admin/applications")
  ) {
    return { policy: "sensitive", tab: "other" };
  }

  return { policy: "off", tab: "other" };
}
