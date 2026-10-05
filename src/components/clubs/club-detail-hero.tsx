import Link from "next/link";
import { ArrowLeft, Mail, MessageCircle, UserRound, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RichTextContent } from "@/components/shared/rich-text-content";
import { getClubThemeGradientClass } from "@/lib/data/club-theme";
import type { ClubRecord } from "@/lib/data/clubs";
import type { ClubContactRow } from "@/lib/contracts/clubs";

interface ClubDetailHeroProps {
  club: ClubRecord;
  contacts: Pick<ClubContactRow, "contactType" | "label" | "value">[];
}

const CONTACT_ICON_MAP: Record<ClubContactRow["contactType"], typeof Mail> = {
  advisor: UserRound,
  student_lead: UserRound,
  email: Mail,
  wechat: MessageCircle,
  qq_group: Users,
};

const CONTACT_LABEL_MAP: Record<ClubContactRow["contactType"], string> = {
  advisor: "指导老师",
  student_lead: "学生负责人",
  email: "联系邮箱",
  wechat: "微信",
  qq_group: "QQ群",
};

export function ClubDetailHero({ club, contacts }: ClubDetailHeroProps) {
  return (
    <section className="relative overflow-hidden pt-28 pb-10 sm:pt-34">
      <div className="relative mx-auto max-w-[1400px] px-4 md:px-6">
        <Link
          href="/clubs"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          返回社团总览
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div
            className={`glass-3 overflow-hidden rounded-2xl border border-border/50 bg-linear-to-br ${getClubThemeGradientClass(club.themeColor)}`}
          >
            <div className="p-6 sm:p-8">
              <Badge variant="secondary" className="mb-3 rounded-full">
                {club.shortName ?? club.name}
              </Badge>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {club.name}
              </h1>
              {club.slogan ? (
                <p className="mt-2 text-base text-muted-foreground">
                  {club.slogan}
                </p>
              ) : null}

              {club.focusAreas.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {club.focusAreas.map((area) => (
                    <Badge key={area} variant="outline" className="rounded-full">
                      {area}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <RichTextContent
                html={club.description}
                className="mt-6 text-sm leading-7 text-muted-foreground"
              />
            </div>
          </div>

          <aside className="glass-3 flex flex-col gap-6 rounded-2xl border border-border/50 p-6">
            {club.joinGuide ? (
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  加入方式
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {club.joinGuide}
                </p>
              </div>
            ) : null}

            {contacts.length > 0 ? (
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  联系方式
                </h3>
                <div className="mt-3 space-y-2.5">
                  {contacts.map((contact, index) => {
                    const Icon = CONTACT_ICON_MAP[contact.contactType];
                    return (
                      <div
                        key={`${contact.contactType}-${index}`}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-primary" />
                        <span>
                          {contact.label ??
                            CONTACT_LABEL_MAP[contact.contactType]}
                          ：{contact.value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <Button asChild className="mt-auto w-full">
              <Link href="/competitions">查看相关比赛</Link>
            </Button>
          </aside>
        </div>
      </div>
    </section>
  );
}
