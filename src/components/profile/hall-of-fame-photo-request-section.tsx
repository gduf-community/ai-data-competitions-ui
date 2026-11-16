"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Camera, Clock, RefreshCw, Undo2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { HallOfFamePhotoField } from "@/components/profile/hall-of-fame-photo-field";
import { EulerBridgeLoader } from "@/components/shared/euler-bridge-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  meHallOfFamePhotoRequestCreateSchema,
  meHallOfFamePhotoRequestsResponseSchema,
  type MeHallOfFamePhotoRequest,
} from "@/lib/contracts/profiles";
import {
  HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS,
  type HallPortraitUploadRef,
} from "@/lib/hall-of-fame";
import {
  HttpRequestError,
  isAbortError,
  requestJSON,
} from "@/lib/http-client";

export interface NormalizedMePhotoRequests {
  requests: MeHallOfFamePhotoRequest[];
  currentRevision?: number;
  permissions?: {
    canApply?: boolean;
  };
}

/**
 * 规范化本人换照申请列表响应并执行 Zod 字段剥离，确保绝不暴露审核人/内部审计字段或私有 key。
 */
export function normalizeMePhotoRequestsPayload(
  raw: unknown,
): NormalizedMePhotoRequests {
  const record =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>)
      : {};
  const list = Array.isArray(record.requests)
    ? record.requests
    : Array.isArray(record.data)
      ? record.data
      : [];

  return meHallOfFamePhotoRequestsResponseSchema.parse({
    requests: list,
    currentRevision: record.currentRevision,
    permissions: record.permissions,
  });
}

function formatPhotoRequestDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function requestStatusBadgeClass(
  status: MeHallOfFamePhotoRequest["status"],
): string {
  switch (status) {
    case "pending":
      return "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-200";
    case "approved":
      return "bg-green-50 text-green-700 dark:bg-green-950/60 dark:text-green-300";
    case "rejected":
      return "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300";
    case "withdrawn":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
  }
}

export interface HallOfFamePhotoRequestSectionViewProps {
  requests: MeHallOfFamePhotoRequest[];
  loading: boolean;
  loadError: string | null;
  canApply: boolean;
  currentPortraitUrl: string | null;
  photoRef: HallPortraitUploadRef | null;
  uploadingPhoto: boolean;
  submitting: boolean;
  withdrawingId: string | null;
  actionError: string | null;
  onPhotoChange: (next: HallPortraitUploadRef | null) => void;
  onUploadingChange: (uploading: boolean) => void;
  onSubmit: () => void;
  onWithdraw: (requestId: string) => void;
  onRetryLoad: () => void;
}

