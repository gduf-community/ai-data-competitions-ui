export function formatNoticeDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getNoticeHref(notice: { id: string; competitionId: string | null }) {
  return notice.competitionId
    ? `/api/notices/${notice.id}/open`
    : "/notifications";
}
