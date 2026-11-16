"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, RefreshCw } from "lucide-react";

import {
  buildHallOfFameInvitePayload,
  buildHallOfFameUpdatePayload,
  formatAdminHallOfFameLevelLabel,
  formatAdminInviteStatusLabel,
  formatAdminMemberStatusLabel,
  parseAdminRequestError,
  resolveAdminEntryDisplayName,
} from "@/components/admin/hall-of-fame-helpers";
import { HallOfFameUserPicker } from "@/components/admin/hall-of-fame-user-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type {
  AdminHallOfFameEntry,
  HallOfFameCandidate,
  HallOfFameMemberStatus,
  HallOfFameStatus,
} from "@/lib/contracts/profiles";
import {
  HALL_OF_FAME_LEVEL_CONFIG,
  HALL_OF_FAME_LEVEL_ORDER,
  HALL_OF_FAME_MEMBER_STATUS_LABELS,
  HALL_OF_FAME_STATUS_LABELS,
  HALL_OF_FAME_YEAR_MAX,
  HALL_OF_FAME_YEAR_MIN,
  type HallOfFameLevel,
} from "@/lib/hall-of-fame";
import { requestJSON } from "@/lib/http-client";
import { toast } from "@/lib/i18n/toast";

interface HallOfFameEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AdminHallOfFameEntry | null;
  onSaved: () => Promise<void>;
  onRefreshEntry?: (entryId: string) => Promise<AdminHallOfFameEntry | null>;
  onOpenPromote?: (entry: AdminHallOfFameEntry) => void;
  onPermissionRevoked?: () => void;
}

