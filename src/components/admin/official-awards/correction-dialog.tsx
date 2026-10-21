"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AWARD_LEVEL_CODES,
  AWARD_LEVEL_LABEL,
  type AwardCorrectionPayload,
  type AwardLevelCode,
  type OfficialAwardRow,
} from "@/lib/contracts/official-awards";
import { buildAwardCorrection, describeConcurrentChanges, toDrafts, type MemberDraft } from "@/lib/official-awards/members";
import { toast } from "@/lib/i18n/toast";
import { fetchWithCsrf } from "@/lib/security/csrf-client";

type AdvisorDraft = { advisorId?: string; name: string; college: string };

type Props = {
  /** 打开弹窗时的基线版本，用于三方合并，避免把他人新增记录当成用户删除。 */
  baseline: OfficialAwardRow | null;
  award: OfficialAwardRow | null;
  conflict: boolean;
  /** 冲突记录已离开当前筛选/页，无法自动回填最新版本。 */
  conflictLost: boolean;
  waiting: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  /** 409 后由父组件刷新列表并回填最新 award（保留用户输入）。 */
  onConflict: () => void;
};

export function OfficialAwardCorrectionDialog({
  baseline,
  award,
  conflict,
  conflictLost,
  waiting,
  onClose,
  onSubmitted,
  onConflict,
}: Props) {
  const [levelCode, setLevelCode] = useState<AwardLevelCode>("unclassified");
  const [subTrack, setSubTrack] = useState("");
  const [teamName, setTeamName] = useState("");
  const [reason, setReason] = useState("");
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const concurrentChanges =
    conflict && baseline && award ? describeConcurrentChanges(baseline, award) : [];

  // 「载入最新值」只覆盖业务字段，保留用户已经写好的更正原因。
  const loadFromAward = (row: OfficialAwardRow) => {
    setLevelCode(row.levelCode);
    setSubTrack(row.subTrack ?? "");
    setTeamName(row.teamName ?? "");
    setMembers(toDrafts(row.members));
    setAdvisors(row.advisors.map((advisor) => ({ advisorId: advisor.advisorId, name: advisor.name, college: advisor.college ?? "" })));
  };

  // 打开另一条记录时重置表单；409 回填时保留用户输入，只更新版本号。
  useEffect(() => {
    if (!award) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLevelCode(award.levelCode);
    setSubTrack(award.subTrack ?? "");
    setTeamName(award.teamName ?? "");
    setMembers(toDrafts(award.members));
    setAdvisors(award.advisors.map((advisor) => ({ advisorId: advisor.advisorId, name: advisor.name, college: advisor.college ?? "" })));
    setReason("");
  // 只在切换到另一条记录时重置表单；同一记录版本变化（409 回填）不覆盖用户输入。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [award?.awardId]);

  const updateMember = (index: number, patch: Partial<MemberDraft>) => {
    setMembers((prev) => prev.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  };

  const updateAdvisor = (index: number, patch: Partial<AdvisorDraft>) => {
    setAdvisors((prev) => prev.map((item, position) => (position === index ? { ...item, ...patch } : item)));
  };

  const submit = async () => {
    if (!award || waiting || conflictLost) return;
    if (!reason.trim()) {
      toast.error("请填写更正原因，便于审计追溯。");
      return;
    }
    if (members.some((member) => !member.name.trim())) {
      toast.error("成员姓名不能为空，请补全或删除该行。");
      return;
    }
    if (members.length === 0) {
      toast.error("至少需要一名获奖成员。");
      return;
    }

    // 三方合并：baseline = 打开时版本，latest = 当前最新版本，drafts = 用户输入。
    // 他人新增的成员/老师不会被当成"用户删除"，也不会被旧数组覆盖。
    const base = baseline ?? award;
    const payload: AwardCorrectionPayload = buildAwardCorrection(base, award, { levelCode, subTrack, teamName, reason, members, advisors });

    setSubmitting(true);
    try {
      const response = await fetchWithCsrf(`/api/admin/official-awards/${award.awardId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.status === 409) {
        onConflict();
        toast.error("版本冲突：正在读取最新版本，请等待并核对差异后再提交。");
        return;
      }
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { message?: string };
        throw new Error(body.message ?? `更正失败（HTTP ${response.status}）`);
      }
      toast.success("已提交更正，正在重新查询名单。");
      onSubmitted();
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "更正失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={Boolean(award)} onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>更正获奖事实</DialogTitle>
          <DialogDescription>
            提交会写入审计并抬高版本号（当前 v{award?.version ?? "-"}）。成员与指导老师按新增/修改/移除分别提交，未改动者不重发。
          </DialogDescription>
        </DialogHeader>

        {conflict ? (
          <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <p>
              {conflictLost
                ? "该记录已不在当前筛选结果中，无法自动回填最新版本。请关闭后清空筛选重新打开，核对后再提交。"
                : "该记录已被他人更新。请核对下方「他人改动」后再提交；你的输入仍保留，也可选择载入最新值放弃修改。"}
            </p>
            {concurrentChanges.length > 0 ? (
              <ul className="list-disc space-y-0.5 pl-4">
                {concurrentChanges.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            ) : null}
            <Button
              disabled={conflictLost}
              size="sm"
              type="button"
              variant="outline"
              onClick={() => {
                if (award) loadFromAward(award);
              }}
            >
              载入最新值
            </Button>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="levelCode">规范等级</Label>
              <Select value={levelCode} onValueChange={(value) => setLevelCode(value as AwardLevelCode)}>
                <SelectTrigger aria-label="选择规范等级" id="levelCode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AWARD_LEVEL_CODES.map((code) => (
                    <SelectItem key={code} value={code}>
                      {AWARD_LEVEL_LABEL[code]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subTrack">赛道</Label>
              <Input id="subTrack" value={subTrack} onChange={(event) => setSubTrack(event.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="teamName">团队名称</Label>
            <Input id="teamName" value={teamName} onChange={(event) => setTeamName(event.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>获奖成员（{members.length}）</Label>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() =>
                  setMembers((prev) => [...prev, { memberId: null, name: "", grade: "", college: "", major: "" }])
                }
              >
                <Plus className="size-3.5" />
                添加成员
              </Button>
            </div>
            {members.map((member, index) => (
              <div className="rounded-lg border border-border/60 p-2" key={member.memberId ?? `new-${index}`}>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="col-span-2 space-y-1 sm:col-span-1">
                    <Label className="text-[11px] text-muted-foreground">姓名</Label>
                    <Input
                      aria-label="成员姓名"
                      placeholder="姓名"
                      value={member.name}
                      onChange={(event) => updateMember(index, { name: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">年级</Label>
                    <Input
                      aria-label="成员年级"
                      placeholder="2025级"
                      value={member.grade}
                      onChange={(event) => updateMember(index, { grade: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">学院</Label>
                    <Input
                      aria-label="成员学院"
                      placeholder="学院"
                      value={member.college}
                      onChange={(event) => updateMember(index, { college: event.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">专业</Label>
                    <Input
                      aria-label="成员专业"
                      placeholder="专业"
                      value={member.major}
                      onChange={(event) => updateMember(index, { major: event.target.value })}
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      aria-label="移除该成员"
                      size="icon"
                      type="button"
                      variant="ghost"
                      onClick={() => setMembers((prev) => prev.filter((_, position) => position !== index))}
                    >
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  </div>
                </div>
                {member.memberId ? null : (
                  <p className="mt-1 text-[10px] text-muted-foreground">新增成员：提交时按 create 处理，不携带假 ID</p>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>指导老师（{advisors.length}）</Label>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setAdvisors((prev) => [...prev, { name: "", college: "" }])}
              >
                <Plus className="size-3.5" />
                添加老师
              </Button>
            </div>
            {advisors.map((advisor, index) => (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]" key={`advisor-${index}`}>
                <Input
                  aria-label="指导老师姓名"
                  placeholder="姓名"
                  value={advisor.name}
                  onChange={(event) => updateAdvisor(index, { name: event.target.value })}
                />
                <Input
                  aria-label="指导老师学院"
                  placeholder="学院（可空）"
                  value={advisor.college}
                  onChange={(event) => updateAdvisor(index, { college: event.target.value })}
                />
                <Button
                  aria-label="移除该老师"
                  size="icon"
                  type="button"
                  variant="ghost"
                  onClick={() => setAdvisors((prev) => prev.filter((_, position) => position !== index))}
                >
                  <Trash2 className="size-4 text-rose-500" />
                </Button>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">更正原因（必填）</Label>
            <Input
              id="reason"
              placeholder="例如：官方原文为二等奖，录入时误填三等奖"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={submitting} variant="outline" onClick={onClose}>
            取消
          </Button>
          <Button disabled={submitting || waiting || conflictLost} onClick={() => void submit()}>
            {submitting ? "提交中…" : "提交更正"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
