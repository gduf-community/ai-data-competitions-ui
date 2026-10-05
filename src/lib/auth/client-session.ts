import type { UserRole } from "@/lib/types";
import type { SessionCapabilities } from "@/lib/auth/session-capabilities";
import { HttpRequestError, requestJSON } from "@/lib/http-client";

export interface ClientSessionUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: UserRole;
  roles: UserRole[];
  scopedCompetitionIds: string[];
  scopedClubSlugs: string[];
  capabilities: SessionCapabilities;
}

export async function fetchClientSessionUser() {
  try {
    const payload = await requestJSON<{ user: ClientSessionUser }>("/api/me/session", { cache: "no-store" });
    if (!payload.user?.id) throw new Error("会话响应不完整");
    return payload.user;
  } catch (error) {
    if (error instanceof HttpRequestError && error.status === 401) return null;
    throw error;
  }
}