export function HallOfFamePhotoRequestSectionView({
  requests,
  loading,
  loadError,
  canApply,
  currentPortraitUrl,
  photoRef,
  uploadingPhoto,
  submitting,
  withdrawingId,
  actionError,
  onPhotoChange,
  onUploadingChange,
  onSubmit,
  onWithdraw,
  onRetryLoad,
}: HallOfFamePhotoRequestSectionViewProps) {
  const pendingRequest =
    requests.find((item) => item.status === "pending") ?? null;
  const latestRejected =
    !pendingRequest
      ? requests.find((item) => item.status === "rejected")
      : null;

  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Camera className="size-4 text-muted-foreground" />
              <h4 className="text-base font-semibold">申请修改名人堂展示照片</h4>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              新照片提交后需经超级管理员审核通过才会替换公开人物页照片；待审核、撤回或驳回期间公开页继续展示原正式照片。
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={loading || submitting || Boolean(withdrawingId)}
            onClick={onRetryLoad}
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            刷新申请状态
          </Button>
        </div>

        {loading && requests.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <EulerBridgeLoader size={18} />
            <span>正在加载换照申请记录...</span>
          </div>
        ) : loadError ? (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 shrink-0" />
              <span>{loadError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetryLoad}
            >
              重新加载
            </Button>
          </div>
        ) : (
          <>
            {pendingRequest ? (
              <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="size-4 text-amber-600 dark:text-amber-400" />
                      <span className="text-sm font-medium text-amber-950 dark:text-amber-100">
                        当前已有待审核的换照申请，审核完成或撤回前不可重复提交
                      </span>
                    </div>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                      提交时间：{formatPhotoRequestDate(pendingRequest.createdAt)}
                      ；审核通过前，公开人物页仍展示原正式照片。
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={withdrawingId === pendingRequest.id}
                    disabled={Boolean(withdrawingId)}
                    onClick={() => onWithdraw(pendingRequest.id)}
                  >
                    <Undo2 className="mr-1.5 size-4" />
                    {withdrawingId === pendingRequest.id
                      ? "撤回中..."
                      : "撤回申请"}
                  </Button>
                </div>
              </div>
            ) : canApply ? (
              <div className="space-y-4 rounded-xl border border-border/80 bg-muted/20 p-4">
                {latestRejected ? (
                  <div
                    role="status"
                    className="rounded-lg border border-red-200/80 bg-red-50/70 p-3 text-sm text-red-900 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200"
                  >
                    <p className="font-medium">最近一次换照申请已被驳回</p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-relaxed">
                      原因：{latestRejected.rejectionReason || "未附详细说明"}
                    </p>
                    <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/80">
                      原公开正式照片未受影响，你可以上传新照片后重新提交申请。
                    </p>
                  </div>
                ) : null}

                <HallOfFamePhotoField
                  value={photoRef}
                  existingPreviewUrl={currentPortraitUrl}
                  onChange={onPhotoChange}
                  onUploadingChange={onUploadingChange}
                  disabled={submitting}
                  inputId="hof-photo-request-input"
                  label="上传新的正式照片"
                  helperText="支持 JPG / PNG / WebP，最大 5MB。上传完成需点击下方「提交更换照片申请」才进入审核队列。"
                  error={actionError}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    type="button"
                    loading={submitting}
                    disabled={submitting || uploadingPhoto}
                    onClick={onSubmit}
                  >
                    <Camera className="mr-1.5 size-4" />
                    {submitting ? "提交中..." : "提交更换照片申请"}
                  </Button>
                  {uploadingPhoto ? (
                    <span className="text-xs text-muted-foreground">
                      照片正在压缩上传，请完成后再提交申请...
                    </span>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                当前成员状态暂不允许发起换照申请，如有疑问请联系超级管理员。
              </p>
            )}

            {actionError && pendingRequest ? (
              <p
                role="alert"
                className="flex items-start gap-1.5 text-sm text-destructive"
              >
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <span>{actionError}</span>
              </p>
            ) : null}

            <div className="space-y-2.5">
              <h5 className="text-sm font-medium">换照申请记录</h5>
              {requests.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  暂无历史换照申请记录
                </p>
              ) : (
                <div className="space-y-2">
                  {requests.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-2 rounded-lg border border-border/70 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className={requestStatusBadgeClass(item.status)}
                          >
                            {HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS[item.status]}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            提交：{formatPhotoRequestDate(item.createdAt)}
                          </span>
                          {item.reviewedAt ? (
                            <span className="text-xs text-muted-foreground">
                              处理：{formatPhotoRequestDate(item.reviewedAt)}
                            </span>
                          ) : null}
                        </div>
                        {item.status === "rejected" && item.rejectionReason ? (
                          <p className="whitespace-pre-wrap break-words text-xs text-destructive">
                            驳回说明：{item.rejectionReason}
                          </p>
                        ) : null}
                      </div>

                      {item.status === "pending" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          loading={withdrawingId === item.id}
                          disabled={Boolean(withdrawingId)}
                          onClick={() => onWithdraw(item.id)}
                        >
                          撤回
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function HallOfFamePhotoRequestSection({
  entryRevision,
  currentPortraitUrl,
}: {
  entryRevision: number;
  currentPortraitUrl: string | null;
}) {
  const router = useRouter();
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MeHallOfFamePhotoRequest[]>([]);
  const [serverRevision, setServerRevision] = useState<number>(entryRevision);
  const [canApply, setCanApply] = useState(true);

  const [photoRef, setPhotoRef] = useState<HallPortraitUploadRef | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    requestJSON<unknown>("/api/me/hall-of-fame/photo-requests", {
      signal: controller.signal,
    })
      .then((raw) => {
        if (controller.signal.aborted) return;
        const normalized = normalizeMePhotoRequestsPayload(raw);
        setRequests(normalized.requests);
        if (typeof normalized.currentRevision === "number") {
          setServerRevision(normalized.currentRevision);
        } else {
          setServerRevision(entryRevision);
        }
        setCanApply(normalized.permissions?.canApply ?? true);
        setLoadError(null);
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) return;
        const message =
          error instanceof HttpRequestError && error.message
            ? error.message
            : "换照申请记录加载失败，请稍后重试";
        setLoadError(message);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [entryRevision, reloadKey]);

  function triggerReload() {
    setLoading(true);
    setLoadError(null);
    setReloadKey((prev) => prev + 1);
  }

  async function handleSubmit() {
    if (submitting || uploadingPhoto) return;

    const validation = meHallOfFamePhotoRequestCreateSchema.safeParse({
      photoKey: photoRef?.photoKey ?? "",
      photoThumbKey: photoRef?.photoThumbKey ?? null,
      expectedRevision: serverRevision,
    });

    if (!validation.success) {
      const msg =
        validation.error.issues[0]?.message ?? "请先上传清晰的新展示照片";
      setActionError(msg);
      toast.error(msg);
      return;
    }

    setSubmitting(true);
    setActionError(null);
    try {
      await requestJSON<unknown>("/api/me/hall-of-fame/photo-requests", {
        method: "POST",
        json: validation.data,
      });
      setPhotoRef(null);
      toast.success("换照申请已提交，等待超级管理员审核（通过前公开页保留原图）");
      triggerReload();
      router.refresh();
    } catch (error) {
      if (error instanceof HttpRequestError) {
        if (error.status === 409) {
          const msg =
            error.message ||
            "状态版本已变化或已有待审核申请，正在同步最新记录...";
          setActionError(msg);
          toast.error(msg);
          triggerReload();
          router.refresh();
          return;
        }
        if (error.status === 400 || error.status === 403) {
          setPhotoRef(null);
          if (error.status === 403) {
            router.refresh();
          }
          const msg =
            error.status === 400
              ? error.message || "照片引用已失效或格式无效，请重新选择上传"
              : error.message || "当前状态无权申请换照，已刷新页面核对";
          setActionError(msg);
          toast.error(msg);
          return;
        }
        setActionError(error.message);
        toast.error(error.message);
        return;
      }

      const fallbackMsg =
        error instanceof Error ? error.message : "提交换照申请失败，请稍后重试";
      setActionError(fallbackMsg);
      toast.error(fallbackMsg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleWithdraw(requestId: string) {
    if (withdrawingId) return;
    setWithdrawingId(requestId);
    setActionError(null);
    try {
      await requestJSON(
        `/api/me/hall-of-fame/photo-requests/${encodeURIComponent(requestId)}`,
        {
          method: "DELETE",
          expect: "empty",
        },
      );
      toast.success("已撤回换照申请");
      triggerReload();
      router.refresh();
    } catch (error) {
      if (error instanceof HttpRequestError && error.status === 409) {
        const msg =
          "该申请刚被审核处理或状态已更新，已为你同步服务端最新结果";
        setActionError(msg);
        toast.info(msg);
        triggerReload();
        router.refresh();
        return;
      }
      if (error instanceof HttpRequestError && error.status === 403) {
        router.refresh();
      }
      const msg =
        error instanceof Error ? error.message : "撤回失败，请刷新确认最新状态";
      setActionError(msg);
      toast.error(msg);
    } finally {
      setWithdrawingId(null);
    }
  }

  return (
    <HallOfFamePhotoRequestSectionView
      requests={requests}
      loading={loading}
      loadError={loadError}
      canApply={canApply}
      currentPortraitUrl={currentPortraitUrl}
      photoRef={photoRef}
      uploadingPhoto={uploadingPhoto}
      submitting={submitting}
      withdrawingId={withdrawingId}
      actionError={actionError}
      onPhotoChange={(next) => {
        setPhotoRef(next);
        if (next) setActionError(null);
      }}
      onUploadingChange={setUploadingPhoto}
      onSubmit={() => void handleSubmit()}
      onWithdraw={(id) => void handleWithdraw(id)}
      onRetryLoad={triggerReload}
    />
  );
}
