"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectFilterProps {
  value: string[];
  options: MultiSelectOption[];
  placeholder?: string;
  emptyText?: string;
  onChange: (next: string[]) => void;
  className?: string;
}

export function MultiSelectFilter({
  value,
  options,
  placeholder = "请选择",
  emptyText = "暂无选项",
  onChange,
  className,
}: MultiSelectFilterProps) {
  const [open, setOpen] = React.useState(false);
  const listId = React.useId();

  const selectedOptions = value.map((selected) =>
    options.find((option) => option.value === selected) ?? { value: selected, label: selected },
  );

  function toggle(optionValue: string) {
    onChange(
      value.includes(optionValue)
        ? value.filter((item) => item !== optionValue)
        : [...value, optionValue],
    );
  }

  function remove(optionValue: string) {
    onChange(value.filter((item) => item !== optionValue));
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={placeholder}
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.target !== event.currentTarget) return;
            if (event.key === "Enter" || event.key === " " || event.key === "ArrowDown") {
              event.preventDefault();
              setOpen((current) => event.key === "ArrowDown" || !current);
            }
          }}
          className={cn(
            "border-input flex min-h-9 w-full cursor-pointer flex-wrap items-center gap-1 rounded-md border bg-transparent px-2 py-1.5 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
            className,
          )}
        >
          {selectedOptions.length === 0 ? (
            <span className="text-muted-foreground">{placeholder}</span>
          ) : (
            selectedOptions.map((option) => (
              <Badge key={option.value} variant="secondary" className="gap-1">
                {option.label}
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`移除 ${option.label}`}
                  className="inline-flex size-4 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    remove(option.value);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      event.stopPropagation();
                      remove(option.value);
                    }
                  }}
                >
                  <X className="size-3" />
                </span>
              </Badge>
            ))
          )}
          <ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandList
            id={listId}
            className="max-h-80 overscroll-contain"
            onWheelCapture={(event) => {
              event.stopPropagation();
            }}
          >
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggle(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        isSelected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className={cn(isSelected && "font-medium")}>
                      {option.label}
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
