import { Mail, Users } from "lucide-react";

import type { ClubRecord } from "@/lib/data/clubs";

interface ClubsJoinGuideProps {
  clubs: ClubRecord[];
}

export function ClubsJoinGuide({ clubs }: ClubsJoinGuideProps) {
  const contacts = clubs.map((club) => ({
    id: club.id,
    name: club.shortName,
    email: club.advisorOrContact.email,
    lead: club.advisorOrContact.studentLead,
  }));

  return (
    <section id="clubs-join" className="pb-20">
      <div className="mx-auto max-w-[1400px] px-4 md:px-6">
        <div className="glass-3 rounded-2xl border border-border/50 p-6 sm:p-8">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Users className="size-5" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-foreground">加入与咨询</h3>
              <p className="text-sm text-muted-foreground">
                招新通常在每学期前两周开放，可先邮件联系对应社团负责人。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-lg border border-border/60 bg-background/70 px-4 py-3"
              >
                <p className="text-sm font-medium text-foreground">{contact.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{contact.lead}</p>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="size-3.5" />
                  <span>{contact.email}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
