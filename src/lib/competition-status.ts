export const competitionStatusValues = [
  "draft",
  "upcoming",
  "registration_open",
  "in_progress",
  "finished",
  "previous_recording",
  "archived",
] as const;

export type CompetitionStatusValue = (typeof competitionStatusValues)[number];

export const competitionStatusLabelMap: Record<CompetitionStatusValue, string> = {
  draft: "草稿",
  upcoming: "即将开始",
  registration_open: "报名中",
  in_progress: "进行中",
  finished: "已结束",
  previous_recording: "往期比赛补录中",
  archived: "已归档",
};

export const publicCompetitionFilterStatuses: CompetitionStatusValue[] = [
  "registration_open",
  "previous_recording",
  "upcoming",
  "in_progress",
  "finished",
];

export const activeCompetitionStatuses = new Set<CompetitionStatusValue>([
  "registration_open",
  "previous_recording",
  "upcoming",
  "in_progress",
]);

export function isCompetitionRegistrationAvailable(status: CompetitionStatusValue) {
  return status === "registration_open" || status === "previous_recording";
}
