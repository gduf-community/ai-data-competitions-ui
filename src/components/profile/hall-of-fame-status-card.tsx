"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Award,
  ExternalLink,
  Eye,
  EyeOff,
  Info,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import {
  HallOfFamePhotoField,
  sanitizeOwnerPortraitPreviewSrc,
} from "@/components/profile/hall-of-fame-photo-field";
import { HallOfFamePhotoRequestSection } from "@/components/profile/hall-of-fame-photo-request-section";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  meHallOfFameActiveUpdateSchema,
  meHallOfFameFirstSubmissionSchema,
  type MeHallOfFameEntry,
} from "@/lib/contracts/profiles";
import {
  getHallOfFameLevelMeta,
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  HALL_OF_FAME_PHOTO_STATUS_LABELS,
  sanitizePublicPortraitSrc,
  type HallPortraitUploadRef,
} from "@/lib/hall-of-fame";
import { HttpRequestError, requestJSON } from "@/lib/http-client";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

interface DisplaySettings {
  publicShowAvatar: boolean;
  publicShowCollegeMajor: boolean;
  publicShowTitles: boolean;
}

export interface HallOfFameUserSnapshot {
  name: string;
  grade: string | null;
  college: string | null;
  major: string | null;
}

interface HallOfFameStatusCardProps {
  entry: MeHallOfFameEntry | null;
  userId: string;
  userName: string;
  userSnapshot?: HallOfFameUserSnapshot;
  displaySettings: DisplaySettings;
}

function readPutErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpRequestError) {
    if (error.status === 409) {
      return error.message || "记录已被管理员更新，请刷新页面核对最新状态后再提交";
    }
    if (error.status === 403) {
      return error.message || "当前状态或权限暂不支持该操作，请刷新页面核对";
    }
    if (error.status === 413) {
      return error.message || "提交内容或照片体积超出限制，请精简后重试";
    }
    if (error.status === 429) {
      return error.message || "提交过于频繁，请稍候再试";
    }
    if (error.status === 503) {
      return error.message || "服务暂不可用，请保留当前内容稍后重试";
    }
    return error.message || fallback;
  }
  return error instanceof Error && error.message.trim()
    ? error.message
    : fallback;
}

function AdminAssignedSummary({ entry }: { entry: MeHallOfFameEntry }) {
  const levelLabel = entry.level
    ? getHallOfFameLevelMeta(entry.level).name
    : "待管理员核定";
  const statusLabel = entry.memberStatus
    ? HALL_OF_FAME_MEMBER_STATUS_LABELS[entry.memberStatus]
    : "待核定";

  return (
    <div className="grid gap-3 rounded-xl border border-blue-200/70 bg-blue-50/50 p-4 text-left text-sm dark:border-blue-900/50 dark:bg-blue-950/30 sm:grid-cols-2">
      <div>
        <span className="text-xs text-muted-foreground">管理员拟定等级</span>
        <p className="font-medium">{levelLabel}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">成员身份</span>
        <p className="font-medium">{statusLabel}</p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">取得成绩年份</span>
        <p className="font-medium">
          {entry.achievementYear ? `${entry.achievementYear} 年` : "待补充"}
        </p>
      </div>
      <div>
        <span className="text-xs text-muted-foreground">入选年份</span>
        <p className="font-medium">
          {entry.eventYear ? `${entry.eventYear} 年` : "待补充"}
        </p>
      </div>
      {entry.inductionReason ? (
        <div className="sm:col-span-2">
          <span className="text-xs text-muted-foreground">入选理由（管理员预设，只读）</span>
          <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
            {entry.inductionReason}
          </p>
        </div>
      ) : null}
    </div>
  );
}

