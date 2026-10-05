"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Award, ExternalLink, Eye, EyeOff, Pencil, Save, X } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface DisplaySettings {
  publicShowAvatar: boolean;
  publicShowCollegeMajor: boolean;
  publicShowTitles: boolean;
}

interface HallOfFameStatusCardProps {
  entry: { tag: string; bio: string; status?: string } | null;
  userId: string;
  userName: string;
  displaySettings: DisplaySettings;
}

function HallOfFameProfileForm({
  actionLabel,
  description,
  initialBio,
  initialTag,
  onCancel,
  successMessage,
}: {
  actionLabel: string;
  description: string;
  initialBio: string;
  initialTag: string;
  onCancel?: () => void;
  successMessage: string;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [tag, setTag] = useState(initialTag);
  const [bio, setBio] = useState(initialBio);

  async function handleSubmit() {
    if (!tag.trim()) {
      toast.error("请填写你的竞赛标签");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/me/hall-of-fame", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tag: tag.trim(), bio: bio.trim() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "提交失败" }));
        throw new Error(err.message);
      }

      toast.success(successMessage);
      router.refresh();
      onCancel?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="space-y-1">
          <h4 className="text-sm font-medium">{actionLabel}</h4>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hof-tag">竞赛标签</Label>
          <Input
            id="hof-tag"
            value={tag}
            onChange={(event) => setTag(event.target.value)}
            placeholder="如：数学建模国一、ACM 金牌"
            maxLength={120}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="hof-bio">个人简介</Label>
          <Textarea
            id="hof-bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            rows={4}
            placeholder="简要介绍你的竞赛经历和成果"
            maxLength={500}
          />
        </div>
        <div className="flex gap-2">
          {onCancel ? (
            <Button variant="outline" onClick={onCancel} disabled={submitting}>
              <X className="mr-1 size-4" />
              取消
            </Button>
          ) : null}
          <Button onClick={handleSubmit} disabled={submitting}>
            <Save className="mr-1 size-4" />
            {submitting ? "提交中..." : actionLabel}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function HallOfFameStatusCard({
  entry,
  userId,
  userName,
  displaySettings,
}: HallOfFameStatusCardProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  async function handleWithdraw() {
    setWithdrawing(true);
    try {
      const res = await fetch("/api/me/hall-of-fame", {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "撤回失败" }));
        throw new Error(err.message);
      }

      toast.success("名人堂资料已撤回");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤回失败");
    } finally {
      setWithdrawing(false);
    }
  }

  if (!entry || entry.status === "hidden") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Award className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">暂未开放名人堂填报</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            名人堂资料需要由超级管理员发出邀请后才能填写，普通用户不能自行申请。
          </p>
        </CardContent>
      </Card>
    );
  }

  if (entry.status === "invited") {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/40 dark:to-background">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Award className="size-7 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold">已收到名人堂邀请</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              请完善你的个人标签和简介。提交后将进入超级管理员审核。
            </p>
          </CardContent>
        </Card>
        <HallOfFameProfileForm
          actionLabel="提交资料"
          description="填写完成后会提交给超级管理员审核。"
          initialTag={entry.tag}
          initialBio={entry.bio}
          successMessage="资料已提交，等待超级管理员审核"
        />
      </div>
    );
  }

  if (editing) {
    return (
      <div className="space-y-6">
        <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/40 dark:to-background">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
              <Award className="size-7 text-blue-500" />
            </div>
            <h3 className="text-base font-semibold">{userName}</h3>
            {entry.tag ? <Badge variant="secondary">{entry.tag}</Badge> : null}
          </CardContent>
        </Card>
        <HallOfFameProfileForm
          actionLabel="保存资料"
          description="修改后的内容会直接同步到当前名人堂资料。"
          initialTag={entry.tag}
          initialBio={entry.bio}
          onCancel={() => setEditing(false)}
          successMessage="名人堂资料已更新"
        />
      </div>
    );
  }

  if (entry.status === "candidate") {
    return (
      <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/40 dark:to-background">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
            <Award className="size-7 text-blue-500" />
          </div>
          <h3 className="text-base font-semibold">资料审核中</h3>
          {entry.tag ? <Badge variant="secondary">{entry.tag}</Badge> : null}
          <p className="max-w-md text-sm text-muted-foreground">
            你的名人堂资料正在等待超级管理员审核，通过后会展示在前台名人堂页面。
          </p>
          {entry.bio ? (
            <p className="max-w-md whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
              {entry.bio}
            </p>
          ) : null}
          <Button
            variant="outline"
            size="sm"
            disabled={withdrawing}
            onClick={() => void handleWithdraw()}
          >
            {withdrawing ? "撤回中..." : "撤回资料"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const settingItems = [
    { label: "公开头像", value: displaySettings.publicShowAvatar },
    { label: "公开学院与专业", value: displaySettings.publicShowCollegeMajor },
    { label: "公开头衔", value: displaySettings.publicShowTitles },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/40 dark:to-background">
        <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40">
            <Award className="size-8 text-amber-700 dark:text-amber-400" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{userName}</h3>
              {entry.tag ? <Badge variant="secondary">{entry.tag}</Badge> : null}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {entry.bio || "暂无简介"}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 size-4" />
              编辑
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/profile/${userId}`}>
                <ExternalLink className="mr-1 size-4" />
                查看公开页
              </Link>
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={withdrawing}
              onClick={() => void handleWithdraw()}
            >
              {withdrawing ? "撤回中..." : "撤回展示"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h4 className="mb-3 text-sm font-medium">公开展示设置摘要</h4>
          <p className="mb-4 text-xs text-muted-foreground">
            以下开关可在“我的信息”页面修改。
          </p>
          <div className="space-y-2">
            {settingItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="flex items-center gap-1">
                  {item.value ? (
                    <>
                      <Eye className="size-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-green-700 dark:text-green-400">开启</span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">关闭</span>
                    </>
                  )}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
