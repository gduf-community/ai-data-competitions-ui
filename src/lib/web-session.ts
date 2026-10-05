import "server-only";
import { cache } from "react";
import type { ClientSessionUser } from "@/lib/auth/client-session";
import { readAPI, WebApiError } from "@/lib/web-api";
import { getTransportConfig } from "@/lib/web-transport";
export const getWebSession = cache(async () => {
  if (!getTransportConfig().business) return null;
  try { return { user: (await readAPI<{ user: ClientSessionUser }>("/api/me/session")).user }; }
  catch (error) { if (error instanceof WebApiError && error.status === 401) return null; throw error; }
});
export const getSessionUser = cache(async () => (await getWebSession())?.user ?? {
  id: undefined, name: "未登录用户", email: undefined, role: "student_user" as const,
  roles: ["student_user" as const], scopedCompetitionIds: [], scopedClubSlugs: [],
});
