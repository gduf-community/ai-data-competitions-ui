"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface CompetitionOption {
  id: string;
  title: string;
}

interface CompetitionPickerProps {
  value?: CompetitionOption | null;
  onChange?: (competition: CompetitionOption) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CompetitionPicker({
  value,
  onChange,
  placeholder = "请选择比赛",
  disabled = false,
}: CompetitionPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [competitions, setCompetitions] = React.useState<CompetitionOption[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [keyword, setKeyword] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch("/api/me/competition-options?keyword=" + encodeURIComponent(keyword.slice(0, 120)), { cache: "no-store", signal: controller.signal })
        .then((res) => { if (!res.ok) throw new Error("加载比赛选项失败"); return res.json(); })
        .then(
          (data: { competitions?: CompetitionOption[] }) => {
            if (!cancelled && data.competitions) {
              setCompetitions(data.competitions);
            }
          },
          () => { if (!cancelled) setCompetitions([]); },
        )
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }, 250);

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [keyword]);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {value ? value.title : placeholder}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput placeholder="搜索比赛..." value={keyword} onValueChange={setKeyword} maxLength={120} />
          <CommandList
            className="max-h-80 overscroll-contain"
            onWheelCapture={(event) => {
              event.stopPropagation();
            }}
          >
            {loading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                加载中...
              </div>
            ) : (
              <>
                <CommandEmpty>未找到比赛</CommandEmpty>
                <CommandGroup>
                  {competitions.map((competition) => (
                    <CommandItem
                      key={competition.id}
                      value={competition.title}
                      onSelect={() => {
                        onChange?.(competition);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          value?.id === competition.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {competition.title}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
