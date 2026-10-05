import type { Competition } from "@/lib/types";

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function formatCompetitionWindow(
  startAt: string | null | undefined,
  endAt: string | null | undefined,
) {
  const start = formatDateTime(startAt);
  const end = formatDateTime(endAt);
  if (!start && !end) return "待定";
  return `${start ?? "待定"} 至 ${end ?? "待定"}`;
}

export function formatRegistrationWindow(competition: Pick<Competition,
  "registrationStartAt" | "registrationEndAt" | "registrationWindow">) {
  if (competition.registrationStartAt || competition.registrationEndAt) {
    return formatCompetitionWindow(
      competition.registrationStartAt,
      competition.registrationEndAt,
    );
  }
  return competition.registrationWindow ?? "待定";
}

export function toDateTimeLocalValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function fromDateTimeLocalValue(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}
