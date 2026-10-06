"use client";

import * as React from "react";
import {
  Activity,
  Award,
  BookOpenCheck,
  Calendar,
  ClipboardCheck,
  Database,
  Home,
  ImageIcon,
  LayoutDashboard,
  ListFilter,
  Megaphone,
  Settings2,
  ShieldCheck,
  Trophy,
  Users,
  Users2,
} from "lucide-react";
import Link from "next/link";

import type { UserRole } from "@/lib/types";
import type { SessionCapabilities } from "@/lib/auth/session-capabilities";
import { fetchClientSessionUser } from "@/lib/auth/client-session";
import { Logo } from "@/components/logo";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface SidebarUser {
  name: string;
  email: string;
  avatar: string;
  role?: UserRole;
  roles?: UserRole[];
  scopedCompetitionIds?: string[];
  capabilities?: SessionCapabilities;
}

const fallbackUser: SidebarUser = {
  name: "管理员用户",
  email: "unknown@local",
  avatar: "",
};

type NavItem = React.ComponentProps<typeof NavMain>["items"][number] & { capability?: keyof SessionCapabilities };
const navGroups: Array<{ label: string; capability?: keyof SessionCapabilities; items: NavItem[] }> = [
  {
    label: "总览",
    items: [
      { title: "后台首页", url: "/admin", icon: LayoutDashboard },
      { title: "官网首页", url: "/", icon: Home },
      { title: "SQL 查询台", url: "/admin/analytics/sql", capability: "canReadAnalytics", icon: Database },
    ],
  },
  {
    label: "数据看板",
    capability: "canReadAnalytics",
    items: [
      { title: "看板总览", url: "/admin/analytics", icon: Activity },
      { title: "赛事分析", url: "/admin/analytics/competitions", icon: Trophy },
      { title: "转化漏斗", url: "/admin/analytics/funnel", icon: ListFilter },
      { title: "用户分析", url: "/admin/analytics/users", icon: Users },
      { title: "通知分析", url: "/admin/analytics/notifications", icon: Megaphone },
      { title: "风险预警", url: "/admin/analytics/risk", icon: ShieldCheck },
    ],
  },
  {
    label: "业务管理",
    capability: "canReadBusinessManagement",
    items: [
      { title: "比赛管理", url: "/admin/competitions", icon: Trophy },
      { title: "报名审核", url: "/admin/applications", icon: ClipboardCheck },
      { title: "通知管理", url: "/admin/notices", icon: Megaphone },
      { title: "用户管理", url: "/admin/users", capability: "canReadUserManagement", icon: Users },
      { title: "赛程安排", url: "/admin/schedule", icon: Calendar },
      { title: "名人堂管理", url: "/admin/hall-of-fame", capability: "canReadRestrictedContentManagement", icon: Award },
      { title: "社团管理", url: "/admin/clubs", icon: Users2 },
      {
        title: "社团内容审核",
        url: "/admin/clubs/reviews",
        icon: ClipboardCheck,
      },
      {
        title: "经验文章审核",
        url: "/admin/experience-reviews", capability: "canReadRestrictedContentManagement",
        icon: BookOpenCheck,
      },
      { title: "奖状审核", url: "/admin/award-reviews", icon: ImageIcon },
    ],
  },
  {
    label: "安全中心",
    capability: "canManageSecurityCenter",
    items: [
      { title: "事件列表", url: "/admin/security/events", icon: Activity },
      { title: "告警中心", url: "/admin/security/alerts", icon: ShieldCheck },
      { title: "动作执行", url: "/admin/security/actions", icon: Settings2 },
      { title: "态势感知", url: "/admin/security/situation", icon: Activity },
    ],
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const [user, setUser] = React.useState<SidebarUser>(fallbackUser);
  React.useEffect(() => {
    let cancelled = false;

    const loadSessionUser = async () => {
      try {
        const sessionUser = await fetchClientSessionUser();
        if (cancelled || !sessionUser) {
          return;
        }
        setUser({
          name: sessionUser.name?.trim() || fallbackUser.name,
          email: sessionUser.email?.trim() || fallbackUser.email,
          avatar: sessionUser.image ?? "",
          role: sessionUser.role as UserRole | undefined,
          roles: sessionUser.roles as UserRole[] | undefined,
          scopedCompetitionIds: sessionUser.scopedCompetitionIds ?? [],
          capabilities: sessionUser.capabilities,
        });
      } catch {
        // keep fallback user
      }
    };

    void loadSessionUser();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Sidebar {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Logo size={24} className="text-current" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">学院竞赛平台</span>
                  <span className="truncate text-xs">管理工作台</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.filter(group => !group.capability || user.capabilities?.[group.capability] === true).map(group => {
          const items = group.items.filter(item => !item.capability || user.capabilities?.[item.capability] === true);
          return items.length ? <NavMain key={group.label} label={group.label} items={items} /> : null;
        })}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
