"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

interface CompetitionOption {
  id: string;
  title: string;
}

interface UserCandidate {
  id: string;
  name: string;
  email: string;
  college: string;
  status: string;
}

export interface ExperienceInviteFormData {
  userId: string;
  competitionId: string;
  awardLevel: string;
  title: string;
}

interface ExperienceInviteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (data: ExperienceInviteFormData) => Promise<void>;
}

const emptyValues: ExperienceInviteFormData = {
  userId: "",
  competitionId: "",
  awardLevel: "",
  title: "经验文章",
};

export function ExperienceInviteDialog({
  open,
  onOpenChange,
  onInvite,
}: ExperienceInviteDialogProps) {
  const [formData, setFormData] =
    useState<ExperienceInviteFormData>(emptyValues);
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [loadingCompetitions, setLoadingCompetitions] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [userQuery, setUserQuery] = useState("");
  const [candidates, setCandidates] = useState<UserCandidate[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserCandidate | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;

    fetch("/api/admin/competitions")
      .then((res) => res.json())
      .then((data: { competitions?: CompetitionOption[] }) => {
        if (!cancelled) {
          setCompetitions(data.competitions ?? []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompetitions([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingCompetitions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const query = userQuery.trim();
    if (query.length < 2) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      setSearching(true);
      const params = new URLSearchParams({ keyword: query });
      fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((data: { users?: UserCandidate[] }) => {
          if (!cancelled) {
            setCandidates(data.users ?? []);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setCandidates([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setSearching(false);
          }
        });
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [userQuery, open]);

  function handleUserQueryChange(value: string) {
    setUserQuery(value);
    setCandidates([]);
    setSearching(value.trim().length >= 2);
    setSelectedUser(null);
    setFormData((current) => ({ ...current, userId: "" }));
  }

  function handleSelectUser(user: UserCandidate) {
    setSelectedUser(user);
    setUserQuery("");
    setCandidates([]);
    setSearching(false);
    setFormData((current) => ({ ...current, userId: user.id }));
  }

  function handleResetUser() {
    setSelectedUser(null);
    setFormData((current) => ({ ...current, userId: "" }));
  }

  async function handleSubmit() {
    if (!formData.userId || !formData.competitionId) return;
    setSubmitting(true);
    try {
      await onInvite({
        ...formData,
        title: formData.title.trim() || "经验文章",
      });
      setFormData(emptyValues);
      setSelectedUser(null);
      setUserQuery("");
      setCandidates([]);
      setSearching(false);
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setFormData(emptyValues);
      setCompetitions([]);
      setLoadingCompetitions(true);
      setUserQuery("");
      setCandidates([]);
      setSearching(false);
      setSelectedUser(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>邀请撰写经验文章</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>学生姓名 *</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 p-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-sm font-medium">
                    {selectedUser.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedUser.college}
                    {selectedUser.email ? ` · ${selectedUser.email}` : ""}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResetUser}
                >
                  更换
                </Button>
              </div>
            ) : (
              <>
                <Input
                  value={userQuery}
                  onChange={(event) => handleUserQueryChange(event.target.value)}
                  placeholder="输入学生姓名，如：张伟"
                />
                {searching ? (
                  <p className="text-xs text-muted-foreground">搜索中...</p>
                ) : userQuery.trim().length >= 2 && candidates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">未找到匹配的学生</p>
                ) : candidates.length > 0 ? (
                  <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border/60 p-1">
                    {candidates.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handleSelectUser(user)}
                        className={cn(
                          "w-full rounded-md px-3 py-2 text-left transition-colors hover:bg-accent",
                        )}
                      >
                        <span className="block truncate text-sm font-medium">
                          {user.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {user.college}
                          {user.email ? ` · ${user.email}` : ""}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="title">文章标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="经验文章"
            />
          </div>
          <div className="grid gap-2">
            <Label>关联比赛 *</Label>
            <Select
              value={formData.competitionId}
              onValueChange={(value) =>
                setFormData((current) => ({
                  ...current,
                  competitionId: value,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingCompetitions ? "比赛加载中..." : "请选择关联比赛"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {competitions.map((competition) => (
                  <SelectItem key={competition.id} value={competition.id}>
                    {competition.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="awardLevel">获奖等级</Label>
            <Input
              id="awardLevel"
              value={formData.awardLevel}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  awardLevel: event.target.value,
                }))
              }
              placeholder="如：省一等奖"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting ||
              loadingCompetitions ||
              competitions.length === 0 ||
              !formData.userId
            }
          >
            {submitting ? "邀请中..." : "发送邀请"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
