"use client";

import * as React from "react";
import { CheckCircle2, Loader2, RefreshCw, Search, UserCheck } from "lucide-react";

import { parseAdminRequestError } from "@/components/admin/hall-of-fame-helpers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  hallOfFameCandidatesResponseSchema,
  type HallOfFameCandidate,
} from "@/lib/contracts/profiles";
import { isAbortError, requestJSON } from "@/lib/http-client";
import { cn } from "@/lib/utils";

interface HallOfFameUserPickerProps {
  selected: HallOfFameCandidate | null;
  confirmed: boolean;
  onSelect: (candidate: HallOfFameCandidate | null) => void;
  onConfirmChange: (confirmed: boolean) => void;
  disabled?: boolean;
  onPermissionRevoked?: () => void;
}

export function HallOfFameUserPicker({
  selected,
  confirmed,
  onSelect,
  onConfirmChange,
  disabled = false,
  onPermissionRevoked,
}: HallOfFameUserPickerProps) {
  const [query, setQuery] = React.useState("");
  const [searching, setSearching] = React.useState(false);
  const [results, setResults] = React.useState<HallOfFameCandidate[]>([]);
  const [searched, setSearched] = React.useState(false);
  const [error, setError] = React.useState<string>("");
  const [errorStatus, setErrorStatus] = React.useState<number | null>(null);

  const composingRef = React.useRef(false);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = React.useRef<AbortController | null>(null);
  const requestIdRef = React.useRef(0);

  const clearInFlight = React.useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    abortRef.current?.abort();
    abortRef.current = null;
    requestIdRef.current += 1;
  }, []);

  React.useEffect(() => () => clearInFlight(), [clearInFlight]);

  const executeSearch = React.useCallback(
    async (rawKeyword: string) => {
      const keyword = rawKeyword.trim();
      if (!keyword) {
        clearInFlight();
        setResults([]);
        setSearched(false);
        setError("");
        setErrorStatus(null);
        setSearching(false);
        return;
      }

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++requestIdRef.current;

      setSearching(true);
      setError("");
      setErrorStatus(null);

      try {
        const payload = await requestJSON<unknown>(
          `/api/admin/hall-of-fame/candidates?q=${encodeURIComponent(keyword.slice(0, 80))}`,
          { cache: "no-store", signal: controller.signal },
        );
        if (seq !== requestIdRef.current || controller.signal.aborted) {
          return;
        }
        const parsed = hallOfFameCandidatesResponseSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error("候选列表返回格式异常，请稍后重试。");
        }
        if (seq !== requestIdRef.current) {
          return;
        }

        // 所有候选必须由管理员显式点击选择，同名绝不默认选中第一项。
        setResults(parsed.data.users);
        setSearched(true);
      } catch (err) {
        if (
          seq !== requestIdRef.current ||
          controller.signal.aborted ||
          isAbortError(err)
        ) {
          return;
        }
        const parsedErr = parseAdminRequestError(err, "搜索候选成员失败");
        if (parsedErr.isForbidden) {
          onPermissionRevoked?.();
        }
        setErrorStatus(parsedErr.status);
        setError(
          parsedErr.isRateLimited
            ? "搜索过于频繁，请稍后再试。"
            : parsedErr.message,
        );
        setResults([]);
        setSearched(false);
      } finally {
        if (seq === requestIdRef.current) {
          setSearching(false);
        }
      }
    },
    [clearInFlight, onPermissionRevoked],
  );

  function scheduleDebouncedSearch(nextValue: string) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (!nextValue.trim() || composingRef.current) {
      return;
    }
    debounceRef.current = setTimeout(() => {
      void executeSearch(nextValue);
    }, 300);
  }

  function handleQueryChange(nextValue: string) {
    setQuery(nextValue);
    // 关键词变动后立即作废旧请求并清空已选成员与确认状态，防止迟到响应或旧 userId 残留提交。
    clearInFlight();
    setSearching(false);
    setResults([]);
    setSearched(false);
    setError("");
    setErrorStatus(null);
    if (selected !== null) {
      onSelect(null);
    }
    if (confirmed) {
      onConfirmChange(false);
    }
    scheduleDebouncedSearch(nextValue);
  }

  function handleSelectCandidate(candidate: HallOfFameCandidate) {
    if (disabled || candidate.alreadyInvited) return;
    onSelect(candidate);
    onConfirmChange(false);
  }

  function handleClearSelection() {
    onSelect(null);
    onConfirmChange(false);
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="hof-candidate-search">姓名搜索候选成员</Label>
        <div className="flex gap-2">
          <Input
            id="hof-candidate-search"
            value={query}
            maxLength={80}
            disabled={disabled}
            placeholder="请输入成员姓名（支持同名区分核对）"
            onChange={(event) => handleQueryChange(event.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
              if (debounceRef.current) {
                clearTimeout(debounceRef.current);
                debounceRef.current = null;
              }
            }}
            onCompositionEnd={(event) => {
              composingRef.current = false;
              const nextValue = event.currentTarget.value;
              if (nextValue !== query) {
                handleQueryChange(nextValue);
              } else {
                scheduleDebouncedSearch(nextValue);
              }
            }}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !composingRef.current &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault();
                void executeSearch(query);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={disabled || searching || !query.trim()}
            onClick={() => void executeSearch(query)}
          >
            {searching ? (
              <Loader2 className="mr-1 size-4 animate-spin" />
            ) : (
              <Search className="mr-1 size-4" />
            )}
            搜索
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          仅展示匹配姓名的受控身份摘要；空白关键词不会列出全站账号。
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
        >
          <span>
            {error}
            {errorStatus === 429 ? "（已触发频控）" : null}
          </span>
          {query.trim() && errorStatus !== 403 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled || searching}
              onClick={() => void executeSearch(query)}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className="mr-1 size-3" />
              重试
            </Button>
          ) : null}
        </div>
      ) : null}

      {searching ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-dashed px-3 py-3 text-xs text-muted-foreground"
        >
          <Loader2 className="size-3.5 animate-spin" />
          正在检索候选成员...
        </div>
      ) : null}

      {!searching && results.length > 0 ? (
        <div
          role="listbox"
          aria-label="候选成员列表"
          className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border p-2"
        >
          {results.map((candidate) => {
            const isSelected = selected?.id === candidate.id;
            const isBlocked = candidate.alreadyInvited;
            return (
              <div
                key={candidate.id}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isBlocked}
                className={cn(
                  "flex flex-col gap-2 rounded-md border p-2.5 text-sm transition-colors sm:flex-row sm:items-center sm:justify-between",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border/70 bg-background hover:bg-muted/40",
                  isBlocked && "opacity-70",
                )}
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium break-words">
                      {candidate.name}
                    </span>
                    <Badge
                      variant={isBlocked ? "secondary" : "outline"}
                      className="text-[11px]"
                    >
                      {isBlocked ? "已邀请" : "可邀请"}
                    </Badge>
                    {candidate.maskedHint ? (
                      <Badge variant="secondary" className="text-[11px]">
                        {candidate.maskedHint}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="grid gap-x-3 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-3">
                    <span className="break-words">
                      年级：{candidate.grade || "未填写"}
                    </span>
                    <span className="break-words">
                      学院：{candidate.college || "未填写"}
                    </span>
                    <span className="break-words">
                      专业：{candidate.major || "未填写"}
                    </span>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={isSelected ? "default" : "outline"}
                  disabled={disabled || isBlocked}
                  onClick={() => handleSelectCandidate(candidate)}
                  className="shrink-0 self-start sm:self-center"
                >
                  {isSelected ? (
                    <>
                      <CheckCircle2 className="mr-1 size-3.5" />
                      已选择
                    </>
                  ) : isBlocked ? (
                    "不可重复邀请"
                  ) : (
                    "选择"
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}

      {!searching && searched && !error && results.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
          未找到姓名匹配的可用注册用户，请核对姓名后重试。
        </p>
      ) : null}

      {selected ? (
        <div className="space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
              <UserCheck className="size-4" />
              已选择受邀成员（请核对四项身份信息）
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={disabled}
              onClick={handleClearSelection}
              className="h-7 px-2 text-xs"
            >
              更换成员
            </Button>
          </div>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">姓名</dt>
              <dd className="font-medium break-words">{selected.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">年级</dt>
              <dd className="font-medium break-words">
                {selected.grade || "未填写"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">学院</dt>
              <dd className="font-medium break-words">
                {selected.college || "未填写"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">专业</dt>
              <dd className="font-medium break-words">
                {selected.major || "未填写"}
              </dd>
            </div>
            {selected.maskedHint ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">辅助核对标识</dt>
                <dd className="font-medium break-words">{selected.maskedHint}</dd>
              </div>
            ) : null}
          </dl>
          <div className="flex items-start gap-2 rounded-md border border-border/60 bg-background/80 p-2.5">
            <Checkbox
              id="hof-candidate-confirm"
              checked={confirmed}
              disabled={disabled}
              onCheckedChange={(checked) =>
                onConfirmChange(checked === true)
              }
            />
            <Label
              htmlFor="hof-candidate-confirm"
              className="cursor-pointer text-xs leading-5 font-normal"
            >
              我已核对以上姓名、年级、学院与专业信息，确认向该账号发送名人堂邀请
            </Label>
          </div>
        </div>
      ) : null}
    </div>
  );
}
