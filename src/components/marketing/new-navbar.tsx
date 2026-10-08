"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, ScrollText, Trophy } from "lucide-react";
import { signOut } from "next-auth/react";

import { fetchClientSessionUser } from "@/lib/auth/client-session";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserRole } from "@/lib/types";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/competitions", label: "比赛列表" },
  { href: "/awards", label: "荣誉展示" },
  { href: "/clubs", label: "五大社团" },
  { href: "/hall-of-fame", label: "名人堂" },
  { href: "/team", label: "网站团队" },
];

interface PortalCurrentUser {
  name: string;
  role: UserRole;
}

interface NewNavbarProps {
  currentUser?: PortalCurrentUser | null;
}

function canAccessAdmin(role: UserRole) {
  return (
    role === "super_admin" ||
    role === "competition_admin" ||
    role === "security_admin" ||
    role === "business_admin" ||
    role === "analytics_viewer" ||
    role === "temporary_admin" ||
    role === "supervisor"
  );
}

function NavLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className: string;
}) {
  if (href.includes("#")) {
    return (
      <a href={href} className={className}>
        {label}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export function NewNavbar({ currentUser }: NewNavbarProps) {
  const pathname = usePathname();
  const [clientUser, setClientUser] = useState<PortalCurrentUser | null>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const resolvedUser = currentUser === undefined ? clientUser : currentUser;
  const isCompact = pathname !== "/" || hasScrolled;
  const showAdminEntry = resolvedUser ? canAccessAdmin(resolvedUser.role) : false;

  useEffect(() => {
    let active = true;
    if (currentUser !== undefined) {
      return () => {
        active = false;
      };
    }

    void fetchClientSessionUser().then((sessionUser) => {
      if (!active) return;
      if (!sessionUser?.name || !sessionUser.role) {
        setClientUser(null);
        return;
      }
      setClientUser({ name: sessionUser.name, role: sessionUser.role });
    }).catch((error: unknown) => {
      if (active) console.error("[navbar] session unavailable", error);
    });

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    if (pathname !== "/") return;

    const handleScroll = () => {
      setHasScrolled(window.scrollY > 28);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [pathname]);

  async function handleSignOut() {
    // Auth.js may return the private API origin through the BFF.
    // Finish cookie invalidation before navigating within the current Web origin.
    await signOut({ redirect: false, callbackUrl: "/" });
    window.location.assign("/");
  }

  return (
    <header
      className={cn(
        "fixed left-1/2 z-50 w-[calc(100%-1.5rem)] max-w-[1400px] -translate-x-1/2 transition-all duration-300 md:w-[calc(100%-3rem)]",
        isCompact ? "top-3" : "top-5",
      )}
    >
      <nav
        className={cn(
          "flex items-center gap-2 rounded-full backdrop-blur-md transition-all duration-300",
          isCompact
            ? "border border-border/60 bg-background/85 shadow-lg"
            : "border border-white/30 bg-[linear-gradient(110deg,rgba(255,255,255,0.88),rgba(176,198,255,0.48))] shadow-[0_18px_45px_-24px_rgba(42,84,224,0.75)]",
          isCompact ? "px-3 py-1.5" : "px-4 py-2.5",
        )}
      >
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 transition-all",
            isCompact ? "pr-1" : "pr-2",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all",
              isCompact ? "size-7" : "size-8",
            )}
          >
            <Trophy className={cn("transition-all", isCompact ? "size-3.5" : "size-4")} />
          </div>
          <span className={cn("hidden font-semibold sm:inline", isCompact ? "text-xs" : "text-sm")}>
            学院竞赛中心
          </span>
        </Link>

        <div className={cn("hidden items-center md:flex", isCompact ? "gap-0.5" : "gap-1")}>
          {navLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              label={link.label}
              className={cn(
                "rounded-full font-medium transition-colors",
                isCompact
                  ? "text-muted-foreground hover:bg-accent hover:text-foreground"
                  : "text-slate-700 hover:bg-white/55 hover:text-slate-900",
                isCompact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
              )}
            />
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          {resolvedUser ? (
            <>
              <div
                className={cn(
                  "hidden items-center gap-2 rounded-full lg:flex",
                  isCompact
                    ? "border border-border/50 bg-card/80"
                    : "border border-white/40 bg-white/55",
                  isCompact ? "px-2.5 py-1" : "px-3 py-1.5",
                )}
              >
                <div className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ScrollText className="size-3" />
                </div>
                <span className={cn("font-medium", isCompact ? "text-[11px]" : "text-xs")}>
                  {resolvedUser.name}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                asChild
                className={cn("rounded-full", isCompact ? "text-[11px]" : "text-xs")}
              >
                <Link href="/me">个人中心</Link>
              </Button>

              {showAdminEntry && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className={cn("rounded-full", isCompact ? "text-[11px]" : "text-xs")}
                >
                  <Link href="/admin">管理台</Link>
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className={cn("rounded-full text-muted-foreground", isCompact ? "text-[11px]" : "text-xs")}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="size-3" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                asChild
                className={cn("rounded-full", isCompact ? "text-[11px]" : "text-xs")}
              >
                <Link href="/sign-in">登录</Link>
              </Button>
              <Button
                size="sm"
                asChild
                className={cn("rounded-full", isCompact ? "text-[11px]" : "text-xs")}
              >
                <Link href="/competitions">查看比赛</Link>
              </Button>
            </>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8 rounded-full md:hidden">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px]">
            <SheetTitle>学院竞赛中心</SheetTitle>
            <div className="mt-8 flex flex-col gap-4">
              {navLinks.map((link) => (
                <NavLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  className="text-base font-medium text-foreground"
                />
              ))}
              <Link
                href={resolvedUser ? "/me" : "/sign-in"}
                className="text-base font-medium text-foreground"
              >
                {resolvedUser ? "个人中心" : "登录"}
              </Link>
              {showAdminEntry && (
                <Link href="/admin" className="text-base font-medium text-foreground">
                  管理台
                </Link>
              )}
              <div className="mt-4 flex flex-col gap-3">
                {resolvedUser ? (
                  <Button variant="outline" className="w-full" onClick={() => void handleSignOut()}>
                    退出登录
                  </Button>
                ) : (
                  <>
                    <Button variant="outline" asChild className="w-full">
                      <Link href="/sign-in">登录</Link>
                    </Button>
                    <Button asChild className="w-full">
                      <Link href="/competitions">查看全部比赛</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </header>
  );
}
