"use client";

import { useState } from "react";
import { AlertTriangle, Check, RefreshCw, ShieldAlert, X } from "lucide-react";

import {
  buildHallOfFamePhotoReviewPayload,
  canApprovePhotoPreview,
  formatAdminDateTime,
  formatAdminHallOfFameLevelLabel,
  formatAdminMemberStatusLabel,
  parseAdminRequestError,
  reconcilePhotoReviewConflict,
  type PhotoReviewConflictResult,
} from "@/components/admin/hall-of-fame-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AdminHallOfFamePhotoRequest } from "@/lib/contracts/profiles";
import {
  HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS,
  sanitizePublicPortraitSrc,
} from "@/lib/hall-of-fame";
import { requestJSON } from "@/lib/http-client";
import { toast } from "@/lib/i18n/toast";

interface HallOfFamePhotoReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: AdminHallOfFamePhotoRequest | null;
  canManage: boolean;
  canViewPreview: boolean;
  onReviewed: (action: "approve" | "reject" | "undo_approve") => Promise<void>;
  onConflictRefresh: (
    requestId: string,
  ) => Promise<AdminHallOfFamePhotoRequest | null>;
  onPermissionRevoked?: () => void;
}

interface HallOfFamePhotoReviewPanelProps {
  request: AdminHallOfFamePhotoRequest;
  canManage: boolean;
  canViewPreview: boolean;
  initialConflictState?: PhotoReviewConflictResult | null;
  initialDraftReason?: string;
  onClose: () => void;
  onReviewed: (action: "approve" | "reject" | "undo_approve") => Promise<void>;
  onConflictRefresh: (
    requestId: string,
  ) => Promise<AdminHallOfFamePhotoRequest | null>;
  onPermissionRevoked?: () => void;
}

