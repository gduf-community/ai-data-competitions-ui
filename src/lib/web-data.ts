import "server-only";
import { cache } from "react";
import { readAPI, readOptionalAPI } from "@/lib/web-api";
import type { Competition, ApplicationRecord, ClubContentType, QuestionRecord } from "@/lib/types";
import type { PublicCompetitionDetail, PublicCompetitionSummary } from "@/lib/contracts/public-portal";
import type { ApplicationDetailForReview, ApplicationForEdit, ApplicationAuditLog } from "@/lib/contracts/applications";
import type { PublishedNoticeRecord } from "@/lib/contracts/portal";
import type { PublicClubContent, ClubContentSummaryRow, ClubContactRow } from "@/lib/contracts/clubs";
import type { AwardGalleryRow, PublicAwardDetail, AwardShowcaseRow, PublicHallOfFameEntry, PublicProfile, PublicExperiencePost, ExperiencePostRow, PublishedExperiencePostByCompetitionRow, MyAwardRow, MeProfileData, TitleInfo } from "@/lib/contracts/profiles";
const id = encodeURIComponent;
export const getHomepagePortalData = cache(() => readAPI<{ featuredCompetitions: PublicCompetitionSummary[]; awardShowcaseEntries: AwardShowcaseRow[]; hallOfFameEntries: PublicHallOfFameEntry[] }>("/api/homepage"));
export async function getPublicCompetition(competitionId: string) { return (await readOptionalAPI<{competition: PublicCompetitionDetail}>("/api/portal/competitions/" + id(competitionId)))?.competition ?? null; }
export async function getCompetitionById(competitionId: string) { return (await readOptionalAPI<{competition: Competition}>("/api/competitions/" + id(competitionId)))?.competition ?? null; }
const applicationRead = cache((applicationId: string) => readOptionalAPI<{application: ApplicationDetailForReview; logs: ApplicationAuditLog[]; editData: ApplicationForEdit | null}>("/api/me/applications/" + id(applicationId)));
export async function getApplicationDetailForUser(applicationId: string) { return (await applicationRead(applicationId))?.application ?? null; }
export async function listRegistrationAuditLogsByApplicationIds(ids: string[]) { return (await Promise.all(ids.map(applicationRead))).flatMap(data => data?.logs ?? []); }
export async function getApplicationForEdit(applicationId: string) { return (await applicationRead(applicationId))?.editData ?? null; }
export async function listApplicationsVisibleToUser() { return (await readAPI<{applications: ApplicationRecord[]}>("/api/me/applications")).applications; }
const profileRead = cache(() => readAPI<{data: MeProfileData; titles: TitleInfo[]}>("/api/me/profile"));
export async function getMeProfile() { return (await profileRead()).data; }
export async function resolveUserTitles() { return (await profileRead()).titles; }
export async function listMyAwards() { return (await readAPI<{awards: MyAwardRow[]}>("/api/me/award-certificates")).awards; }
type Wire<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] extends Date | null ? string | null : T[K] };
function experience(row: Wire<ExperiencePostRow>): ExperiencePostRow { return {...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt), publishedAt: row.publishedAt ? new Date(row.publishedAt) : null}; }
export async function listMyExperiencePosts() { return (await readAPI<{data: Wire<ExperiencePostRow>[]}>("/api/me/experience-posts")).data.map(experience); }
export async function getMyExperiencePost(postId: string) { const payload = await readOptionalAPI<{data: Wire<ExperiencePostRow>}>("/api/me/experience-posts/" + id(postId)); return payload ? experience(payload.data) : null; }
export async function getForUser() { return (await readAPI<{entry: {tag: string; bio: string; status: string} | null}>("/api/me/hall-of-fame")).entry; }
export async function getHallOfFameEntries() { return (await readAPI<{entries: PublicHallOfFameEntry[]}>("/api/hall-of-fame")).entries; }
export async function getPublicProfile(userId: string) { return (await readOptionalAPI<{profile: PublicProfile}>("/api/profiles/" + id(userId)))?.profile ?? null; }
export async function getPublishedExperiencePost(userId: string, postId: string) { return (await readOptionalAPI<{post: PublicExperiencePost}>("/api/profiles/" + id(userId) + "/experiences/" + id(postId)))?.post ?? null; }
export async function listApprovedAwardsForGallery() { return (await readAPI<{awards: AwardGalleryRow[]}>("/api/awards")).awards; }
export async function getVisibleAwardById(awardId: string) { return (await readOptionalAPI<{award: PublicAwardDetail}>("/api/awards/" + id(awardId)))?.award ?? null; }
export async function listPublishedNotices(limit: number) { return (await readAPI<{notices: PublishedNoticeRecord[]}>("/api/notices/published?limit=" + limit)).notices; }
export const getCompetitionShowcase = cache((competitionId: string) => readAPI<{posts: PublishedExperiencePostByCompetitionRow[]; entries: PublicHallOfFameEntry[]}>("/api/competitions/" + id(competitionId) + "/showcase"));
export async function listPublishedPostsByCompetition(competitionId: string, limit: number) { return (await getCompetitionShowcase(competitionId)).posts.slice(0, limit); }
export async function getQuestionSummaryByCompetition(competitionId: string, limit: number) { return (await readAPI<{questions: QuestionRecord[]}>("/api/questions?competitionId=" + id(competitionId) + "&pageSize=" + limit)).questions; }
export async function getClubContacts(slug: string): Promise<Pick<ClubContactRow, "contactType" | "label" | "value">[]> { return (await readAPI<{data: {contacts: Pick<ClubContactRow, "contactType" | "label" | "value">[]}}>("/api/clubs/" + id(slug))).data.contacts; }
function clubDates<T extends ClubContentSummaryRow>(row: Wire<T>): T {
  const value = {...row} as unknown as T;
  for (const field of ["recruitmentStartAt", "recruitmentEndAt", "eventStartAt", "eventEndAt", "publishedAt", "createdAt", "updatedAt"] as const) {
    Object.assign(value, {[field]: row[field] ? new Date(String(row[field])) : null});
  }
  return value;
}
export async function listPublishedClubContents(slug: string, type: ClubContentType, limit: number) { return (await readAPI<{data: Wire<ClubContentSummaryRow>[]}>("/api/clubs/" + id(slug) + "/contents?type=" + type + "&limit=" + limit)).data.map(clubDates); }
export async function getPublishedClubContentById(contentId: string, slug: string) { const payload = await readOptionalAPI<{data: Wire<PublicClubContent>}>("/api/clubs/" + id(slug) + "/contents/" + id(contentId)); return payload ? clubDates<PublicClubContent>(payload.data) : null; }