export function HallOfFameEditDialog({
  open,
  onOpenChange,
  entry,
  onSaved,
  onRefreshEntry,
  onOpenPromote,
  onPermissionRevoked,
}: HallOfFameEditDialogProps) {
  const isEdit = Boolean(entry);
  const currentYear = new Date().getFullYear();

  // 邀请模式状态
  const [selectedCandidate, setSelectedCandidate] =
    useState<HallOfFameCandidate | null>(null);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [inviteLevel, setInviteLevel] = useState<string>("1");
  const [inviteMemberStatus, setInviteMemberStatus] =
    useState<HallOfFameMemberStatus>("serving");
  const [achievementYear, setAchievementYear] = useState<string>(
    String(currentYear),
  );
  const [eventYear, setEventYear] = useState<string>(String(currentYear));
  const [inductionReason, setInductionReason] = useState<string>("");

  // 编辑模式状态（与邀请共用 tag/bio/memberStatus）
  const [displayName, setDisplayName] = useState<string>(
    entry ? resolveAdminEntryDisplayName(entry) : "",
  );
  const [displayGrade, setDisplayGrade] = useState<string>(
    entry?.displayGrade ?? "",
  );
  const [displayCollege, setDisplayCollege] = useState<string>(
    entry?.displayCollege ?? entry?.college ?? "",
  );
  const [displayMajor, setDisplayMajor] = useState<string>(
    entry?.displayMajor ?? "",
  );
  const [editMemberStatus, setEditMemberStatus] =
    useState<HallOfFameMemberStatus>(entry?.memberStatus ?? "serving");
  const [status, setStatus] = useState<HallOfFameStatus>(
    entry?.status ?? "invited",
  );
  const [displayOrder, setDisplayOrder] = useState<string>(
    String(entry?.displayOrder ?? 0),
  );
  const [tag, setTag] = useState<string>(entry?.tag ?? "");
  const [bio, setBio] = useState<string>(entry?.bio ?? "");
  const [adminBio, setAdminBio] = useState<string>(entry?.adminBio ?? "");

  const [activeRevision, setActiveRevision] = useState<number>(
    entry?.revision ?? 0,
  );
  const [hasConflict, setHasConflict] = useState(false);
  const [latestServerEntry, setLatestServerEntry] =
    useState<AdminHallOfFameEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  async function handleInviteSubmit() {
    if (submitting) return;
    const parsedLevel = Number(inviteLevel) as HallOfFameLevel;
    const payloadResult = buildHallOfFameInvitePayload({
      userId: selectedCandidate?.id ?? null,
      confirmed: identityConfirmed,
      level: HALL_OF_FAME_LEVEL_ORDER.includes(parsedLevel) ? parsedLevel : 1,
      memberStatus: inviteMemberStatus,
      achievementYear: Number(achievementYear),
      eventYear: Number(eventYear),
      inductionReason,
      tag,
    });

    if (!payloadResult.ok) {
      setErrorMessage(payloadResult.message);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await requestJSON<unknown>("/api/admin/hall-of-fame", {
        method: "POST",
        json: payloadResult.data,
      });
      toast.success("已发送名人堂邀请");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "发送名人堂邀请失败");
      if (parsedError.isForbidden) {
        onPermissionRevoked?.();
      }
      setErrorMessage(
        parsedError.isConflict
          ? `${parsedError.message}（已保留当前填写的入选理由与年份，便于核对）`
          : parsedError.message,
      );
      toast.error(parsedError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit() {
    if (!entry || submitting) return;
    const payloadResult = buildHallOfFameUpdatePayload({
      expectedRevision: activeRevision,
      displayName,
      displayGrade,
      displayCollege,
      displayMajor,
      memberStatus: editMemberStatus,
      status,
      displayOrder: Number(displayOrder),
      tag,
      bio,
      adminBio,
    });

    if (!payloadResult.ok) {
      setErrorMessage(payloadResult.message);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await requestJSON<unknown>(
        `/api/admin/hall-of-fame/${encodeURIComponent(entry.id)}`,
        {
          method: "PUT",
          json: payloadResult.data,
        },
      );
      toast.success("已更新名人堂成员资料");
      onOpenChange(false);
      await onSaved();
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "更新成员资料失败");
      if (parsedError.isForbidden) {
        onPermissionRevoked?.();
      }
      if (parsedError.isConflict) {
        setHasConflict(true);
      }
      setErrorMessage(parsedError.message);
      toast.error(parsedError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleFetchLatest() {
    if (!entry || !onRefreshEntry || refreshing) return;
    setRefreshing(true);
    try {
      const latest = await onRefreshEntry(entry.id);
      if (latest) {
        setLatestServerEntry(latest);
        toast.info("已读取服务端最新版本，请核对差异后再决定操作");
      }
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "读取最新版本失败");
      setErrorMessage(parsedError.message);
    } finally {
      setRefreshing(false);
    }
  }

  function handleAdoptLatestRevisionOnly() {
    if (!latestServerEntry) return;
    setActiveRevision(latestServerEntry.revision ?? activeRevision);
    setHasConflict(false);
    setLatestServerEntry(null);
    setErrorMessage("");
    toast.info("已更新修订版本号，并保留你的当前输入内容，请确认后保存");
  }

  function handleOverwriteFormWithLatest() {
    if (!latestServerEntry) return;
    setDisplayName(resolveAdminEntryDisplayName(latestServerEntry));
    setDisplayGrade(latestServerEntry.displayGrade ?? "");
    setDisplayCollege(
      latestServerEntry.displayCollege ?? latestServerEntry.college ?? "",
    );
    setDisplayMajor(latestServerEntry.displayMajor ?? "");
    setEditMemberStatus(latestServerEntry.memberStatus ?? "serving");
    setStatus(latestServerEntry.status);
    setDisplayOrder(String(latestServerEntry.displayOrder));
    setTag(latestServerEntry.tag);
    setBio(latestServerEntry.bio);
    setAdminBio(latestServerEntry.adminBio ?? "");
    setActiveRevision(latestServerEntry.revision ?? 0);
    setHasConflict(false);
    setLatestServerEntry(null);
    setErrorMessage("");
    toast.info("已加载服务端最新表单内容");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "编辑名人堂成员资料" : "发起名人堂邀请"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "维护成员展示快照、现役/荣誉身份、排序与状态。等级调整请通过专用进阶操作记录履历。"
              : "请先通过姓名搜索并确认成员四项身份信息，再指定初始等级、成员身份、两个年份与入选理由。"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isEdit && entry ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">当前等级：</span>
                    <span className="font-medium">
                      {formatAdminHallOfFameLevelLabel(entry.level)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (rev.{activeRevision})
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    为保障等级与进阶履历一致，普通编辑不可直接修改等级。
                  </p>
                </div>
                {onOpenPromote ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={submitting}
                    onClick={() => {
                      onOpenChange(false);
                      onOpenPromote(entry);
                    }}
                  >
                    <ArrowUpRight className="mr-1 size-3.5" />
                    {entry.level ? "办理进阶" : "前往定级"}
                  </Button>
                ) : null}
              </div>

              {hasConflict ? (
                <div
                  role="alert"
                  className="space-y-2.5 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive"
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    <div className="space-y-1">
                      <p className="font-medium">保存时发生并发版本冲突（409）</p>
                      <p>
                        {errorMessage ||
                          "其他管理员已修改此成员资料。系统已保留你当前的全部表单输入，不会静默覆盖。"}
                      </p>
                    </div>
                  </div>
                  {onRefreshEntry ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={refreshing}
                        disabled={refreshing || submitting}
                        onClick={() => void handleFetchLatest()}
                        className="h-7 text-xs"
                      >
                        <RefreshCw className="mr-1 size-3" />
                        读取最新版本
                      </Button>
                    </div>
                  ) : null}
                  {latestServerEntry ? (
                    <div className="space-y-2 rounded border border-border bg-background p-2.5 text-foreground">
                      <p className="font-medium">
                        服务端最新版本（rev.{latestServerEntry.revision ?? 0}）：
                      </p>
                      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                        <span>
                          展示姓名：{resolveAdminEntryDisplayName(latestServerEntry)}
                        </span>
                        <span>
                          身份：{formatAdminMemberStatusLabel(latestServerEntry.memberStatus)}
                        </span>
                        <span>
                          状态：{formatAdminInviteStatusLabel(latestServerEntry.status)}
                        </span>
                        <span>标签：{latestServerEntry.tag || "无"}</span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={handleAdoptLatestRevisionOnly}
                          className="h-7 text-xs"
                        >
                          采用新版本号并保留当前草稿
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={handleOverwriteFormWithLatest}
                          className="h-7 text-xs"
                        >
                          用服务端最新值重置表单
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : errorMessage ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-edit-name">展示姓名</Label>
                  <Input
                    id="hof-edit-name"
                    maxLength={100}
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    placeholder="名人堂展示姓名"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-edit-grade">展示年级</Label>
                  <Input
                    id="hof-edit-grade"
                    maxLength={64}
                    value={displayGrade}
                    onChange={(event) => setDisplayGrade(event.target.value)}
                    placeholder="例如：2023级"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-edit-college">展示学院</Label>
                  <Input
                    id="hof-edit-college"
                    maxLength={120}
                    value={displayCollege}
                    onChange={(event) => setDisplayCollege(event.target.value)}
                    placeholder="所属学院"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-edit-major">展示专业</Label>
                  <Input
                    id="hof-edit-major"
                    maxLength={120}
                    value={displayMajor}
                    onChange={(event) => setDisplayMajor(event.target.value)}
                    placeholder="所属专业"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-edit-member-status">成员身份</Label>
                  <Select
                    value={editMemberStatus}
                    onValueChange={(value) =>
                      setEditMemberStatus(value as HallOfFameMemberStatus)
                    }
                  >
                    <SelectTrigger id="hof-edit-member-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serving">
                        {HALL_OF_FAME_MEMBER_STATUS_LABELS.serving}
                      </SelectItem>
                      <SelectItem value="honorary">
                        {HALL_OF_FAME_MEMBER_STATUS_LABELS.honorary}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-edit-status">邀请 / 展示状态</Label>
                  <Select
                    value={status}
                    onValueChange={(value) =>
                      setStatus(value as HallOfFameStatus)
                    }
                  >
                    <SelectTrigger id="hof-edit-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invited">
                        {HALL_OF_FAME_STATUS_LABELS.invited}
                      </SelectItem>
                      <SelectItem value="candidate">
                        {HALL_OF_FAME_STATUS_LABELS.candidate}
                      </SelectItem>
                      <SelectItem value="active">
                        {HALL_OF_FAME_STATUS_LABELS.active}
                      </SelectItem>
                      <SelectItem value="hidden">
                        {HALL_OF_FAME_STATUS_LABELS.hidden}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-edit-order">排序值</Label>
                  <Input
                    id="hof-edit-order"
                    type="number"
                    value={displayOrder}
                    onChange={(event) => setDisplayOrder(event.target.value)}
                  />
                </div>
              </div>

              {entry.status !== "active" && status === "active" ? (
                <p className="text-xs text-muted-foreground">
                  首次发布为“展示中”时，服务端将核验成员是否已提交有效照片及公开授权。
                </p>
              ) : null}

              <div className="grid gap-1.5">
                <Label htmlFor="hof-edit-tag">竞赛标签</Label>
                <Input
                  id="hof-edit-tag"
                  maxLength={120}
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  placeholder="如：数学建模国一、ACM 金牌"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="hof-edit-bio">公开介绍（学生简介）</Label>
                <Textarea
                  id="hof-edit-bio"
                  rows={3}
                  maxLength={500}
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="hof-edit-admin-bio">管理员备注（内部）</Label>
                <Textarea
                  id="hof-edit-admin-bio"
                  rows={2}
                  maxLength={500}
                  value={adminBio}
                  onChange={(event) => setAdminBio(event.target.value)}
                  placeholder="仅管理员内部可见的补充备注"
                />
              </div>
            </>
          ) : (
            <>
              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                >
                  {errorMessage}
                </div>
              ) : null}

              <HallOfFameUserPicker
                selected={selectedCandidate}
                confirmed={identityConfirmed}
                onSelect={(candidate) => setSelectedCandidate(candidate)}
                onConfirmChange={setIdentityConfirmed}
                disabled={submitting}
                onPermissionRevoked={onPermissionRevoked}
              />

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-invite-level">入选等级</Label>
                  <Select value={inviteLevel} onValueChange={setInviteLevel}>
                    <SelectTrigger id="hof-invite-level">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {HALL_OF_FAME_LEVEL_ORDER.map((lvl) => (
                        <SelectItem key={lvl} value={String(lvl)}>
                          {HALL_OF_FAME_LEVEL_CONFIG[lvl].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-invite-member-status">成员身份</Label>
                  <Select
                    value={inviteMemberStatus}
                    onValueChange={(value) =>
                      setInviteMemberStatus(value as HallOfFameMemberStatus)
                    }
                  >
                    <SelectTrigger id="hof-invite-member-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="serving">
                        {HALL_OF_FAME_MEMBER_STATUS_LABELS.serving}
                      </SelectItem>
                      <SelectItem value="honorary">
                        {HALL_OF_FAME_MEMBER_STATUS_LABELS.honorary}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-invite-achievement-year">成绩年份</Label>
                  <Input
                    id="hof-invite-achievement-year"
                    type="number"
                    min={HALL_OF_FAME_YEAR_MIN}
                    max={HALL_OF_FAME_YEAR_MAX}
                    value={achievementYear}
                    onChange={(event) => setAchievementYear(event.target.value)}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="hof-invite-event-year">入选年份</Label>
                  <Input
                    id="hof-invite-event-year"
                    type="number"
                    min={HALL_OF_FAME_YEAR_MIN}
                    max={HALL_OF_FAME_YEAR_MAX}
                    value={eventYear}
                    onChange={(event) => setEventYear(event.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="hof-invite-reason">入选理由（必填）</Label>
                <Textarea
                  id="hof-invite-reason"
                  rows={3}
                  maxLength={500}
                  value={inductionReason}
                  onChange={(event) => setInductionReason(event.target.value)}
                  placeholder="请填写本次邀请该成员入选的依据与竞赛表现（纯文本）"
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="hof-invite-tag">初始标签（选填）</Label>
                <Input
                  id="hof-invite-tag"
                  maxLength={120}
                  value={tag}
                  onChange={(event) => setTag(event.target.value)}
                  placeholder="邀请阶段可留空，或预先填写头衔标签"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          {isEdit ? (
            <Button
              type="button"
              loading={submitting}
              disabled={submitting || refreshing}
              onClick={() => void handleEditSubmit()}
            >
              {submitting ? "保存中..." : "保存修改"}
            </Button>
          ) : (
            <Button
              type="button"
              loading={submitting}
              disabled={submitting}
              onClick={() => void handleInviteSubmit()}
            >
              {submitting ? "发送中..." : "确认发送邀请"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
