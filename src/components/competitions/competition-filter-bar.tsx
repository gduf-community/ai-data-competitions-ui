"use client";

import { Search } from "lucide-react";

import {
  competitionStatusLabelMap,
  publicCompetitionFilterStatuses,
} from "@/lib/competition-status";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CompetitionStatus } from "@/lib/types";

interface CompetitionFilterBarProps {
  keyword: string;
  status: CompetitionStatus | "all";
  onKeywordChange: (keyword: string) => void;
  onStatusChange: (status: CompetitionStatus | "all") => void;
}

export function CompetitionFilterBar({
  keyword,
  status,
  onKeywordChange,
  onStatusChange,
}: CompetitionFilterBarProps) {
  return (
    <div className="grid gap-3 rounded-3xl border border-border/70 bg-card/70 p-4 md:grid-cols-[1fr_220px]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={keyword}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="搜索比赛名称、类别或归属学院"
          className="pl-10"
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => onStatusChange(value as CompetitionStatus | "all")}
      >
        <SelectTrigger>
          <SelectValue placeholder="状态筛选" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部状态</SelectItem>
          {publicCompetitionFilterStatuses.map((item) => (
            <SelectItem key={item} value={item}>
              {competitionStatusLabelMap[item]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
