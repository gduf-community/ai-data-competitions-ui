import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";

// 公开奖状页不在 SSR 读取会话；导航登录态仍由 NewNavbar 在客户端获取。
export default function AwardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-white text-foreground dark:bg-background">
      <PortalNavbar />
      {children}
      <PortalFooter />
    </div>
  );
}
