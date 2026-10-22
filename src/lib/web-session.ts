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

// 公开页的可选会话：任何失败（超时/5xx/网络抖动）都降级为匿名，不阻断公开数据渲染。
// 受保护页仍需用 getWebSession 区分 401（匿名）与真实服务错误，不要改用此函数。
export const getOptionalWebSession = cache(async () => {
  try { return await getWebSession(); }
  catch { return null; }
});
