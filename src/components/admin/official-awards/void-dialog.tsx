"use client";

import { useEffect, useState } from "react";

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
import type { OfficialAwardRow } from "@/lib/contracts/official-awards";
import { toast } from "@/lib/i18n/toast";
import { useOfficialAwardCommand } from "@/hooks/use-official-award-command";

type Props = {
  award: OfficialAwardRow | null;
  conflict: boolean;
  waiting: boolean;
  conflictLost: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  onConflict: () => void;
  onRetryConflict?: () => void;
};

export function OfficialAwardVoidDialog({ award, conflict, waiting, conflictLost, onClose, onSubmitted, onConflict, onRetryConflict }: Props) {
  const [reason, setReason] = useState("");
  const { submitting, submit: submitCommand } = useOfficialAwardCommand(award?.awardId);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReason("");
  }, [award?.awardId]);

  const submit = async () => {
    if (!award || waiting || conflictLost) return;
    if (!reason.trim()) {
      toast.error("请填写撤销原因，便于审计追溯。");
      return;
    }
    await submitCommand({
      url: `/api/admin/official-awards/${award.awardId}/void`, method: "POST",
      payload: { expectedVersion: award.version, reason: reason.trim() },
      onConflict, onSubmitted,
      successMessage: "已撤销该获奖事实，正在重新查询名单。",
      conflictMessage: "版本冲突：正在读取最新版本，请等待并核对后重新操作。",
      failureMessage: "撤销失败",
    });
  };

  return (
    <Dialog open={Boolean(award)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>撤销获奖事实</DialogTitle>
          <DialogDescription>
            撤销只标记为无效并记录原因，不删除数据；当前版本 v{award?.version ?? "-"}。
          </DialogDescription>
        </DialogHeader>
        {conflict ? (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p>{conflictLost ? "未能取得最新记录，输入仍保留。可重试读取；若记录已离开筛选，请复制原因后重新查询。" : `已加载最新版本（v${award?.version ?? "-"}），请确认后重新提交。`}</p>
            {conflictLost && onRetryConflict ? <Button type="button" size="sm" variant="outline" disabled={waiting || submitting} onClick={onRetryConflict}>重试读取最新版本</Button> : null}
          </div>
        ) : null}
        <div className="space-y-1.5">
          <Label htmlFor="voidReason">撤销原因（必填）</Label>
          <Input
            id="voidReason"
            disabled={submitting || waiting}
            placeholder="例如：该团队实际未获奖，官方原文核对有误"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </div>
        <DialogFooter>
          <Button disabled={submitting} variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button loading={submitting} className="text-rose-600" disabled={submitting || waiting || conflictLost} onClick={() => void submit()}>
            {submitting ? "提交中…" : "确认撤销"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