export async function listQuestionPage(competitionId: string, page: number) {
  return readAPI<import("@/lib/contracts/questions").QuestionListResponse>("/api/questions?competitionId=" + id(competitionId) + "&page=" + page + "&pageSize=20");
}
export async function getQuestionDetail(competitionId: string, questionId: string) {
  return readOptionalAPI<import("@/lib/contracts/questions").QuestionDetailResponse>("/api/questions/" + id(questionId) + "?competitionId=" + id(competitionId));
}

export const getManagedClubs = cache(async () => (await readAPI<{data: {slug: string; name: string; shortName: string}[]}>("/api/me/clubs")).data);
function managedContent(row: Wire<import("@/lib/contracts/clubs").ClubContentRow>) {
  return {...clubDates(row), reviewedAt: row.reviewedAt ? new Date(row.reviewedAt) : null, archivedAt: row.archivedAt ? new Date(row.archivedAt) : null};
}
export async function listManagedClubContents(slug: string) { return (await readAPI<{data: Wire<import("@/lib/contracts/clubs").ClubContentRow>[]}>("/api/me/clubs/" + id(slug) + "/contents")).data.map(managedContent); }
export async function getManagedClubContent(slug: string, contentId: string) { const result = await readOptionalAPI<{data: Wire<import("@/lib/contracts/clubs").ClubContentRow>; canEdit: boolean}>("/api/me/clubs/" + id(slug) + "/contents/" + id(contentId)); return result ? {...result, data: managedContent(result.data)} : null; }
export async function getAdminClubContacts(slug: string) { return (await readAPI<{data: ClubContactRow[]}>("/api/admin/clubs/" + id(slug) + "/contacts")).data; }
export async function listClubAdmins(slug: string) { return (await readAPI<{data: Wire<import("@/lib/contracts/clubs").ClubAdminRow>[]}>("/api/admin/clubs/" + id(slug) + "/admins")).data.map(row => ({...row, createdAt: new Date(row.createdAt)})); }
export async function listCompetitions() { return (await readAPI<{competitions: Competition[]}>("/api/admin/competitions")).competitions; }
