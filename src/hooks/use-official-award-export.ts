"use client";

import { useCallback, useState } from "react";

import {
  EXPORT_VIEW_LABEL,
  exportErrorMessage,
  isExportContentType,
  parseContentDispositionFilename,
  type ExportFormat,
  type ExportView,
} from "@/lib/contracts/official-awards";
import { confirmI18n } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";

type ExportScope = {
  awardCount: number;
  memberCount: number;
};

/**
 * 导出：只在「数据身份一致 + 非 loading + 无错误」时允许；
 * 校验 Content-Type / Content-Disposition，错误页绝不落盘，并支持取消。
 */
export function useOfficialAwardExport(competitionId: string, query: string) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [controller, setController] = useState<AbortController | null>(null);

  const cancel = useCallback(() => {
    controller?.abort();
  }, [controller]);

  const run = useCallback(
    async (format: ExportFormat, view: ExportView, scope: ExportScope) => {
      const label = `${EXPORT_VIEW_LABEL[view]}，共 ${scope.awardCount} 项奖 / ${scope.memberCount} 人次`;
      if (!confirmI18n(`将按当前筛选导出（${label}），导出会记录审计日志，是否继续？`)) return;
      const next = new AbortController();
      setController(next);
      setExporting(format);
      try {
        const response = await fetch(
          `/api/admin/official-awards/competitions/${encodeURIComponent(competitionId)}/export?${query}&view=${view}&format=${format}`,
          { cache: "no-store", signal: next.signal },
        );
        if (!response.ok) {
          const payload = (await response.json().catch(() => null)) as { message?: string; code?: string } | null;
          throw new Error(exportErrorMessage(response.status, payload));
        }
        if (!isExportContentType(response.headers.get("content-type"), format)) {
          throw new Error("服务返回的不是文件（可能是错误页），已取消下载。");
        }
        const blob = await response.blob();
        const filename =
          parseContentDispositionFilename(response.headers.get("content-disposition")) ?? `官方获奖名单.${format}`;
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        toast.success(`已导出：${filename}`);
      } catch (cause) {
        if (!next.signal.aborted) {
          toast.error(cause instanceof Error ? cause.message : "导出失败");
        }
      } finally {
        setExporting(null);
        setController(null);
      }
    },
    [competitionId, query],
  );

  return { exporting, run, cancel };
}
