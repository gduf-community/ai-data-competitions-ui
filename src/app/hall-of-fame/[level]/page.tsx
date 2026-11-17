import { notFound } from "next/navigation";

import { HallOfFameLevelDetailView } from "@/components/marketing/hall-of-fame-member-card";
import { PortalFooter } from "@/components/marketing/portal-footer";
import { PortalNavbar } from "@/components/marketing/portal-navbar";
import {
  isHallOfFameHierarchyEnabled,
  parseHallOfFameLevelSegment,
} from "@/lib/hall-of-fame";
import { getHallOfFameLevelDetail } from "@/lib/web-data";

export default async function HallOfFameLevelPage({
  params,
}: {
  params: Promise<{ level: string }>;
}) {
  if (!isHallOfFameHierarchyEnabled()) {
    notFound();
  }

  const { level: rawSegment } = await params;
  const level = parseHallOfFameLevelSegment(rawSegment);
  if (level === null) {
    notFound();
  }

  const detail = await getHallOfFameLevelDetail(level);
  if (!detail) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f7f3ea_0%,#fcfbf8_38%,#f5f1e8_100%)]">
      <PortalNavbar />
      <main className="mx-auto max-w-5xl px-4 py-12 md:px-6">
        <HallOfFameLevelDetailView detail={detail} />
      </main>
      <PortalFooter />
    </div>
  );
}