function HallOfFameFirstSubmissionForm({
  entry,
  userName,
  userSnapshot,
  mode,
  onCancel,
  onRefresh,
}: {
  entry: MeHallOfFameEntry;
  userName: string;
  userSnapshot?: HallOfFameUserSnapshot;
  mode: "invited" | "candidate";
  onCancel?: () => void;
  onRefresh: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState(
    entry.displayName ?? userSnapshot?.name ?? userName ?? "",
  );
  const [displayGrade, setDisplayGrade] = useState(
    entry.displayGrade ?? userSnapshot?.grade ?? "",
  );
  const [displayCollege, setDisplayCollege] = useState(
    entry.displayCollege ?? userSnapshot?.college ?? "",
  );
  const [displayMajor, setDisplayMajor] = useState(
    entry.displayMajor ?? userSnapshot?.major ?? "",
  );
  const [tag, setTag] = useState(entry.tag ?? "");
  const [bio, setBio] = useState(entry.bio ?? "");
  const [photoRef, setPhotoRef] = useState<HallPortraitUploadRef | null>(null);
  const [publicConsent, setPublicConsent] = useState<boolean>(
    mode === "candidate" ? Boolean(entry.publicConsentAt) : false,
  );

  const hasExistingCandidatePortrait =
    mode === "candidate" &&
    Boolean(
      entry.hasPortrait ||
        entry.photoStatus === "pending" ||
        entry.pendingPortraitPreviewUrl,
    );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting || uploadingPhoto) return;

    setSubmitError(null);

    if (photoRef || !hasExistingCandidatePortrait) {
      const parsed = meHallOfFameFirstSubmissionSchema.safeParse({
        displayName,
        displayGrade,
        displayCollege,
        displayMajor,
        tag,
        bio,
        photoKey: photoRef?.photoKey ?? "",
        photoThumbKey: photoRef?.photoThumbKey ?? null,
        publicConsent,
        expectedRevision: entry.revision,
      });

      if (!parsed.success) {
        const message =
          parsed.error.issues[0]?.message ?? "请完整核对所有必填信息";
        setSubmitError(message);
        toast.error(message);
        return;
      }

      setSubmitting(true);
      try {
        await requestJSON<unknown>("/api/me/hall-of-fame", {
          method: "PUT",
          json: parsed.data,
        });
        toast.success(
          mode === "invited"
            ? "资料已提交，等待超级管理员审核（审核通过前不会公开展示）"
            : "待审核资料已更新，请继续等待管理员审核",
        );
        onRefresh();
        onCancel?.();
      } catch (error) {
        if (error instanceof HttpRequestError && error.status === 400) {
          const msg = error.message || "提交资料校验失败，请核对后重试";
          if (/照片|photo/i.test(msg)) {
            setPhotoRef(null);
          }
          setSubmitError(msg);
          toast.error(msg);
        } else {
          const msg = readPutErrorMessage(error, "提交失败，请稍后重试");
          setSubmitError(msg);
          toast.error(msg);
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // candidate 修订文本但沿用服务端已有待审照片
    const textOnlyCheck = meHallOfFameFirstSubmissionSchema
      .omit({ photoKey: true, photoThumbKey: true })
      .safeParse({
        displayName,
        displayGrade,
        displayCollege,
        displayMajor,
        tag,
        bio,
        publicConsent,
        expectedRevision: entry.revision,
      });

    if (!textOnlyCheck.success) {
      const message =
        textOnlyCheck.error.issues[0]?.message ?? "请完整核对所有必填信息";
      setSubmitError(message);
      toast.error(message);
      return;
    }

    setSubmitting(true);
    try {
      await requestJSON<unknown>("/api/me/hall-of-fame", {
        method: "PUT",
        json: textOnlyCheck.data,
      });
      toast.success("待审核资料已更新");
      onRefresh();
      onCancel?.();
    } catch (error) {
      const msg = readPutErrorMessage(error, "保存失败，请稍后重试");
      setSubmitError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form className="space-y-5" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1">
            <h4 className="text-base font-semibold">
              {mode === "invited" ? "确认并提交名人堂展示资料" : "修改待审核资料"}
            </h4>
            <p className="text-sm text-muted-foreground">
              等级、身份与入选年份由超级管理员统一维护（只读）；提交后资料进入「待审核」状态，审核通过前不会公开展示。
            </p>
          </div>

          <AdminAssignedSummary entry={entry} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="hof-display-name">展示姓名</Label>
              <Input
                id="hof-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="请输入公开展示姓名"
                maxLength={100}
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hof-display-grade">展示年级</Label>
              <Input
                id="hof-display-grade"
                value={displayGrade}
                onChange={(e) => setDisplayGrade(e.target.value)}
                placeholder="如：2023级"
                maxLength={64}
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hof-display-college">展示学院</Label>
              <Input
                id="hof-display-college"
                value={displayCollege}
                onChange={(e) => setDisplayCollege(e.target.value)}
                placeholder="请输入所在学院"
                maxLength={120}
                disabled={submitting}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="hof-display-major">展示专业</Label>
              <Input
                id="hof-display-major"
                value={displayMajor}
                onChange={(e) => setDisplayMajor(e.target.value)}
                placeholder="请输入所学专业"
                maxLength={120}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hof-tag">竞赛标签</Label>
            <Input
              id="hof-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="如：数学建模国一、ACM 金牌"
              maxLength={120}
              disabled={submitting}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="hof-bio">个人简介</Label>
            <Textarea
              id="hof-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              placeholder="简要介绍你的竞赛经历和成果（选填）"
              maxLength={500}
              disabled={submitting}
            />
          </div>

          <HallOfFamePhotoField
            value={photoRef}
            existingPreviewUrl={
              hasExistingCandidatePortrait
                ? entry.pendingPortraitPreviewUrl ??
                  entry.portraitThumbUrl ??
                  entry.portraitUrl ??
                  null
                : null
            }
            onChange={(next) => {
              setPhotoRef(next);
              if (next) setSubmitError(null);
            }}
            onUploadingChange={setUploadingPhoto}
            disabled={submitting}
            inputId="hof-first-photo-input"
            label={mode === "invited" ? "本人展示照片（必填）" : "更新待审核展示照片"}
            helperText={
              hasExistingCandidatePortrait
                ? "你已上传待审核照片；如需更换可重新选择上传，否则将沿用当前待审照片。"
                : "请上传清晰的 JPG / PNG / WebP 正面照片（最大 5MB）。上传成功不代表已提交或公开，也不会修改账号头像。"
            }
          />

          <div className="flex items-start gap-3 rounded-lg border border-border/80 bg-muted/20 p-3.5">
            <Checkbox
              id="hof-public-consent"
              checked={publicConsent}
              onCheckedChange={(checked) => {
                setPublicConsent(checked === true);
                if (checked === true) setSubmitError(null);
              }}
              disabled={submitting}
            />
            <Label
              htmlFor="hof-public-consent"
              className="cursor-pointer text-sm font-normal leading-relaxed"
            >
              我已核对以上姓名、年级、学院、专业及个人照片，明确同意在超级管理员审核通过后将上述信息与照片公开展示在平台名人堂页面。
            </Label>
          </div>

          {submitError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {onCancel ? (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={submitting || uploadingPhoto}
              >
                <X className="mr-1 size-4" />
                取消
              </Button>
            ) : null}
            <Button
              type="submit"
              loading={submitting}
              disabled={submitting || uploadingPhoto}
            >
              <Save className="mr-1 size-4" />
              {submitting
                ? "提交中..."
                : uploadingPhoto
                  ? "等待照片上传..."
                  : mode === "invited"
                    ? "提交资料进入审核"
                    : "保存待审资料"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function HallOfFameActiveProfileForm({
  entry,
  onCancel,
  onRefresh,
}: {
  entry: MeHallOfFameEntry;
  onCancel: () => void;
  onRefresh: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [tag, setTag] = useState(entry.tag);
  const [bio, setBio] = useState(entry.bio);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setFormError(null);

    const parsed = meHallOfFameActiveUpdateSchema.safeParse({
      tag,
      bio,
      expectedRevision: entry.revision,
    });

    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "请填写有效的竞赛标签与简介";
      setFormError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    try {
      await requestJSON<unknown>("/api/me/hall-of-fame", {
        method: "PUT",
        json: parsed.data,
      });
      toast.success("名人堂标签与简介已更新");
      onRefresh();
      onCancel();
    } catch (error) {
      const msg = readPutErrorMessage(error, "保存失败，请稍后重试");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1">
            <h4 className="text-sm font-medium">编辑竞赛标签与简介</h4>
            <p className="text-xs text-muted-foreground">
              正式成员仅可在此修改竞赛标签和个人简介；入选等级与成员身份由管理员维护，更换展示照片请使用下方的换照申请入口。
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hof-active-tag">竞赛标签</Label>
            <Input
              id="hof-active-tag"
              value={tag}
              onChange={(event) => setTag(event.target.value)}
              placeholder="如：数学建模国一、ACM 金牌"
              maxLength={120}
              disabled={submitting}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hof-active-bio">个人简介</Label>
            <Textarea
              id="hof-active-bio"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              rows={4}
              placeholder="简要介绍你的竞赛经历和成果"
              maxLength={500}
              disabled={submitting}
            />
          </div>
          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={submitting}
            >
              <X className="mr-1 size-4" />
              取消
            </Button>
            <Button type="submit" loading={submitting} disabled={submitting}>
              <Save className="mr-1 size-4" />
              {submitting ? "保存中..." : "保存资料"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export interface HallOfFameStatusCardViewProps extends HallOfFameStatusCardProps {
  onRefresh: () => void;
  photoRequestSlot?: React.ReactNode;
}

export function HallOfFameStatusCardView({
  entry,
  userId,
  userName,
  userSnapshot,
  displaySettings,
  onRefresh,
  photoRequestSlot,
}: HallOfFameStatusCardViewProps) {
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  async function handleWithdraw() {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      const res = await fetchWithCsrf("/api/me/hall-of-fame", {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "撤回失败" }));
        throw new Error(
          typeof err?.message === "string" ? err.message : "撤回失败",
        );
      }

      toast.success("名人堂资料已撤回");
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤回失败");
    } finally {
      setWithdrawing(false);
    }
  }

  if (!entry) {
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

  if (entry.status === "hidden") {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <EyeOff className="size-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold">当前名人堂资料已归档隐藏</h3>
          <p className="max-w-md text-sm text-muted-foreground">
            你的名人堂展示目前处于隐藏状态，公开页面不会展示该记录。如需恢复或核对，请联系超级管理员。
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
              请核对个人展示资料、上传专用展示照片并勾选公开同意授权。提交后将进入超级管理员审核。
            </p>
          </CardContent>
        </Card>
        <HallOfFameFirstSubmissionForm
          entry={entry}
          userName={userName}
          userSnapshot={userSnapshot}
          mode="invited"
          onRefresh={onRefresh}
        />
      </div>
    );
  }

  if (entry.status === "candidate") {
    if (editing) {
      return (
        <HallOfFameFirstSubmissionForm
          entry={entry}
          userName={userName}
          userSnapshot={userSnapshot}
          mode="candidate"
          onCancel={() => setEditing(false)}
          onRefresh={onRefresh}
        />
      );
    }

    const photoStatusLabel = entry.photoStatus
      ? HALL_OF_FAME_PHOTO_STATUS_LABELS[entry.photoStatus]
      : "待审核";
    const candidatePreviewSrc = sanitizeOwnerPortraitPreviewSrc(
      entry.pendingPortraitPreviewUrl ??
        entry.portraitThumbUrl ??
        entry.portraitUrl ??
        null,
    );

    return (
      <Card className="border-blue-200/60 bg-gradient-to-br from-blue-50/80 to-white dark:from-blue-950/40 dark:to-background">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-col items-center gap-3 text-center">
            {candidatePreviewSrc ? (
              <div className="relative aspect-[3/4] w-24 overflow-hidden rounded-xl border border-blue-200/80 bg-muted/40">
                {/* 个人待审受控预览经 sanitizeOwnerPortraitPreviewSrc 过滤 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={candidatePreviewSrc}
                  alt={`${entry.displayName || userName} 待审照片预览`}
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div className="flex size-14 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/40">
                <Award className="size-7 text-blue-500" />
              </div>
            )}
            <h3 className="text-base font-semibold">资料审核中（尚未公开展示）</h3>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {entry.level ? (
                <Badge variant="secondary">
                  {getHallOfFameLevelMeta(entry.level).name}
                </Badge>
              ) : null}
              {entry.memberStatus ? (
                <Badge variant="outline">
                  {HALL_OF_FAME_MEMBER_STATUS_LABELS[entry.memberStatus]}
                </Badge>
              ) : null}
              <Badge variant="outline">照片状态：{photoStatusLabel}</Badge>
              {entry.tag ? <Badge variant="secondary">{entry.tag}</Badge> : null}
            </div>
            <p className="max-w-lg text-sm text-muted-foreground">
              你的名人堂资料与专用照片正在等待超级管理员审核，通过前不会在前台名人堂页面展示。
            </p>
          </div>

          <div className="grid gap-3 rounded-lg border border-blue-200/60 bg-background/70 p-4 text-sm sm:grid-cols-2">
            <div>
              <span className="text-xs text-muted-foreground">展示姓名</span>
              <p className="font-medium">{entry.displayName || userName}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">年级 / 学院 / 专业</span>
              <p className="font-medium">
                {[entry.displayGrade, entry.displayCollege, entry.displayMajor]
                  .filter(Boolean)
                  .join(" · ") || "未填写"}
              </p>
            </div>
            {entry.bio ? (
              <div className="sm:col-span-2">
                <span className="text-xs text-muted-foreground">个人简介</span>
                <p className="mt-0.5 whitespace-pre-wrap break-words leading-relaxed">
                  {entry.bio}
                </p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(true)}
              disabled={withdrawing}
            >
              <Pencil className="mr-1 size-4" />
              修改待审资料
            </Button>
            <Button
              loading={withdrawing}
              variant="outline"
              size="sm"
              disabled={withdrawing}
              onClick={() => void handleWithdraw()}
            >
              {withdrawing ? "撤回中..." : "撤回资料"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // status === "active"
  const safePortraitUrl = sanitizePublicPortraitSrc(
    entry.portraitThumbUrl ?? entry.portraitUrl ?? null,
  );
  const shownName = entry.displayName?.trim() || userSnapshot?.name || userName;
  const shownSubline = [
    entry.displayGrade,
    entry.displayCollege,
    entry.displayMajor,
  ]
    .filter(Boolean)
    .join(" · ");
  const needsMigrationFill =
    Boolean(entry.requiresMigrationProfileFill) ||
    entry.level == null ||
    !entry.publicConsentAt;

  const settingItems = [
    { label: "公开头像", value: displaySettings.publicShowAvatar },
    { label: "公开学院与专业", value: displaySettings.publicShowCollegeMajor },
    { label: "公开头衔", value: displaySettings.publicShowTitles },
  ];

  return (
    <div className="space-y-6">
      {needsMigrationFill ? (
        <Card className="border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30">
          <CardContent className="flex items-start gap-3 p-4 text-sm text-amber-950 dark:text-amber-100">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1">
              <p className="font-medium">历史正式成员档案补录说明</p>
              <p className="text-xs leading-relaxed text-amber-800/90 dark:text-amber-200/80">
                你的名人堂资格在三级体系与独立照片规范上线前已生效，当前仍可正常访问与修改标签/简介。正式等级划分由管理员按迁移流程统一核定补录；如需补交或更新正式展示照片，可直接使用下方的「申请修改名人堂展示照片」。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {editing ? (
        <HallOfFameActiveProfileForm
          entry={entry}
          onCancel={() => setEditing(false)}
          onRefresh={onRefresh}
        />
      ) : (
        <Card className="border-amber-200/60 bg-gradient-to-br from-amber-50/80 to-white dark:from-amber-950/40 dark:to-background">
          <CardContent className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-amber-200/80 bg-gradient-to-br from-amber-100 to-amber-200 dark:border-amber-800/60 dark:from-amber-900/40 dark:to-amber-800/40">
              {safePortraitUrl ? (
                // 受控服务端签发/公开路径经 sanitizePublicPortraitSrc 过滤后展示
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={safePortraitUrl}
                  alt={`${shownName} 名人堂照片`}
                  className="size-full object-cover"
                />
              ) : (
                <Award className="size-8 text-amber-700 dark:text-amber-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{shownName}</h3>
                {entry.level ? (
                  <Badge variant="default">
                    {getHallOfFameLevelMeta(entry.level).name}
                  </Badge>
                ) : (
                  <Badge variant="outline">历史待定级</Badge>
                )}
                {entry.memberStatus ? (
                  <Badge variant="outline">
                    {HALL_OF_FAME_MEMBER_STATUS_LABELS[entry.memberStatus]}
                  </Badge>
                ) : null}
                {entry.tag ? <Badge variant="secondary">{entry.tag}</Badge> : null}
              </div>
              {shownSubline ? (
                <p className="text-xs text-muted-foreground">{shownSubline}</p>
              ) : null}
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                {entry.bio || "暂无简介"}
              </p>
            </div>

            <div className="flex flex-wrap shrink-0 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(true)}
              >
                <Pencil className="mr-1 size-4" />
                编辑标签与简介
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/profile/${encodeURIComponent(userId)}`}>
                  <ExternalLink className="mr-1 size-4" />
                  查看公开页
                </Link>
              </Button>
              <Button
                loading={withdrawing}
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
      )}

      {photoRequestSlot ?? (
        <HallOfFamePhotoRequestSection
          entryRevision={entry.revision ?? 0}
          currentPortraitUrl={safePortraitUrl}
        />
      )}

      <Card>
        <CardContent className="p-6">
          <h4 className="mb-3 text-sm font-medium">公开展示设置摘要</h4>
          <p className="mb-4 text-xs text-muted-foreground">
            以下开关可在“我的信息”页面修改。历史正式成员在独立公开授权与档案迁移完成后将以正式展示快照为准。
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

export function HallOfFameStatusCard(props: HallOfFameStatusCardProps) {
  const router = useRouter();
  return (
    <HallOfFameStatusCardView
      {...props}
      onRefresh={() => router.refresh()}
    />
  );
}
