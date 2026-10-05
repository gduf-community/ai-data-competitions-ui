"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User, FileSpreadsheet, Trophy, Award, BookOpen, Users2 } from "lucide-react";

import { cn } from "@/lib/utils";

const menuItems = [
  { href: "/me/profile", label: "我的信息", icon: User },
  { href: "/me/applications", label: "我的报名", icon: FileSpreadsheet },
  { href: "/me/achievements", label: "我的成果", icon: Award },
  { href: "/me/experiences", label: "经验文章", icon: BookOpen },
  { href: "/me/clubs", label: "社团管理", icon: Users2 },
  { href: "/me/hall-of-fame", label: "名人堂展示", icon: Trophy },
];

interface MeSidebarProps {
  variant?: "sidebar" | "tabs";
}

export function MeSidebar({ variant = "sidebar" }: MeSidebarProps) {
  const pathname = usePathname();

  if (variant === "tabs") {
    return (
      <nav className="flex gap-1 rounded-lg bg-muted p-1">
        {menuItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium transition-colors",
                isActive
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav className="space-y-1">
      {menuItems.map((item) => {
        const isActive = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
