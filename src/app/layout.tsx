import type { Metadata, Viewport } from "next";
import "./globals.css";

import { ThemeProvider } from "@/components/theme-provider";
import { inter, mono } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "学院竞赛管理与问答平台 UI",
  description:
    "面向学院竞赛门户、报名展示与荣誉展示的公开 UI 协作仓库。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${mono.variable} antialiased`}>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="competition-ui-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
