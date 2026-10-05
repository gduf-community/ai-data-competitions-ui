import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SidebarConfigProvider } from "@/contexts/sidebar-context";
import { NoticePopup } from "@/components/notifications/notice-popup";
import { SecurityFetchProvider } from "@/components/security/security-fetch-provider";
import { inter, mono } from "@/lib/fonts";
import { normalizeLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "学院竞赛管理与问答平台",
  description: "面向学院竞赛发布、报名、审核与问答沉淀的一体化平台骨架。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const locale = normalizeLocale(requestHeaders.get("accept-language"));

  return (
    <html lang={locale} className={`${inter.variable} ${mono.variable} antialiased`}>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="nextjs-ui-theme">
          <SidebarConfigProvider>
            <SecurityFetchProvider />
            {children}
            <NoticePopup />
            <Toaster richColors position="top-center" />
          </SidebarConfigProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
