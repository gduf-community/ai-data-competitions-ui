export const competitionRecognitionValues = [
  "school_listed",
  "national_listed",
  "school_and_national",
  "unlisted",
] as const;

export type CompetitionRecognition =
  (typeof competitionRecognitionValues)[number];

export const competitionRecognitionLabelMap: Record<
  CompetitionRecognition,
  string
> = {
  school_listed: "校内名单",
  national_listed: "全国名单",
  school_and_national: "校内名单+全国名单",
  unlisted: "名单外",
};

export const competitionRecognitionClassNameMap: Record<
  CompetitionRecognition,
  string
> = {
  school_listed:
    "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  national_listed:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  school_and_national:
    "border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300",
  unlisted:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
};
