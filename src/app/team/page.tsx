import { Crown, Shield, Mail, MessageCircle, Trophy } from "lucide-react";

import { NewFooter } from "@/components/marketing/new-footer";
import { NewNavbar } from "@/components/marketing/new-navbar";
import { Section } from "@/components/marketing/section";
import { Card, CardContent } from "@/components/ui/card";
import { getWebSession as auth } from "@/lib/web-session";
import { cn } from "@/lib/utils";

const founders = [
  {
    name: "李炫良",
    title: "创始人",
    role: "全站管理员 · 平台架构师",
    bio: "完成平台全栈开发，主导系统架构设计、前后端实现、数据库建模、安全防护与性能优化，推动平台技术方向与持续迭代。",
    email: "19210109091@163.com",
    college: "量化投资工作室",
  },
  {
    name: "徐鹏程老师",
    title: "创始人",
    role: "比赛总管理员",
    bio: "负责学院所有比赛的统筹管理，包括报名审核、训练营组织、赛事资料维护、通知发布和进度协调。",
    email: "topoxu@gduf.edu.cn",
    college: "大数据与人工智能学院",
  },
  {
    name: "林昭漫",
    title: "平台共建者",
    role: "内容编辑 · 测试与运维",
    bio: "参与平台全流程建设，负责需求分析、产品测试、内容管理、赛事数据维护与 FAQ 体系搭建，推动平台从开发到上线的完整交付。",
    email: "15807670828@163.com",
    college: "大数据与人工智能学院",
  },
];

/*
const siteMaintainers = [
  {
    name: "简健怡",
    title: "网站维护者",
    role: "技术运维管理员",
    bio: "负责平台源码理解、基础运维、安全梳理和日常问题排查，协助维护网站稳定性、可用性与后续扩展能力。",
    email: "a1330_pxyxjjaqtb@aka.yeah.net",
    college: "金融数学与统计学院",
  },
];
*/

const competitionAdmins = [
  { name: "梁至" },
  { name: "郭庆" },
  { name: "吕亦" },
  { name: "王薇雅" },
  { name: "罗润健" },
];

const securityAdmins = [
  { name: "唐子皓" },
  { name: "杨鸿鹏" },
  { name: "许瑶" },
];

const joinContacts = [
  {
    label: "微信",
    value: "-84025375",
    note: "添加请备注：专业 + 姓名",
  },
  {
    label: "校内邮箱",
    value: "241615220@m.gduf.edu.cn",
    note: "面向校内同学、老师，用于加入网站建设、资料维护、赛事信息整理等共建工作。",
  },
  {
    label: "共建反馈入口",
    value: "GitHub Issues",
    href: "https://github.com/GDUF-quantitative/ai-data-competitions-ui/issues",
    note: "用于提交功能建议、问题反馈、文档改进与协作共建需求。",
  },
  {
    label: "电话",
    value: "19210109091",
    note: "工作日 09:00 - 18:00",
  },
];

const platformHighlights = [
  {
    label: "平台定位",
    value: "学院竞赛管理与问答平台",
    className:
      "border-sky-200/80 bg-[linear-gradient(135deg,rgba(240,249,255,0.98),rgba(224,242,254,0.9))]",
    labelClassName: "text-sky-700",
  },
  {
    label: "核心链路",
    value: "发布通知、组织报名、审核流转与资料沉淀",
    className:
      "border-cyan-200/80 bg-[linear-gradient(135deg,rgba(236,254,255,0.98),rgba(207,250,254,0.88))]",
    labelClassName: "text-cyan-700",
  },
  {
    label: "团队职责",
    value: "产品规划、技术实现、内容维护与日常运营",
    className:
      "border-indigo-200/80 bg-[linear-gradient(135deg,rgba(238,242,255,0.98),rgba(224,231,255,0.9))]",
    labelClassName: "text-indigo-700",
  },
];

