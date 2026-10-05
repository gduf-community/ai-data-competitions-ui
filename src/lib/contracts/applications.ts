import type { ApplicationRecord } from "@/lib/types";
export interface ApplicationDetailForReview {
  id: string;
  competitionId: string;
  competitionTitle: string;
  applicantName: string;
  college: string;
  major: string;
  grade: string;
  submittedAt: string;
  mode: ApplicationRecord["mode"];
  status: ApplicationRecord["status"];
  reviewer: string;
  note: string;
  selectedSubTrack: string | null;
  statement: string | null;
  teamName: string | null;
  teamMembers: Array<{
    name: string;
    college: string;
    major: string;
    grade: string;
  }>;
  advisors?: Array<{
    name: string;
    college: string;
    major: string;
  }> | null;
  accessRole?: "owner" | "team_member";
  readOnly?: boolean;
}

export interface ApplicationForEdit {
  id: string;
  competitionId: string;
  competitionTitle: string;
  applicantName: string;
  studentNo: string | null;
  college: string;
  major: string;
  grade: string;
  phone: string | null;
  email: string | null;
  selectedSubTrack: string | null;
  statement: string | null;
  teamName: string | null;
  mode: ApplicationRecord["mode"];
  status: ApplicationRecord["status"];
  teamMembers: Array<{
    name: string;
    studentId: string | null;
    college: string | null;
    major: string | null;
    grade: string | null;
    phone: string | null;
    email: string | null;
  }>;
  advisors?: Array<{
    name: string;
    college: string;
    major: string;
    phone: string | null;
    email: string | null;
  }> | null;
}

import { z } from "zod";

export const MAX_APPLICATION_ADVISORS = 5;

export const applicationTeamMemberSchema = z.object({
  name: z.string().trim().min(2, "请输入队员姓名"),
  studentId: z.string().trim().min(6, "请输入有效学号"),
  college: z.string().trim().min(2, "请输入学院"),
  major: z.string().trim().min(2, "请输入专业"),
  grade: z.string().trim().min(1, "请输入年级"),
  phone: z.string().trim().min(6, "请输入有效手机号"),
  email: z.string().trim().email("请输入有效邮箱地址"),
});

export const applicationAdvisorSchema = z.object({
  name: z.string().trim().min(2, "请输入指导老师姓名"),
  college: z.string().trim().min(2, "请输入指导老师所在学院"),
  major: z.string().trim().min(2, "请输入指导老师专业"),
  phone: z.string().trim().min(6, "请输入有效手机号"),
  email: z.string().trim().email("请输入有效邮箱地址"),
});

// Request fields only; identity, persisted mode and permissions come from the server.
export const applicationFieldsSchema = z.object({
  applicantName: z.string().trim().min(2, "请输入姓名"),
  studentId: z.string().trim().min(6, "请输入有效学号"),
  college: z.string().trim().min(2, "请输入学院"),
  major: z.string().trim().min(2, "请输入专业"),
  grade: z.string().trim().min(1, "请输入年级"),
  phone: z.string().trim().min(6, "请输入有效手机号"),
  email: z.string().trim().email("请输入有效邮箱地址"),
  selectedSubTrack: z.string().trim().max(120).optional(),
  statement: z.string().trim().optional(),
  teamName: z.string().trim().optional(),
  teamMembers: z.array(applicationTeamMemberSchema).max(30).optional(),
  advisors: z.array(applicationAdvisorSchema).max(MAX_APPLICATION_ADVISORS, `指导老师最多 ${MAX_APPLICATION_ADVISORS} 人`).optional(),
});

export const applicationSubmissionSchema = applicationFieldsSchema.extend({
  competitionId: z.string().trim().min(1),
  mode: z.enum(["individual", "team"]),
}).superRefine((value, ctx) => {
  if (value.mode === "team") {
    if (!value.teamName) ctx.addIssue({ code: "custom", path: ["teamName"], message: "团队报名必须填写团队名称。" });
    if (!value.teamMembers?.length) ctx.addIssue({ code: "custom", path: ["teamMembers"], message: "团队报名至少填写 1 名队员信息。" });
  } else if (value.teamMembers?.length || value.teamName) {
    ctx.addIssue({ code: "custom", path: ["teamMembers"], message: "个人报名不能包含团队信息。" });
  }
});

export type ApplicationSubmission = z.infer<typeof applicationSubmissionSchema>;
export type ApplicationFields = z.infer<typeof applicationFieldsSchema>;

export const applicationReviewSchema = z.object({
  action: z.enum(["approve", "reject", "withdraw", "cancel"]), comment: z.string().min(1),
});
export const bulkApplicationReviewSchema = applicationReviewSchema.extend({
  ids: z.array(z.string().min(1)).min(1), competitionId: z.string().optional(),
});

export interface ApplicationAuditLog {
  applicationId: string; fromStatus: string | null; toStatus: string; action: string;
  comment: string | null; createdAt: string; operatorName: string;
}
