"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AWARD_LEVEL_LABEL, type AwardLevelCode } from "@/lib/contracts/official-awards";

type Props = {
  years: number[];
  levels: AwardLevelCode[];
  subTracks: string[];
  year: string;
  level: string;
  subTrack: string;
  keyword: string;
  onYearChange: (value: string) => void;
  onLevelChange: (value: string) => void;
  onSubTrackChange: (value: string) => void;
  onKeywordChange: (value: string) => void;
};

/** 统一筛选工具条：桌面与移动共用同一份筛选控件与搜索框。 */
export function OfficialAwardFilters({
  years,
  levels,
  subTracks,
  year,
  level,
  subTrack,
  keyword,
  onYearChange,
  onLevelChange,
  onSubTrackChange,
  onKeywordChange,
}: Props) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-muted-foreground">获奖年份</Label>
          <Select value={year} onValueChange={onYearChange}>
            <SelectTrigger aria-label="按获奖年份筛选" className="w-full">
              <SelectValue placeholder="全部年份" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部年份</SelectItem>
              {years.map((item) => (
                <SelectItem key={item} value={String(item)}>
                  {item} 年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-muted-foreground">规范等级</Label>
          <Select value={level} onValueChange={onLevelChange}>
            <SelectTrigger aria-label="按规范等级筛选" className="w-full">
              <SelectValue placeholder="全部等级" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部等级</SelectItem>
              {levels.map((code) => (
                <SelectItem key={code} value={code}>
                  {AWARD_LEVEL_LABEL[code]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-normal text-muted-foreground">赛道</Label>
          <Select value={subTrack} onValueChange={onSubTrackChange}>
            <SelectTrigger aria-label="按赛道筛选" className="w-full">
              <SelectValue placeholder="全部赛道" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部赛道</SelectItem>
              {subTracks.map((track) => (
                <SelectItem key={track} value={track}>
                  {track}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2 space-y-1.5 xl:col-span-1">
          <Label className="text-xs font-normal text-muted-foreground">搜索学生</Label>
          <Input
            aria-label="按姓名搜索获奖名单"
            className="h-9 w-full"
            maxLength={64}
            placeholder="输入姓名，如：何子轩"
            value={keyword}
            onChange={(event) => onKeywordChange(event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