export function HallOfFamePhotoReviewPanel({
  request,
  canManage,
  canViewPreview,
  initialConflictState = null,
  initialDraftReason,
  onClose,
  onReviewed,
  onConflictRefresh,
  onPermissionRevoked,
}: HallOfFamePhotoReviewPanelProps) {
  const [syncedRequest, setSyncedRequest] =
    useState<AdminHallOfFamePhotoRequest>(request);
  const [conflictState, setConflictState] =
    useState<PhotoReviewConflictResult | null>(initialConflictState);

  const activeRequest =
    conflictState?.kind === "terminal"
      ? conflictState.nextRequest
      : syncedRequest;
  const isPending = activeRequest.status === "pending";
  const isInitialRequest = activeRequest.requestKind === "initial";
  const allowAuthorizedPreview =
    canViewPreview === true &&
    (isPending || Boolean(activeRequest.previewUrl));
  const initialPreviewStatus =
    canViewPreview !== true
      ? "forbidden"
      : allowAuthorizedPreview
        ? "loading"
        : "idle";

  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "loading" | "loaded" | "error" | "forbidden"
  >(initialPreviewStatus);
  const [retryToken, setRetryToken] = useState(0);
  const [reason, setReason] = useState(
    initialDraftReason ?? request.rejectionReason ?? "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [syncingConflict, setSyncingConflict] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [conflictNotice, setConflictNotice] = useState("");

  const currentPortraitSrc = sanitizePublicPortraitSrc(
    activeRequest.currentPortraitThumbUrl ?? activeRequest.currentPortraitUrl,
  );
  const authorizedPreviewSrc = allowAuthorizedPreview
    ? `/api/admin/hall-of-fame/photo-requests/${encodeURIComponent(activeRequest.id)}/preview?v=${retryToken}`
    : null;

  const lockedByConflict =
    conflictState !== null && conflictState.lockActions === true;

  const approveEnabled = canApprovePhotoPreview({
    canManage,
    status: activeRequest.status,
    previewStatus,
    submitting,
    lockedByConflict,
  });

  async function syncLatestAfterConflict(targetId: string) {
    setSyncingConflict(true);
    try {
      const latest = await onConflictRefresh(targetId);
      const resolution = reconcilePhotoReviewConflict(activeRequest, latest);
      setConflictState(resolution);
      if (resolution.kind === "terminal") {
        setSyncedRequest(resolution.nextRequest);
        setConflictNotice(
          `该申请已在服务端变为「${HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS[resolution.nextRequest.status]}」，已锁定并停止提交旧请求。`,
        );
      } else if (resolution.kind === "revision_changed") {
        setConflictNotice(
          `成员版本已更新至 rev.${resolution.pendingLatest.expectedRevision}，当前旧版本已锁定；请确认同步最新版本后再核对提交，系统不会自动重放批准。`,
        );
      } else {
        setConflictNotice(
          "当前列表页与全量首页均未查询到该申请的最新记录（可能已撤回或位于更后分页）。为防止使用过期版本提交，已锁定审批操作。",
        );
      }
    } catch {
      setConflictState({
        kind: "missing",
        nextRequest: activeRequest,
        lockActions: true,
      });
      setConflictNotice(
        "刷新该申请最新状态失败，为防止使用过期版本提交，已锁定当前操作，请重新查询后再试。",
      );
    } finally {
      setSyncingConflict(false);
    }
  }

  async function handleReview(action: "approve" | "reject" | "undo_approve") {
    const isUndo = action === "undo_approve";
    if (
      submitting ||
      syncingConflict ||
      !canManage ||
      (!isPending && !(isUndo && activeRequest.status === "approved")) ||
      lockedByConflict
    ) {
      return;
    }
    if (action === "approve" && previewStatus !== "loaded") {
      setErrorMessage("待审新照片尚未加载完成或加载失败，不能执行批准。");
      return;
    }

    const payloadResult = buildHallOfFamePhotoReviewPayload({
      action,
      expectedRevision: activeRequest.expectedRevision,
      reason,
    });
    if (!payloadResult.ok) {
      setErrorMessage(payloadResult.message);
      return;
    }

    setSubmitting(true);
    setErrorMessage("");
    setConflictNotice("");
    try {
      await requestJSON<unknown>(
        `/api/admin/hall-of-fame/photo-requests/${encodeURIComponent(activeRequest.id)}/review`,
        {
          method: "POST",
          json: payloadResult.data,
        },
      );
      toast.success(
        action === "undo_approve"
          ? isInitialRequest
            ? "已撤销照片通过，申请退回待审核"
            : "已撤销换照通过，正式照片已恢复"
          : action === "approve"
            ? isInitialRequest
              ? "已通过首次照片申请，成员管理页可继续通过并发布；如需撤销，可在“照片申请→已通过”中操作"
              : "已批准照片修改申请，正式展示照片已更新；如需撤销，可在“照片申请→已通过”中操作"
            : "已驳回照片申请",
      );
      onClose();
      await onReviewed(action);
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "照片审核提交失败");
      if (parsedError.isForbidden) {
        onPermissionRevoked?.();
        setErrorMessage(parsedError.message);
      } else if (parsedError.isConflict) {
        setConflictState({
          kind: "missing",
          nextRequest: activeRequest,
          lockActions: true,
        });
        setConflictNotice(parsedError.message);
        await syncLatestAfterConflict(activeRequest.id);
      } else {
        setErrorMessage(parsedError.message);
      }
      toast.error(parsedError.message);
    } finally {
      setSubmitting(false);
    }
  }

  const trimmedDraftReason = reason.trim();
  const hasPreservedDraftInTerminal =
    !isPending &&
    trimmedDraftReason.length > 0 &&
    trimmedDraftReason !== (activeRequest.rejectionReason ?? "").trim();

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{activeRequest.memberName}</span>
            <Badge variant="outline">
              {formatAdminHallOfFameLevelLabel(activeRequest.level)}
            </Badge>
            <Badge variant="secondary">
              {formatAdminMemberStatusLabel(activeRequest.memberStatus)}
            </Badge>
            <Badge
              variant={
                activeRequest.status === "approved"
                  ? "default"
                  : activeRequest.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
            >
              {HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS[activeRequest.status]}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            提交时间：{formatAdminDateTime(activeRequest.createdAt)} · 资料版本
            {activeRequest.expectedRevision}
            {activeRequest.reviewedAt
              ? ` · 处理时间：${formatAdminDateTime(activeRequest.reviewedAt)}`
              : ""}
            {activeRequest.reviewerName
              ? ` · 审核人：${activeRequest.reviewerName}`
              : ""}
          </span>
        </div>

        {conflictState || conflictNotice ? (
          <div
            role="alert"
            className="space-y-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div className="space-y-1">
                <p className="font-medium">申请状态或成员版本已变更（409）</p>
                <p>
                  {conflictNotice ||
                    (conflictState?.kind === "terminal"
                      ? `该申请已处于终态「${HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS[conflictState.nextRequest.status]}」，不能继续审批。`
                      : conflictState?.kind === "revision_changed"
                        ? `成员版本已更新至 rev.${conflictState.pendingLatest.expectedRevision}，当前旧版本操作已锁定。`
                        : "未获取到最新申请记录，已锁定当前过期操作。")}
                </p>
              </div>
            </div>

            {conflictState?.kind === "revision_changed" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={submitting || syncingConflict}
                onClick={() => {
                  setSyncedRequest(conflictState.pendingLatest);
                  setConflictState(null);
                  setConflictNotice("");
                  setErrorMessage("");
                }}
                className="h-7 text-xs text-foreground"
              >
                <RefreshCw className="mr-1 size-3" />
                同步至最新版本 (rev.{conflictState.pendingLatest.expectedRevision}) 并核对
              </Button>
            ) : conflictState?.kind === "missing" ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                loading={syncingConflict}
                disabled={syncingConflict}
                onClick={() => void syncLatestAfterConflict(activeRequest.id)}
                className="h-7 text-xs text-foreground"
              >
                <RefreshCw className="mr-1 size-3" />
                重新查询最新状态
              </Button>
            ) : null}
          </div>
        ) : null}

        {errorMessage ? (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
          >
            {errorMessage}
          </div>
        ) : null}

        <div
          className={
            isInitialRequest
              ? "grid grid-cols-1 gap-4"
              : "grid grid-cols-1 gap-4 sm:grid-cols-2"
          }
        >
          {!isInitialRequest ? (
            <div className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  当前正式照片
                </span>
                <span className="text-[11px] text-muted-foreground">
                  公开展示中
                </span>
              </div>
              <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-muted/40">
                {currentPortraitSrc ? (
                  // 正式照片为动态签发地址，直接展示并与右侧授权预览并排核对。
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentPortraitSrc}
                    alt={`${activeRequest.memberName} 当前正式照片`}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="px-4 text-center text-xs text-muted-foreground">
                    暂无已发布的正式照片
                  </span>
                )}
              </div>
            </div>
          ) : null}

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                待审新照片（授权私有读取）
              </span>
              {allowAuthorizedPreview ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[11px]"
                  disabled={submitting}
                  onClick={() => {
                    setPreviewStatus("loading");
                    setRetryToken((token) => token + 1);
                  }}
                >
                  <RefreshCw className="mr-1 size-3" />
                  重新加载
                </Button>
              ) : null}
            </div>
            <div className="relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-md bg-muted/40">
              {canViewPreview !== true || previewStatus === "forbidden" ? (
                <div className="flex flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground">
                  <ShieldAlert className="size-5 text-muted-foreground" />
                  <span>当前账号无权预览待审私有照片</span>
                </div>
              ) : !authorizedPreviewSrc ? (
                <span className="px-4 text-center text-xs text-muted-foreground">
                  该申请已处于终态（{HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS[activeRequest.status]}），待审图不再开放读取
                </span>
              ) : (
                <>
                  {/* 待审照片必须通过授权私有接口读取且不缓存到公共资源池。 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={`${activeRequest.id}-${retryToken}`}
                    src={authorizedPreviewSrc}
                    alt={`${activeRequest.memberName} 申请替换的新照片`}
                    className={
                      previewStatus === "loaded"
                        ? "size-full object-cover"
                        : "sr-only"
                    }
                    onLoad={() => setPreviewStatus("loaded")}
                    onError={() => setPreviewStatus("error")}
                  />
                  {previewStatus === "loading" ? (
                    <span className="px-4 text-center text-xs text-muted-foreground">
                      正在加载待审照片预览...
                    </span>
                  ) : null}
                  {previewStatus === "error" ? (
                    <div className="flex flex-col items-center gap-2 px-4 text-center text-xs text-destructive">
                      <span>待审照片加载失败或已失效，加载成功前不可批准。</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setPreviewStatus("loading");
                          setRetryToken((token) => token + 1);
                        }}
                      >
                        <RefreshCw className="mr-1 size-3" />
                        重试加载
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>

        {canManage && isPending ? (
          <div className="space-y-1.5">
            <Label htmlFor="hof-photo-reject-reason">
              驳回原因（驳回时必填，通过时可留空）
            </Label>
            <Textarea
              id="hof-photo-reject-reason"
              rows={3}
              maxLength={300}
              value={reason}
              disabled={submitting || lockedByConflict}
              onChange={(event) => setReason(event.target.value)}
              placeholder="若驳回，请说明原因以便成员重新上传符合要求的新照片（最多 300 字）"
            />
          </div>
        ) : (
          <>
            {activeRequest.rejectionReason ? (
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <span className="font-medium">服务端审核说明：</span>
                <span className="whitespace-pre-wrap break-words text-muted-foreground">
                  {activeRequest.rejectionReason}
                </span>
              </div>
            ) : null}
            {hasPreservedDraftInTerminal ? (
              <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
                <span className="font-medium">已保留你刚才填写的未提交意见草稿：</span>
                <p className="mt-1 whitespace-pre-wrap break-words">
                  {reason}
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      <DialogFooter className="flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={submitting}
        >
          关闭
        </Button>
        {canManage && isPending ? (
          <>
            <Button
              type="button"
              variant="destructive"
              loading={submitting}
              disabled={submitting || syncingConflict || lockedByConflict}
              onClick={() => void handleReview("reject")}
            >
              <X className="mr-1 size-4" />
              驳回申请
            </Button>
            <Button
              type="button"
              loading={submitting}
              disabled={!approveEnabled || syncingConflict}
              onClick={() => void handleReview("approve")}
            >
              <Check className="mr-1 size-4" />
              {isInitialRequest ? "通过照片" : "批准替换"}
            </Button>
          </>
        ) : null}
        {canManage && activeRequest.status === "approved" ? (
          <Button
            type="button"
            variant="outline"
            loading={submitting}
            disabled={submitting}
            onClick={() => void handleReview("undo_approve")}
          >
            撤销通过
          </Button>
        ) : null}
      </DialogFooter>
    </>
  );
}

export function HallOfFamePhotoReviewDialog({
  open,
  onOpenChange,
  request,
  canManage,
  canViewPreview,
  onReviewed,
  onConflictRefresh,
  onPermissionRevoked,
}: HallOfFamePhotoReviewDialogProps) {
  if (!request) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {request.requestKind === "initial"
              ? "首次照片审核"
              : "新旧照片对比审核"}
          </DialogTitle>
          <DialogDescription>
            {request.requestKind === "initial"
              ? "核对成员首次上传的照片；通过后照片申请标记为已通过，成员管理页再执行“通过并发布”。"
              : "核对成员当前正式照片与待审新照片；仅在待审图清晰可辨并确认本人同意后批准替换。"}
          </DialogDescription>
        </DialogHeader>

        <HallOfFamePhotoReviewPanel
          request={request}
          canManage={canManage}
          canViewPreview={canViewPreview}
          onClose={() => onOpenChange(false)}
          onReviewed={onReviewed}
          onConflictRefresh={onConflictRefresh}
          onPermissionRevoked={onPermissionRevoked}
        />
      </DialogContent>
    </Dialog>
  );
}
