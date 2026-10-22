"use client";

import * as React from "react";
import { Check, Loader2, Search, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  AwardMemberCandidate,
  AwardMemberRow,
} from "@/lib/contracts/profiles";

interface AwardMemberPickerProps {
  members: AwardMemberRow[];
  onAdd: (candidate: AwardMemberCandidate) => void;
  onRemove: (userId: string) => void;
  disabled?: boolean;
  ownerId?: string;
}

export function AwardMemberPicker({
  members,
  onAdd,
  onRemove,
  disabled = false,
  ownerId,
}: AwardMemberPickerProps) {
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<AwardMemberCandidate[]>([]);
  const [searched, setSearched] = React.useState(false);
  const [error, setError] = React.useState("");

  const selectedIds = new Set(members.map((member) => member.userId));

  async function search() {
    const keyword = query.trim();
    if (!keyword) {
      setError("请输入成员邮箱或学号。");
      return;
    }

    setSearching(true);
    setError("");
    try {
      const res = await fetch(
        "/api/me/award-certificates/member-search?q=" +
          encodeURIComponent(keyword.slice(0, 120)),
        { cache: "no-store" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(body.message || "查找失败");
      }
      const data = (await res.json()) as { users: AwardMemberCandidate[] };
      setResults(data.users ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "查找失败");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
          placeholder="输入成员邮箱或学号精确查找"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => void search()}
          disabled={disabled || searching}
        >
          {searching ? (
            <Loader2 className="mr-1 size-4 animate-spin" />
          ) : (
            <Search className="mr-1 size-4" />
          )}
          查找
        </Button>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      {members.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {members.map((member) => {
            const isOwner = member.userId === ownerId;
            return (
              <Badge key={member.userId} variant="secondary" className="gap-1">
                {member.name}
                {isOwner ? (
                  <span className="font-normal text-muted-foreground">
                    上传者
                  </span>
                ) : null}
                {member.college ? (
                  <span className="font-normal text-muted-foreground">
                    ·{member.college}
                  </span>
                ) : null}
                {!isOwner ? (
                  <button
                    type="button"
                    onClick={() => onRemove(member.userId)}
                    disabled={disabled}
                    className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    aria-label={`移除成员 ${member.name}`}
                  >
                    <X className="size-3" />
                  </button>
                ) : null}
              </Badge>
            );
          })}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="space-y-1 rounded-md border p-2">
          {results.map((user) => {
            const added = selectedIds.has(user.id);
            return (
              <div
                key={user.id}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.name}
                    {user.college ? (
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {user.college}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.emailMasked ?? user.studentNoMasked}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={added ? "ghost" : "outline"}
                  disabled={added || disabled}
                  onClick={() => onAdd(user)}
                >
                  {added ? (
                    <>
                      <Check className="mr-1 size-3" />
                      已添加
                    </>
                  ) : (
                    "添加"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      ) : searched && !searching ? (
        <p className="text-xs text-muted-foreground">
          未找到匹配的用户，请确认邮箱或学号输入准确。
        </p>
      ) : null}
    </div>
  );
}
