"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, ImageIcon, Plus, Trash2, Users } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { AwardMemberPicker } from "@/components/profile/award-member-picker";
import { CompetitionPicker } from "@/components/competitions/competition-picker";
import { DirectUploadImage } from "@/components/shared/direct-upload-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { compressImage } from "@/lib/image/compress";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { awardMembersResponseSchema } from "@/lib/contracts/profiles";
import {
  AWARD_LEVEL_OPTIONS,
  AWARD_SCOPE_OPTIONS,
  AWARD_YEAR_OPTIONS,
  displayAwardLevel,
} from "@/lib/award-level";
import type {
  AwardMemberCandidate,
  AwardMemberRow,
  MyAwardRow,
} from "@/lib/contracts/profiles";

const MAX_AWARD_MEMBERS = 20;

const statusConfig: Record<
  string,
  {
    label: string;
    variant: "default" | "secondary" | "outline" | "destructive";
  }
> = {
  pending: { label: "待审核", variant: "default" },
  approved: { label: "已通过", variant: "outline" },
  rejected: { label: "已驳回", variant: "destructive" },
};

interface MyAwardListProps {
  awards: MyAwardRow[];
}

export function MyAwardList({ awards }: MyAwardListProps) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [competition, setCompetition] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [awardScope, setAwardScope] = useState("");
  const [awardLevel, setAwardLevel] = useState("");
  const [awardLevelText, setAwardLevelText] = useState("");
  const [awardYear, setAwardYear] = useState("");
  const [members, setMembers] = useState<AwardMemberRow[]>([]);
  const [manageAward, setManageAward] = useState<MyAwardRow | null>(null);
  const [manageMembers, setManageMembers] = useState<AwardMemberRow[]>([]);
  const [managing, setManaging] = useState(false);
  const [manageScope, setManageScope] = useState("");
  const [manageLevel, setManageLevel] = useState("");
  const [manageLevelText, setManageLevelText] = useState("");
  const [manageYear, setManageYear] = useState("");
  const [savingLevel, setSavingLevel] = useState(false);

  async function handleUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      toast.error("请选择奖状图片");
      return;
    }
    if (!competition) {
      toast.error("请选择比赛");
      return;
    }
    if (!awardScope) {
      toast.error("请选择范围");
      return;
    }
    if (!awardLevel) {
      toast.error("请选择获奖等级");
      return;
    }
    if (!awardYear) {
      toast.error("请选择获奖年份");
      return;
    }
    if (members.length > MAX_AWARD_MEMBERS) {
      toast.error(`获奖成员不能超过 ${MAX_AWARD_MEMBERS} 人。`);
      return;
    }

    setUploading(true);
    try {
      const compressedFile = await compressImage(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetSizeKB: 600,
        mimeType: "image/webp",
      });

      const body = new FormData();
      body.append("file", compressedFile);
      body.append("competitionId", competition.id);
      body.append("awardScope", awardScope);
      body.append("awardLevel", awardLevel);
      body.append("awardYear", awardYear);
      if (awardLevelText.trim()) {
        body.append("awardLevelText", awardLevelText.trim());
      }
      for (const member of members) {
        body.append("memberIds", member.userId);
      }

      const res = await fetchWithCsrf("/api/me/award-certificates", {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "上传失败" }));
        throw new Error(err.message);
      }

      toast.success("奖状已上传，等待管理员审核");
      setShowUpload(false);
      setCompetition(null);
      setAwardScope("");
      setAwardLevel("");
      setAwardLevelText("");
      setAwardYear("");
      setMembers([]);
      if (fileRef.current) {
        fileRef.current.value = "";
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "上传失败");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetchWithCsrf(`/api/me/award-certificates/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "撤销失败" }));
        throw new Error(err.message);
      }

      toast.success("奖状记录已撤销");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "撤销失败");
    } finally {
      setDeletingId(null);
    }
  }

  function openManage(award: MyAwardRow) {
    setManageAward(award);
    setManageMembers(award.members);
    setManageScope(award.awardScope ?? "");
    setManageLevel(award.awardLevel ?? "");
    setManageLevelText(award.awardLevelText ?? "");
    setManageYear(award.awardYear != null ? String(award.awardYear) : "");
  }

  function handleUploadAddMember(candidate: AwardMemberCandidate) {
    if (members.length >= MAX_AWARD_MEMBERS) {
      toast.error(`获奖成员不能超过 ${MAX_AWARD_MEMBERS} 人。`);
      return;
    }
    setMembers((prev) =>
      prev.some((member) => member.userId === candidate.id)
        ? prev
        : [
            ...prev,
            {
              userId: candidate.id,
              name: candidate.name,
              college: candidate.college,
            },
          ],
    );
  }

  function handleUploadRemoveMember(userId: string) {
    setMembers((prev) => prev.filter((member) => member.userId !== userId));
  }

  async function handleAddMember(candidate: AwardMemberCandidate) {
    if (!manageAward) {
      return;
    }
    if (manageMembers.length >= MAX_AWARD_MEMBERS) {
      toast.error(`获奖成员不能超过 ${MAX_AWARD_MEMBERS} 人。`);
      return;
    }
    const wasApproved = manageAward.status === "approved";
    setManaging(true);
    try {
      const res = await fetchWithCsrf(
        `/api/me/award-certificates/${manageAward.id}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ memberIds: [candidate.id] }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "添加失败" }));
        throw new Error(err.message);
      }
      const data = awardMembersResponseSchema.parse(await res.json());
      setManageMembers(data.members);
      if (wasApproved) {
        // 已通过奖状变更名单 → 退回待审核：同步本地状态，关闭弹窗后刷新仍一致。
        setManageAward((prev) => (prev ? { ...prev, status: "pending" } : prev));
        toast.success("成员已更新，奖状将重新进入审核。");
      } else {
        toast.success("已添加获奖成员");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "添加失败");
    } finally {
      setManaging(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!manageAward) {
      return;
    }
    const wasApproved = manageAward.status === "approved";
    setManaging(true);
    try {
      const res = await fetchWithCsrf(
        `/api/me/award-certificates/${manageAward.id}/members/${userId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "移除失败" }));
        throw new Error(err.message);
      }
      const data = awardMembersResponseSchema.parse(await res.json());
      setManageMembers(data.members);
      if (wasApproved) {
        setManageAward((prev) => (prev ? { ...prev, status: "pending" } : prev));
        toast.success("成员已更新，奖状将重新进入审核。");
      } else {
        toast.success("已移除获奖成员");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除失败");
    } finally {
      setManaging(false);
    }
  }

  async function handleSaveLevel() {
    if (!manageAward) {
      return;
    }
    if (!manageScope) {
      toast.error("请选择范围");
      return;
    }
    if (!manageLevel) {
      toast.error("请选择获奖等级");
      return;
    }
    if (!manageYear) {
      toast.error("请选择获奖年份");
      return;
    }
    const willReReview = manageAward.status !== "pending";
    setSavingLevel(true);
    try {
      const res = await fetchWithCsrf(
        `/api/me/award-certificates/${manageAward.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            awardScope: manageScope,
            awardLevel: manageLevel,
            awardYear: Number(manageYear),
            awardLevelText: manageLevelText.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "保存失败" }));
        throw new Error(err.message);
      }
      if (willReReview) {
        setManageAward((prev) =>
          prev ? { ...prev, status: "pending", showOnHomepage: false } : prev,
        );
        toast.success("获奖等级已更新，奖状将重新进入审核。");
      } else {
        toast.success("获奖等级已更新");
      }
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSavingLevel(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">共 {awards.length} 份奖状</p>
        <Button size="sm" onClick={() => setShowUpload(true)}>
          <Plus className="mr-1 size-4" />
          上传奖状
        </Button>
      </div>

      {awards.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <ImageIcon className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium">暂无奖状</p>
            <p className="text-xs text-muted-foreground">
              比赛报名成功后，可在这里补充获奖证书。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {awards.map((award) => {
            const config = statusConfig[award.status] ?? statusConfig.pending;
            const isDeleting = deletingId === award.id;
            return (
              <Card key={award.id} className="overflow-hidden">
                <DirectUploadImage
                  src={award.imageUrl}
                  alt={award.competitionTitle}
                  className="aspect-[4/3]"
                  imgClassName="object-cover"
                />
                <CardContent className="mt-auto space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium">
                      {award.competitionTitle}
                    </span>
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </div>
                  {displayAwardLevel(award) || award.awardYear != null ? (
                    <div className="space-y-0.5">
                      {displayAwardLevel(award) ? (
                        <p className="text-xs text-primary">
                          {displayAwardLevel(award)}
                        </p>
                      ) : null}
                      {award.awardYear != null ? (
                        <p className="text-xs text-muted-foreground">
                          年份：{award.awardYear}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                  {award.reviewComment ? (
                    <p className="text-xs text-slate-500">
                      审核备注：{award.reviewComment}
                    </p>
                  ) : null}
                  {award.role === "member" ? (
                    <p className="text-xs text-primary">作为获奖成员关联</p>
                  ) : null}
                  {award.members.length > 0 ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 break-words">
                      获奖成员：
                      {award.members.map((member) => member.name).join("、")}
                    </p>
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {new Date(award.createdAt).toLocaleDateString("zh-CN")}
                  </p>

                  {award.role === "owner" ? (
                    <div className="space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => openManage(award)}
                      >
                        <Users className="mr-1 size-3.5" />
                        管理奖状
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        disabled={isDeleting}
                        onClick={() => void handleDelete(award.id)}
                      >
                        <Trash2 className="mr-1 size-3.5" />
                        {isDeleting ? "撤销中..." : "撤销奖状"}
                      </Button>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上传奖状</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="award-competition">比赛</Label>
              <CompetitionPicker
                value={competition}
                onChange={setCompetition}
                placeholder="请选择比赛"
              />
            </div>
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="award-scope">范围</Label>
                  <Select
                    value={awardScope}
                    onValueChange={setAwardScope}
                    disabled={uploading}
                    required
                  >
                    <SelectTrigger id="award-scope">
                      <SelectValue placeholder="请选择范围" />
                    </SelectTrigger>
                    <SelectContent>
                      {AWARD_SCOPE_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="award-level">获奖等级</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                          aria-label="获奖等级说明"
                        >
                          <CircleAlert className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>
                        若获奖为金银铜，则分别对应一二三等奖；否则，选择“其他”。
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Select
                    value={awardLevel}
                    onValueChange={setAwardLevel}
                    disabled={uploading}
                    required
                  >
                    <SelectTrigger id="award-level">
                      <SelectValue placeholder="请选择获奖等级" />
                    </SelectTrigger>
                    <SelectContent>
                      {AWARD_LEVEL_OPTIONS.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

            </div>
            <div className="grid gap-2">
              <Label htmlFor="award-year">获奖年份</Label>
              <Select
                value={awardYear}
                onValueChange={setAwardYear}
                disabled={uploading}
                required
              >
                <SelectTrigger id="award-year">
                  <SelectValue placeholder="请选择获奖年份" />
                </SelectTrigger>
                <SelectContent>
                  {AWARD_YEAR_OPTIONS.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year} 年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="award-level-text">
                显示奖项等级（选填，最多 20 字）
              </Label>
              <Input
                id="award-level-text"
                value={awardLevelText}
                onChange={(event) => setAwardLevelText(event.target.value)}
                placeholder="留空则使用下方组合结果"
                maxLength={20}
                disabled={uploading}
              />
              {displayAwardLevel({
                awardScope,
                awardLevel,
                awardLevelText,
              }) ? (
                <p className="text-xs text-muted-foreground">
                  将显示为：
                  {displayAwardLevel({
                    awardScope,
                    awardLevel,
                    awardLevelText,
                  })}
                </p>
              ) : null}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="award-members">获奖成员（如有）</Label>
              <AwardMemberPicker
                members={members}
                onAdd={handleUploadAddMember}
                onRemove={handleUploadRemoveMember}
                disabled={uploading}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="award-file">
                奖状图片（PNG/JPG/WebP，≤5MB，上传前会自动压缩）
              </Label>
              <Input
                id="award-file"
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/webp"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpload(false)}
              disabled={uploading}
            >
              取消
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading ? "上传中..." : "提交"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={manageAward !== null}
        onOpenChange={(open) => {
          if (!open) {
            setManageAward(null);
            router.refresh();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>管理奖状</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {manageAward ? (
              <>
                <p className="text-sm text-muted-foreground">
                  管理「{manageAward.competitionTitle}」的获奖年份、等级与获奖成员。
                </p>
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label htmlFor="manage-scope">范围</Label>
                      <Select
                        value={manageScope}
                        onValueChange={(value) => {
                          setManageScope(value);
                          setManageLevelText("");
                        }}
                        disabled={savingLevel}
                        required
                      >
                        <SelectTrigger id="manage-scope">
                          <SelectValue placeholder="请选择范围" />
                        </SelectTrigger>
                        <SelectContent>
                          {AWARD_SCOPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor="manage-level">获奖等级</Label>
                      <Select
                        value={manageLevel}
                        onValueChange={(value) => {
                          setManageLevel(value);
                          setManageLevelText("");
                        }}
                        disabled={savingLevel}
                        required
                      >
                        <SelectTrigger id="manage-level">
                          <SelectValue placeholder="请选择获奖等级" />
                        </SelectTrigger>
                        <SelectContent>
                          {AWARD_LEVEL_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="manage-year">获奖年份</Label>
                    <Select
                      value={manageYear}
                      onValueChange={setManageYear}
                      disabled={savingLevel}
                      required
                    >
                      <SelectTrigger id="manage-year">
                        <SelectValue placeholder="请选择获奖年份" />
                      </SelectTrigger>
                      <SelectContent>
                        {AWARD_YEAR_OPTIONS.map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            {year} 年
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="manage-level-text">
                      显示奖项等级（选填，最多 20 字）
                    </Label>
                    <Input
                      id="manage-level-text"
                      value={manageLevelText}
                      onChange={(event) => setManageLevelText(event.target.value)}
                      placeholder="留空则使用下方组合结果"
                      maxLength={20}
                      disabled={savingLevel}
                    />
                  </div>
                  {displayAwardLevel({
                    awardScope: manageScope,
                    awardLevel: manageLevel,
                    awardLevelText: manageLevelText,
                  }) ? (
                    <p className="text-xs text-muted-foreground">
                      将显示为：
                      {displayAwardLevel({
                        awardScope: manageScope,
                        awardLevel: manageLevel,
                        awardLevelText: manageLevelText,
                      })}
                    </p>
                  ) : null}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={savingLevel || !manageScope || !manageLevel || !manageYear}
                    onClick={() => void handleSaveLevel()}
                  >
                    {savingLevel ? "保存中..." : "保存获奖等级"}
                  </Button>
                  {manageAward.status !== "pending" ? (
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      保存后奖状将重新进入审核。
                    </p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">获奖成员</p>
                  {manageAward.status === "approved" ? (
                    <p className="text-xs text-muted-foreground">
                      修改成员名单后，该奖状将重新进入审核。
                    </p>
                  ) : null}
                  <AwardMemberPicker
                    members={manageMembers}
                    onAdd={(candidate) => void handleAddMember(candidate)}
                    onRemove={(userId) => void handleRemoveMember(userId)}
                    disabled={managing}
                    ownerId={manageAward.userId}
                  />
                </div>
              </>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageAward(null)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
