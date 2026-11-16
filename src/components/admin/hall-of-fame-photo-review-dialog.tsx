"use client";

import { useState } from "react";
import { AlertTriangle, Check, RefreshCw, ShieldAlert, X } from "lucide-react";

import {
  buildHallOfFamePhotoReviewPayload,
  canApprovePhotoPreview,
  formatAdminHallOfFameLevelLabel,
  formatAdminMemberStatusLabel,
  parseAdminRequestError,
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
  onReviewed: (action: "approve" | "reject") => Promise<void>;
  onConflictRefresh: () => Promise<void>;
  onPermissionRevoked?: () => void;
}

interface HallOfFamePhotoReviewPanelProps {
  request: AdminHallOfFamePhotoRequest;
  canManage: boolean;
  canViewPreview: boolean;
  onClose: () => void;
  onReviewed: (action: "approve" | "reject") => Promise<void>;
  onConflictRefresh: () => Promise<void>;
  onPermissionRevoked?: () => void;
}

export function HallOfFamePhotoReviewPanel({
  request,
  canManage,
  canViewPreview,
  onClose,
  onReviewed,
  onConflictRefresh,
  onPermissionRevoked,
}: HallOfFamePhotoReviewPanelProps) {
  const isPending = request.status === "pending";
  const initialPreviewStatus = !canViewPreview ? "forbidden" : "loading";

  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "loading" | "loaded" | "error" | "forbidden"
  >(initialPreviewStatus);
  const [retryToken, setRetryToken] = useState(0);
  const [reason, setReason] = useState(request.rejectionReason ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [conflictNotice, setConflictNotice] = useState("");

  const currentPortraitSrc = sanitizePublicPortraitSrc(
    request.currentPortraitThumbUrl ?? request.currentPortraitUrl,
  );
  const authorizedPreviewSrc = canViewPreview
    ? `/api/admin/hall-of-fame/photo-requests/${encodeURIComponent(request.id)}/preview?v=${retryToken}`
    : null;

  const approveEnabled = canApprovePhotoPreview({
    canManage,
    status: request.status,
    previewStatus,
    submitting,
  });

  async function handleReview(action: "approve" | "reject") {
    if (submitting || !canManage || request.status !== "pending") {
      return;
    }
    if (action === "approve" && previewStatus !== "loaded") {
      setErrorMessage("待审新照片尚未加载完成或加载失败，不能执行批准。");
      return;
    }

    const payloadResult = buildHallOfFamePhotoReviewPayload({
      action,
      expectedRevision: request.expectedRevision,
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
        `/api/admin/hall-of-fame/photo-requests/${encodeURIComponent(request.id)}/review`,
        {
          method: "POST",
          json: payloadResult.data,
        },
      );
      toast.success(
        action === "approve"
          ? "已批准照片修改申请，正式展示照片已更新"
          : "已驳回照片修改申请",
      );
      onClose();
      await onReviewed(action);
    } catch (error) {
      const parsedError = parseAdminRequestError(error, "照片审核提交失败");
      if (parsedError.isForbidden) {
        onPermissionRevoked?.();
        setErrorMessage(parsedError.message);
      } else if (parsedError.isConflict) {
        setConflictNotice(
          `${parsedError.message}（系统已保留当前审核意见并刷新申请列表，不会自动重放批准）`,
        );
        await onConflictRefresh();
      } else {
        setErrorMessage(parsedError.message);
      }
      toast.error(parsedError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-2.5 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{request.memberName}</span>
            <Badge variant="outline">
              {formatAdminHallOfFameLevelLabel(request.level)}
            </Badge>
            <Badge variant="secondary">
              {formatAdminMemberStatusLabel(request.memberStatus)}
            </Badge>
            <Badge
              variant={
                request.status === "approved"
                  ? "default"
                  : request.status === "rejected"
                    ? "destructive"
                    : "secondary"
              }
            >
              {HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS[request.status]}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            提交时间：{request.createdAt} · rev.{request.expectedRevision}
          </span>
        </div>

        {conflictNotice ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/5 p-3 text-xs text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="space-y-1">
              <p className="font-medium">申请状态或成员版本已变更（409）</p>
              <p>{conflictNotice}</p>
            </div>
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  alt={`${request.memberName} 当前正式照片`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="px-4 text-center text-xs text-muted-foreground">
                  暂无已发布的正式照片
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                待审新照片（授权私有读取）
              </span>
              {canViewPreview ? (
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
              {previewStatus === "forbidden" || !authorizedPreviewSrc ? (
                <div className="flex flex-col items-center gap-2 px-4 text-center text-xs text-muted-foreground">
                  <ShieldAlert className="size-5 text-muted-foreground" />
                  <span>当前账号无权预览待审私有照片</span>
                </div>
              ) : (
                <>
                  {/* 待审照片必须通过授权私有接口读取且不缓存到公共资源池。 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    key={`${request.id}-${retryToken}`}
                    src={authorizedPreviewSrc}
                    alt={`${request.memberName} 申请替换的新照片`}
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
              disabled={submitting}
              onChange={(event) => setReason(event.target.value)}
              placeholder="若驳回，请说明原因以便成员重新上传符合要求的新照片（最多 300 字）"
            />
          </div>
        ) : request.rejectionReason ? (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <span className="font-medium">审核说明：</span>
            <span className="whitespace-pre-wrap text-muted-foreground">
              {request.rejectionReason}
            </span>
          </div>
        ) : null}
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
              disabled={submitting}
              onClick={() => void handleReview("reject")}
            >
              <X className="mr-1 size-4" />
              驳回申请
            </Button>
            <Button
              type="button"
              loading={submitting}
              disabled={!approveEnabled}
              onClick={() => void handleReview("approve")}
            >
              <Check className="mr-1 size-4" />
              批准替换
            </Button>
          </>
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
          <DialogTitle>新旧照片对比审核</DialogTitle>
          <DialogDescription>
            核对成员当前正式照片与待审新照片；仅在待审图清晰可辨并确认本人同意后批准替换。
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
