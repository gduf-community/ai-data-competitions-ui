"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Eye, Image as ImageIcon, RefreshCw, Undo2 } from "lucide-react";

import {
  formatAdminDateTime,
  formatAdminHallOfFameLevelLabel,
  formatAdminMemberStatusLabel,
  parseAdminRequestError,
  resolvePhotoRequestsPermissions,
} from "@/components/admin/hall-of-fame-helpers";
import { HallOfFamePhotoReviewDialog } from "@/components/admin/hall-of-fame-photo-review-dialog";
import { createPhotoReviewSession } from "@/components/admin/hall-of-fame-photo-review-session";
import { LoadingStatus } from "@/components/shared/euler-bridge-loader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  adminHallOfFamePhotoRequestsResponseSchema,
  type AdminHallOfFamePhotoRequest,
  type HallOfFamePhotoRequestStatus,
} from "@/lib/contracts/profiles";
import { HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS } from "@/lib/hall-of-fame";
import { isAbortError, requestJSON } from "@/lib/http-client";
import { toast } from "@/lib/i18n/toast";

interface HallOfFamePhotoRequestsTabProps {
  canManage: boolean;
  onApproved: () => Promise<void>;
  onPermissionRevoked?: () => void;
}

const PAGE_SIZE = 10;

export { resolvePhotoRequestsPermissions };

export function normalizePhotoRequestsPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") return payload;
  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.data)) return record;
  if (Array.isArray(record.requests)) {
    return { ...record, data: record.requests };
  }
  return record;
}

