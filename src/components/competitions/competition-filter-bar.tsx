"use client";

import { Search } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

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
  year: number | null;
}

export function CompetitionFilterBar({
  keyword,
  status,
  year,
}: CompetitionFilterBarProps) {
  const router = useRouter();
  const [input, setInput] = useState(keyword);
  function navigate(nextStatus = status) {
    const query = new URLSearchParams();
    if (input.trim()) query.set("keyword", input.trim().slice(0, 120));
    if (nextStatus !== "all") query.set("status", nextStatus);
    if (year !== null) query.set("year", String(year));
    router.push("/competitions" + (query.size ? "?" + query : ""));
  }
  return (
    <form onSubmit={event => { event.preventDefault(); navigate(); }} className="grid gap-3 rounded-3xl border border-border/70 bg-card/70 p-4 md:grid-cols-[1fr_220px_auto]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={input}
          maxLength={120}
          aria-label="比赛关键词"
          onChange={(event) => setInput(event.target.value)}
          placeholder="搜索比赛名称、类别或归属学院"
          className="pl-10"
        />
      </div>
      <Select
        value={status}
        onValueChange={(value) => navigate(value as CompetitionStatus | "all")}
      >
        <SelectTrigger aria-label="比赛状态">
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
      <Button type="submit">筛选</Button>
    </form>
  );
}
