"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, RefreshCw } from "lucide-react";

import {
  buildHallOfFameMilestonePayload,
  formatAdminHallOfFameLevelLabel,
  parseAdminRequestError,
  resolveAdminEntryDisplayName,
} from "@/components/admin/hall-of-fame-helpers";
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
import type { AdminHallOfFameEntry } from "@/lib/contracts/profiles";
import {
  HALL_OF_FAME_LEVEL_CONFIG,
  HALL_OF_FAME_YEAR_MAX,
  HALL_OF_FAME_YEAR_MIN,
  getAllowedPromotionTargets,
  type HallOfFameLevel,
} from "@/lib/hall-of-fame";
import { requestJSON } from "@/lib/http-client";
import { toast } from "@/lib/i18n/toast";

interface HallOfFamePromoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: AdminHallOfFameEntry | null;
  onPromoted: () => Promise<void>;
  onRefreshEntry?: (entryId: string) => Promise<AdminHallOfFameEntry | null>;
  onPermissionRevoked?: () => void;
}

export function HallOfFamePromoteDialog({
  open,
  onOpenChange,
  entry,
  onPromoted,
  onRefreshEntry,
  onPermissionRevoked,
}: HallOfFamePromoteDialogProps) {
  const fromLevel = entry?.level ?? null;
  const targets = getAllowedPromotionTargets(fromLevel);
  const currentYear = new Date().getFullYear();

  const [toLevel, setToLevel] = useState<string>(
    targets[0] ? String(targets[0]) : "",
  );
  const [achievementYear, setAchievementYear] = useState<string>(
    String(currentYear),
  );
  const [eventYear, setEventYear] = useState<string>(String(currentYear));
  const [reason, setReason] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [conflictEntry, setConflictEntry] =
    useState<AdminHallOfFameEntry | null>(null);
  const [hasConflict, setHasConflict] = useState(false);
  const [activeRevision, setActiveRevision] = useState<number>(
    entry?.revision ?? 0,
  );

  if (!entry) {
    return null;
  }

  const displayName = resolveAdminEntryDisplayName(entry);
  const effectiveEntry = conflictEntry ?? entry;
  const effectiveFromLevel = effectiveEntry.level ?? null;
  const effectiveTargets = getAllowedPromotionTargets(effectiveFromLevel);

  async function handleSubmit() {
    if (!entry || submitting || effectiveTargets.length === 0) return;

    const parsedLevel = Number(toLevel);
    const targetLevel = effectiveTargets.find((item) => item === parsedLevel);
    if (!targetLevel) {
      setErrorMessage("请选择配置允许的目标等级。");
      return;
    }

    const payloadResult = buildHallOfFameMilestonePayload({
      fromLevel: effectiveFromLevel,
      toLevel: targetLevel,
      achievementYear: Number(achievementYear),
      eventYear: Number(eventYear),
      reason,
      expectedRevision: activeRevision,
    });

    if (!payloadResult.ok) {
      setErrorMessage(payloadResult.message);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    try {
      await requestJSON<unknown>(
        `/api/admin/hall-of-fame/${encodeURIComponent(entry.id)}/milestones`,
        {
          method: "POST",
          json: payloadResult.data,
        },
      );
      toast.success(
        effectiveFromLevel === null ? "已记录初始定级与履历" : "进阶操作已保存",
      );
      onOpenChange(false);
      await onPromoted();
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "进阶操作失败");
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

  async function handleRefreshLatest() {
    if (!entry || !onRefreshEntry || refreshing) return;
    setRefreshing(true);
    try {
      const latest = await onRefreshEntry(entry.id);
      if (latest) {
        setConflictEntry(latest);
        setActiveRevision(latest.revision ?? 0);
        setHasConflict(false);
        setErrorMessage("");
        const nextTargets = getAllowedPromotionTargets(latest.level ?? null);
        if (nextTargets.length > 0 && !nextTargets.includes(Number(toLevel) as HallOfFameLevel)) {
          setToLevel(String(nextTargets[0]));
        }
        toast.info("已读取最新版本信息，请核对后决定是否提交");
      }
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "读取最新版本失败");
      setErrorMessage(parsedError.message);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="size-4 text-primary" />
            {effectiveFromLevel === null ? "成员定级与初始履历" : "办理成员进阶"}
          </DialogTitle>
          <DialogDescription>
            成员：{displayName} · 进阶记录与等级更新在同一事务中完成，不会根据数字大小猜测方向。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-muted-foreground">当前等级</span>
              <span className="font-medium">
                {formatAdminHallOfFameLevelLabel(effectiveFromLevel)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>当前修订版本</span>
              <span>rev.{activeRevision}</span>
            </div>
          </div>

          {hasConflict ? (
            <div
              role="alert"
              className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="space-y-1">
                  <p className="font-medium">检测到并发版本冲突（409）</p>
                  <p>
                    {errorMessage ||
                      "该成员资料已被其他管理员更新。已保留你当前输入的年份与理由，请先读取最新版本核对。"}
                  </p>
                </div>
              </div>
              {onRefreshEntry ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  loading={refreshing}
                  disabled={refreshing || submitting}
                  onClick={() => void handleRefreshLatest()}
                  className="h-7 text-xs"
                >
                  <RefreshCw className="mr-1 size-3" />
                  读取最新版本并核对
                </Button>
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

          {effectiveTargets.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              当前成员已处于配置中的最高进阶等级，暂无可进阶目标等级。
            </div>
          ) : (
            <>
              <div className="grid gap-2">
                <Label htmlFor="hof-promote-target">目标等级</Label>
                <Select value={toLevel} onValueChange={setToLevel}>
                  <SelectTrigger id="hof-promote-target">
                    <SelectValue placeholder="请选择目标等级" />
                  </SelectTrigger>
                  <SelectContent>
                    {effectiveTargets.map((target) => (
                      <SelectItem key={target} value={String(target)}>
                        {HALL_OF_FAME_LEVEL_CONFIG[target].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="hof-promote-achievement-year">成绩年份</Label>
                  <Input
                    id="hof-promote-achievement-year"
                    type="number"
                    min={HALL_OF_FAME_YEAR_MIN}
                    max={HALL_OF_FAME_YEAR_MAX}
                    value={achievementYear}
                    onChange={(event) => setAchievementYear(event.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    取得获奖或竞赛成绩的年份
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="hof-promote-event-year">
                    {effectiveFromLevel === null ? "入选年份" : "进阶年份"}
                  </Label>
                  <Input
                    id="hof-promote-event-year"
                    type="number"
                    min={HALL_OF_FAME_YEAR_MIN}
                    max={HALL_OF_FAME_YEAR_MAX}
                    value={eventYear}
                    onChange={(event) => setEventYear(event.target.value)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    实际完成定级或晋级的年份
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="hof-promote-reason">
                  {effectiveFromLevel === null ? "定级/入选理由" : "进阶理由"}
                </Label>
                <Textarea
                  id="hof-promote-reason"
                  rows={4}
                  maxLength={500}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="请填写本次定级或进阶所依据的竞赛表现与事迹（纯文本，最多 500 字）"
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
          {effectiveTargets.length > 0 ? (
            <Button
              type="button"
              loading={submitting}
              disabled={submitting || refreshing}
              onClick={() => void handleSubmit()}
            >
              {submitting ? "提交中..." : "确认提交"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
