import {
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from "@/lib/competition-date";
import type {
  Competition,
  CompetitionRecognition,
  CompetitionCtaType,
  CompetitionStatus,
  RegistrationMode,
} from "@/lib/types";
function normalizeText(value: string) {
  return value.trim();
}

/* ---------- types ---------- */

interface TimelineItem {
  label: string;
  date: string;
  description: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

export interface CompetitionFormValues {
  title: string;
  category: string;
  competitionYear: number;
  recognition: CompetitionRecognition;
  summary: string;
  department: string;
  registrationMode: RegistrationMode;
  maxTeamSize: number;
  advisorsRequired: boolean;
  status: CompetitionStatus;
  officialUrl: string;
  wechatArticleUrl: string;
  ctaType: CompetitionCtaType;
  ctaLabelOverride: string;

  // new fields
  registrationStartAt: string;
  registrationEndAt: string;
  eventStartAt: string;
  eventEndAt: string;
  location: string;
  coverLabel: string;
  description: string;
  highlights: string[];
  subTracks: string[];
  timeline: TimelineItem[];
  relatedQuestions: string[];
  faqs: FaqItem[];
  attachments: string[];
}

export function createDefaultCompetitionFormValues(): CompetitionFormValues {
  return {
    title: "",
    category: "",
    competitionYear: 2026,
    recognition: "unlisted",
    summary: "",
    department: "",
    registrationMode: "individual",
    maxTeamSize: 1,
    advisorsRequired: false,
    status: "draft",
    officialUrl: "",
    wechatArticleUrl: "",
    ctaType: "internal_only",
    ctaLabelOverride: "",

    registrationStartAt: "",
    registrationEndAt: "",
    eventStartAt: "",
    eventEndAt: "",
    location: "",
    coverLabel: "",
    description: "",
    highlights: [],
    subTracks: [],
    timeline: [],
    relatedQuestions: [],
    faqs: [],
    attachments: [],
  };
}

export function competitionToForm(item: Competition): CompetitionFormValues {
  return {
    title: item.title,
    category: item.category,
    competitionYear: item.competitionYear,
    recognition: item.recognition,
    summary: item.summary,
    department: item.department,
    registrationMode: item.registrationMode,
    maxTeamSize: item.maxTeamSize ?? (item.registrationMode === "team" ? 5 : 1),
    advisorsRequired: item.advisorsRequired ?? false,
    status: item.status,
    officialUrl: item.officialUrl ?? "",
    wechatArticleUrl: item.wechatArticleUrl ?? "",
    ctaType: item.ctaType,
    ctaLabelOverride: item.ctaLabelOverride ?? "",

    registrationStartAt: toDateTimeLocalValue(item.registrationStartAt),
    registrationEndAt: toDateTimeLocalValue(item.registrationEndAt),
    eventStartAt: toDateTimeLocalValue(item.eventStartAt),
    eventEndAt: toDateTimeLocalValue(item.eventEndAt),
    location: item.location ?? "",
    coverLabel: item.coverLabel ?? "",
    description: item.description ?? "",
    highlights: item.highlights ?? [],
    subTracks: item.subTracks ?? [],
    timeline: item.timeline?.map((entry) => ({ ...entry })) ?? [],
    relatedQuestions: item.relatedQuestions ?? [],
    faqs: item.faqs?.map((entry) => ({ ...entry })) ?? [],
    attachments: item.attachments ?? [],
  };
}

export function buildCompetitionRequest(
  formValues: CompetitionFormValues,
  editingId?: string | null,
) {
  return {
    title: normalizeText(formValues.title),
    category: normalizeText(formValues.category),
    competitionYear: formValues.competitionYear,
    recognition: formValues.recognition,
    summary: normalizeText(formValues.summary),
    department: normalizeText(formValues.department),
    registrationMode: formValues.registrationMode,
    maxTeamSize:
      formValues.registrationMode === "team" ? formValues.maxTeamSize : 1,
    advisorsRequired: formValues.advisorsRequired,
    status: formValues.status,
    officialUrl: normalizeText(formValues.officialUrl),
    wechatArticleUrl: normalizeText(formValues.wechatArticleUrl),
    ctaType: formValues.ctaType,
    ctaLabelOverride: normalizeText(formValues.ctaLabelOverride),
    statusReason: editingId ? "后台管理台更新" : undefined,

    registrationStartAt:
      fromDateTimeLocalValue(formValues.registrationStartAt) ?? "",
    registrationEndAt:
      fromDateTimeLocalValue(formValues.registrationEndAt) ?? "",
    eventStartAt: fromDateTimeLocalValue(formValues.eventStartAt) ?? "",
    eventEndAt: fromDateTimeLocalValue(formValues.eventEndAt) ?? "",
    location: normalizeText(formValues.location),
    coverLabel: normalizeText(formValues.coverLabel),
    description: normalizeText(formValues.description),
    highlights: formValues.highlights.map(normalizeText).filter(Boolean),
    subTracks: formValues.subTracks.map(normalizeText).filter(Boolean),
    timeline: formValues.timeline.filter(
      (t) => t.label.trim() && t.date.trim() && t.description.trim(),
    ),
    relatedQuestions: formValues.relatedQuestions
      .map(normalizeText)
      .filter(Boolean),
    faqs: formValues.faqs.filter((f) => f.question.trim() && f.answer.trim()),
    attachments: formValues.attachments.map(normalizeText).filter(Boolean),
  };
}

export type CompetitionFormRequest = ReturnType<typeof buildCompetitionRequest>;
