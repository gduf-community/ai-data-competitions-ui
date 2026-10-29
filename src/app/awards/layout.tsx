import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";

// 公开奖状页不在 SSR 读取会话；导航登录态仍由 NewNavbar 在客户端获取。
export default function AwardsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf8_38%,#f5f1e8_100%)]">
      <PortalNavbar />
      {children}
      <PortalFooter />
    </div>
  );
}