export function HallOfFamePhotoRequestsTab({
  canManage,
  onApproved,
  onPermissionRevoked,
}: HallOfFamePhotoRequestsTabProps) {
  const [statusFilter, setStatusFilter] = useState<
    "all" | HallOfFamePhotoRequestStatus
  >("pending");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<AdminHallOfFamePhotoRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [serverCanManage, setServerCanManage] = useState(false);
  const [serverCanViewPreview, setServerCanViewPreview] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedRequest, setSelectedRequest] =
    useState<AdminHallOfFamePhotoRequest | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const seqRef = useRef(0);
  const reviewSessionRef = useRef<ReturnType<typeof createPhotoReviewSession> | null>(null);
  // Capture this opening: an old dialog's 409 must not refresh a later session.
  const [reviewSession, setReviewSession] = useState<ReturnType<typeof createPhotoReviewSession> | null>(null);

  useEffect(() => () => reviewSessionRef.current?.cancel(), []);

  const [reloadToken, setReloadToken] = useState(0);

  const fetchRequestsPage = useCallback(
    async (
      targetFilter: "all" | HallOfFamePhotoRequestStatus,
      targetPage: number,
      signal?: AbortSignal,
      customPageSize = PAGE_SIZE,
    ) => {
      const params = new URLSearchParams({
        page: String(targetPage),
        pageSize: String(customPageSize),
      });
      if (targetFilter !== "all") {
        params.set("status", targetFilter);
      }

      const rawPayload = await requestJSON<unknown>(
        `/api/admin/hall-of-fame/photo-requests?${params.toString()}`,
        { cache: "no-store", signal },
      );

      const parsed = adminHallOfFamePhotoRequestsResponseSchema.safeParse(
        normalizePhotoRequestsPayload(rawPayload),
      );
      if (!parsed.success) {
        throw new Error("照片申请列表返回格式异常，请稍后重试。");
      }

      const rows = parsed.data.data;
      const perms = resolvePhotoRequestsPermissions(parsed.data.permissions);
      return {
        rows,
        total: parsed.data.total ?? rows.length,
        // 严禁根据页面路由可见或缺失权限字段推导授权，一律以服务端显式 true 为准。
        canManage: perms.canManage,
        canViewPreview: perms.canViewPreview,
      };
    },
    [],
  );

  const reloadCurrentPage = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    setLoading(true);
    setError("");

    try {
      const result = await fetchRequestsPage(
        statusFilter,
        page,
        controller.signal,
      );
      if (seq !== seqRef.current || controller.signal.aborted) return null;
      setItems(result.rows);
      setTotal(result.total);
      setServerCanManage(result.canManage);
      setServerCanViewPreview(result.canViewPreview);
      return result.rows;
    } catch (err) {
      if (
        seq !== seqRef.current ||
        controller.signal.aborted ||
        isAbortError(err)
      ) {
        return null;
      }
      const parsedError = parseAdminRequestError(err, "获取照片申请列表失败");
      if (parsedError.isForbidden) {
        setServerCanManage(false);
        setServerCanViewPreview(false);
        onPermissionRevoked?.();
      }
      setError(parsedError.message);
      return null;
    } finally {
      if (seq === seqRef.current) {
        setLoading(false);
      }
    }
  }, [fetchRequestsPage, onPermissionRevoked, page, statusFilter]);

  async function handleUndoApprove(item: AdminHallOfFamePhotoRequest) {
    if (!(canManage && serverCanManage) || undoingId) return;
    if (
      !window.confirm(
        "撤销后该照片申请会回到待审核；active 换照会恢复上一张正式照片。确定撤销吗？",
      )
    ) {
      return;
    }
    setUndoingId(item.id);
    try {
      await requestJSON(
        `/api/admin/hall-of-fame/photo-requests/${encodeURIComponent(item.id)}/review`,
        { method: "POST", json: { action: "undo_approve" } },
      );
      toast.success("已撤销通过，照片申请回到待审核");
      await reloadCurrentPage();
      await onApproved();
    } catch (error) {
      toast.error(parseAdminRequestError(error, "撤销照片通过失败").message);
    } finally {
      setUndoingId(null);
    }
  }

  const syncRequestOnConflict = useCallback(
    async (): Promise<AdminHallOfFamePhotoRequest | null> => {
      if (!reviewSession || reviewSession !== reviewSessionRef.current) return null;
      // Supersede any list read that predates this conflict refresh.
      abortRef.current?.abort();
      seqRef.current += 1;
      return reviewSession.refresh({
        loadCurrent: (signal) => fetchRequestsPage(statusFilter, page, signal),
        loadAll: (signal) => fetchRequestsPage("all", 1, signal, 50),
        applyCurrent: (result) => {
          setItems(result.rows);
          setTotal(result.total);
          setServerCanManage(result.canManage);
          setServerCanViewPreview(result.canViewPreview);
          setError("");
          setLoading(false);
        },
        applyLatest: (result, found) => {
          setServerCanManage(result.canManage);
          setServerCanViewPreview(result.canViewPreview);
          if (found) setSelectedRequest(found);
        },
        onError: (err) => {
          const parsedError = parseAdminRequestError(err, "刷新照片申请失败");
          if (parsedError.isForbidden) {
            setServerCanManage(false);
            setServerCanViewPreview(false);
            onPermissionRevoked?.();
          }
          setError(parsedError.message);
          setLoading(false);
        },
      });
    },
    [fetchRequestsPage, onPermissionRevoked, page, reviewSession, statusFilter],
  );

  useEffect(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = ++seqRef.current;

    void fetchRequestsPage(statusFilter, page, controller.signal)
      .then((result) => {
        if (seq !== seqRef.current || controller.signal.aborted) return;
        setItems(result.rows);
        setTotal(result.total);
        setServerCanManage(result.canManage);
        setServerCanViewPreview(result.canViewPreview);
        setError("");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (
          seq !== seqRef.current ||
          controller.signal.aborted ||
          isAbortError(err)
        ) {
          return;
        }
        const parsedError = parseAdminRequestError(err, "获取照片申请列表失败");
        if (parsedError.isForbidden) {
          onPermissionRevoked?.();
        }
        setError(parsedError.message);
        setLoading(false);
      });

    return () => controller.abort();
  }, [fetchRequestsPage, onPermissionRevoked, page, reloadToken, statusFilter]);

  const effectiveCanManage = canManage && serverCanManage;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            申请状态筛选：
          </span>
          <div className="w-40">
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setLoading(true);
                setError("");
                setStatusFilter(value as "all" | HallOfFamePhotoRequestStatus);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="按照片申请状态筛选" triggerSize="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="approved">已通过</SelectItem>
                <SelectItem value="rejected">已驳回</SelectItem>
                <SelectItem value="withdrawn">已撤回</SelectItem>
                <SelectItem value="all">全部状态</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted-foreground">
            共 {total} 条记录
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading}
          onClick={() => {
            setLoading(true);
            setError("");
            setReloadToken((t) => t + 1);
          }}
        >
          <RefreshCw className="mr-1 size-3.5" />
          刷新列表
        </Button>
      </div>

      {!effectiveCanManage ? (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            当前账号对照片申请仅具备只读查看范围，不显示审批按钮；待审私有图片的预览严格遵循服务端授权策略。
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="py-4 text-sm text-muted-foreground">
          <LoadingStatus>正在加载照片申请列表...</LoadingStatus>
        </div>
      ) : error ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setLoading(true);
                setError("");
                setReloadToken((t) => t + 1);
              }}
            >
              <RefreshCw className="mr-1 size-3.5" />
              重试
            </Button>
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <ImageIcon className="size-8 text-muted-foreground/60" />
            <p>当前筛选条件下暂无照片申请</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const isPending = item.status === "pending";
            const canOpenDialog =
              (effectiveCanManage && isPending) || serverCanViewPreview;
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium break-words">
                        {item.memberName}
                      </span>
                      <Badge
                        variant={
                          item.status === "approved"
                            ? "default"
                            : item.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {HALL_OF_FAME_PHOTO_REQUEST_STATUS_LABELS[item.status]}
                      </Badge>
                      <Badge variant="outline">
                        {formatAdminHallOfFameLevelLabel(item.level)}
                      </Badge>
                      <Badge variant="secondary">
                        {formatAdminMemberStatusLabel(item.memberStatus)}
                      </Badge>
                      <Badge variant="outline">
                        {item.requestKind === "initial"
                          ? "首次照片"
                          : item.requestKind === "rephoto"
                            ? "换照申请"
                            : "照片申请"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      申请时间：{formatAdminDateTime(item.createdAt)} · 资料版本
                      {item.expectedRevision}
                      {item.reviewedAt
                        ? ` · 审核时间：${formatAdminDateTime(item.reviewedAt)}`
                        : ""}
                      {item.reviewerName ? ` · 审核人：${item.reviewerName}` : ""}
                    </p>
                    {item.rejectionReason ? (
                      <p className="text-xs text-destructive break-words">
                        驳回原因：{item.rejectionReason}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {canOpenDialog ? (
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          effectiveCanManage && isPending
                            ? "default"
                            : "outline"
                        }
                        onClick={() => {
                          reviewSessionRef.current?.cancel();
                          reviewSessionRef.current = createPhotoReviewSession(item.id);
                          setReviewSession(reviewSessionRef.current);
                          setSelectedRequest(item);
                          setReviewOpen(true);
                        }}
                      >
                        <Eye className="mr-1 size-3.5" />
                        {effectiveCanManage && isPending
                          ? "对比审核"
                          : "查看对比"}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        只读（无预览权限）
                      </span>
                    )}
                    {effectiveCanManage && item.status === "approved" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        loading={undoingId === item.id}
                        disabled={Boolean(undoingId)}
                        onClick={() => void handleUndoApprove(item)}
                      >
                        <Undo2 className="mr-1 size-3.5" />
                        撤销通过
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 ? (
            <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
              <span>
                第 {page} / {totalPages} 页
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    setPage((p) => Math.max(1, p - 1));
                  }}
                >
                  上一页
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={page >= totalPages || loading}
                  onClick={() => {
                    setLoading(true);
                    setError("");
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                >
                  下一页
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      <HallOfFamePhotoReviewDialog
        key={`${selectedRequest?.id ?? "none"}-${reviewOpen ? "open" : "closed"}`}
        open={reviewOpen}
        onOpenChange={(open) => {
          setReviewOpen(open);
          if (!open) {
            reviewSessionRef.current?.cancel();
            reviewSessionRef.current = null;
            setReviewSession(null);
            setSelectedRequest(null);
          }
        }}
        request={selectedRequest}
        canManage={effectiveCanManage}
        canViewPreview={serverCanViewPreview}
        onReviewed={async (action) => {
          await reloadCurrentPage();
          if (action !== "reject") {
            await onApproved();
          }
        }}
        onConflictRefresh={syncRequestOnConflict}
        onPermissionRevoked={() => {
          setServerCanManage(false);
          setServerCanViewPreview(false);
          onPermissionRevoked?.();
        }}
      />
    </div>
  );
}