export default async function TeamPage() {
  const session = await auth();
  const currentUser = session?.user
    ? { name: session.user.name ?? "未命名用户", role: session.user.role }
    : null;

  return (
    <div className="relative min-h-screen bg-[linear-gradient(180deg,#f8fbff_0%,#f3f8fd_42%,#edf4fb_100%)]">
      <NewNavbar currentUser={currentUser} />
      <main className="pt-24">
        <Section className="pb-16 pt-6 sm:pt-10">
          <div className="mx-auto max-w-4xl space-y-10">
            <div className="space-y-3 text-center">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                网站团队
              </h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                学院竞赛管理与问答平台的建设与运营团队
              </p>
            </div>

            <Card className="overflow-hidden border-slate-200/80 bg-[linear-gradient(145deg,rgba(248,250,252,0.94),rgba(239,246,255,0.9),rgba(236,254,255,0.84))] shadow-[0_24px_60px_-48px_rgba(51,65,85,0.4)]">
              <CardContent className="space-y-6 p-6 sm:p-8">
                <div className="space-y-3">
                  <p className="text-sm leading-7 text-slate-700">
                    学院竞赛管理与问答平台围绕比赛信息发布、通知触达、报名审核和经验沉淀搭建统一入口，面向学生、指导老师与赛事管理员提供清晰稳定的竞赛服务。
                  </p>
                  <p className="text-sm leading-7 text-slate-600">
                    网站团队负责平台规划、系统开发、内容维护与日常运营，持续优化竞赛服务链路，减少信息分散和流程割裂。
                  </p>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  {platformHighlights.map((item) => (
                    <div
                      key={item.label}
                      className={cn(
                        "rounded-2xl border px-5 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
                        item.className,
                      )}
                    >
                      <p
                        className={cn(
                          "text-xs font-semibold tracking-[0.18em] uppercase",
                          item.labelClassName,
                        )}
                      >
                        {item.label}
                      </p>
                      <p className="mt-2 text-base font-semibold leading-7 text-slate-900">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Crown className="size-5 text-amber-600" />
                创始人
              </h2>
              {founders.map((member) => (
                <Card
                  key={member.email}
                  className="border-border/70 bg-[linear-gradient(135deg,rgba(183,140,64,0.04),rgba(17,24,39,0.02))]"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                        <Crown className="size-7" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-slate-900">{member.name}</h3>
                          <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                            {member.title}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.role} · {member.college}
                        </p>
                        <p className="text-sm leading-6 text-slate-700">
                          {member.bio}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="size-3.5" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/*
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Wrench className="size-5 text-emerald-600" />
                网站维护者
              </h2>
              {siteMaintainers.map((member) => (
                <Card
                  key={member.email}
                  className="border-border/70 bg-[linear-gradient(135deg,rgba(16,185,129,0.04),rgba(17,24,39,0.02))]"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
                      <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                        <Wrench className="size-7" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-slate-900">{member.name}</h3>
                          <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                            {member.title}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {member.role} · {member.college}
                        </p>
                        <p className="text-sm leading-6 text-slate-700">
                          {member.bio}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="size-3.5" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            */}

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Trophy className="size-5 text-amber-600" />
                比赛管理员
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {competitionAdmins.map((admin) => (
                  <Card key={admin.name} className="border-border/70">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{admin.name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <Shield className="size-5 text-indigo-600" />
                安全管理员
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {securityAdmins.map((admin) => (
                  <Card key={admin.name} className="border-border/70">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{admin.name}</h3>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <MessageCircle className="size-5 text-emerald-600" />
                加入我们
              </h2>
              <Card className="border-border/70">
                <CardContent className="space-y-4 p-6">
                  <p className="text-sm leading-6 text-slate-700">
                    欢迎对竞赛组织、平台运营和技术建设感兴趣的老师与同学加入我们，一起把学院竞赛服务做得更好。
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {joinContacts.map((contact) => (
                      <div
                        key={contact.label}
                        className="rounded-lg border border-border/70 bg-background p-3"
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {contact.label}
                        </p>
                        {contact.href ? (
                          <a
                            className="break-all text-sm font-semibold text-primary underline-offset-4 hover:underline"
                            href={contact.href}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {contact.value}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold">{contact.value}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">{contact.note}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Section>
      </main>
      <NewFooter />
    </div>
  );
}
