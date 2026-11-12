import { z } from "zod";
import { parseAwardYear, parseAwardCompetitionId } from "./contracts/award-gallery";

export const awardCursorPattern = /^[A-Za-z0-9_-]{1,1536}$/;

/** Server Components only; this does not grant browser BFF capabilities. */
export function permittedAwardGalleryServerRead(pathname: string) {
  return /^\/api\/awards\/years(?:\/[1-9]\d{3}(?:\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})?)?$/.test(new URL(pathname, "http://web.invalid").pathname);
}

export function galleryHref(selection: { year?: number; competition?: string; cursor?: string }) {
  if (selection.year === undefined) {
    if (selection.competition) throw new Error("A competition requires a year");
    return "/awards";
  }
  const year = parseAwardYear(String(selection.year));
  if (year === null) throw new Error("Invalid award year");
  if (!selection.competition) return `/awards/year/${year}`;
  const competitionId = parseAwardCompetitionId(selection.competition);
  if (!competitionId) throw new Error("Invalid award competition");
  return `/awards/year/${year}/${competitionId}${selection.cursor ? `?cursor=${encodeURIComponent(selection.cursor)}` : ""}`;
}

// Unknown fields are stripped before public API responses cross the RSC/client boundary.
const count = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const year = z.number().int().min(1000).max(9999);
const summary = z.object({ competitionId: z.string().uuid(), competitionTitle: z.string(), certificateCount: count });
const level = z.object({ level: z.string(), certificateCount: count });
const cursor = z.string().regex(awardCursorPattern).nullable();
export const awardYearSummariesSchema = z.object({
  totals: z.object({ yearCount: count, competitionCount: count, certificateCount: count }),
  years: z.array(z.object({ year, competitionCount: count, certificateCount: count, competitions: z.array(summary) })),
});
export const awardYearCompetitionsSchema = z.object({
  year, competitionCount: count, certificateCount: count,
  competitions: z.array(summary.extend({ levels: z.array(level) })),
});
export const awardCompetitionCertificatesSchema = summary.extend({
  year,
  levels: z.array(level),
  awards: z.array(z.object({
    id: z.string().uuid(), userName: z.string(), memberNames: z.array(z.string()), competitionTitle: z.string(),
    awardLevel: z.string().nullable(), level: z.string(), imageUrl: z.string(),
  })).max(24),
  page: z.object({ limit: z.number().int().min(1).max(24), nextCursor: cursor, previousCursor: cursor }),
});
