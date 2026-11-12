import Link from "next/link";
import { LazyFillImage } from "@/components/shared/lazy-fill-image";
import { Card } from "@/components/ui/card";
import type { AwardShowcaseRow } from "@/lib/contracts/profiles";
import { cn } from "@/lib/utils";

interface CertificateCardProps {
  award: Pick<AwardShowcaseRow, "id" | "competitionTitle" | "awardLevel" | "imageUrl" | "memberNames" | "userName">;
  variant?: "gallery" | "featured";
  level?: string;
  nearViewport?: boolean;
}

export function CertificateCard({ award, variant = "gallery", level, nearViewport = false }: CertificateCardProps) {
  const featured = variant === "featured";
  const members = award.memberNames.length ? award.memberNames.join("、") : award.userName;
  const details = (
    <div className={cn("min-w-0 space-y-1 p-3", !featured && "leading-relaxed")}>
      <p className={cn("text-sm break-words text-foreground", featured && "line-clamp-1 font-medium")}>{award.competitionTitle}</p>
      {featured && award.awardLevel && <p className="text-xs text-primary">{award.awardLevel}</p>}
      <p className={cn("text-xs break-words text-muted-foreground", featured && "line-clamp-2")}>{members}</p>
    </div>
  );
  return (
    <Card className={cn(
      "group h-full min-w-0 gap-0 overflow-hidden rounded-xl bg-background p-0",
      featured && "border-border/50 bg-background/80 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-primary/5",
    )}>
      <Link
        href={`/awards/${encodeURIComponent(award.id)}`}
        prefetch={featured ? undefined : false}
        className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
        aria-label={featured ? `查看 ${award.competitionTitle} 奖状详情` : undefined}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <LazyFillImage
            src={award.imageUrl}
            alt={featured ? award.competitionTitle : `${award.competitionTitle} ${level ?? ""} ${members}获奖证书`}
            sizes={featured ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" : "(max-width: 639px) calc(100vw - 32px), (max-width: 1023px) 50vw, (max-width: 1279px) 33vw, 270px"}
            className={featured ? "transition-transform duration-500 group-hover:scale-105" : "object-contain"}
            fallbackText="奖状图片暂不可用"
            fallbackClassName="px-4 text-center"
            nearViewport={featured || nearViewport}
          />
          {featured && (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-between gap-2 px-3 py-2 text-xs text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <span className="shrink-0">查看奖状详情</span>
                <span className="line-clamp-2 min-w-0 flex-1 text-right break-words">{members}</span>
              </div>
            </>
          )}
        </div>
        {!featured && details}
      </Link>
      {featured && details}
    </Card>
  );
}
