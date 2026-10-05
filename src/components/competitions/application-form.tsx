"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { applicationFieldsSchema, applicationTeamMemberSchema, MAX_APPLICATION_ADVISORS } from "@/lib/contracts/applications";

import type { Competition } from "@/lib/types";
import { useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import { requestJSON } from "@/lib/http-client";
import {
  getSafeStorageItem,
  removeSafeStorageItem,
  setSafeStorageItem,
} from "@/lib/safe-storage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const applicationSchema = applicationFieldsSchema.extend({
  teamMembers: applicationFieldsSchema.shape.teamMembers.unwrap(),
  advisors: applicationFieldsSchema.shape.advisors.unwrap(),
});

export function createApplicationSchema(
  advisorsRequired: boolean,
  subTrackRequired: boolean,
  teamMembersRequired: boolean,
  maxAdvisors: number,
) {
  return applicationSchema.extend({
    advisors: advisorsRequired
      ? applicationSchema.shape.advisors
          .min(1, "本比赛要求至少填写一位指导老师信息")
          .max(maxAdvisors, `指导老师最多 ${maxAdvisors} 人`)
      : applicationSchema.shape.advisors.max(maxAdvisors, `指导老师最多 ${maxAdvisors} 人`),
  }).superRefine((value, ctx) => {
    if (subTrackRequired && !value.selectedSubTrack) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["selectedSubTrack"],
        message: "请选择子赛道",
      });
    }

    if (teamMembersRequired && !value.teamName) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamName"],
        message: "团队报名必须填写团队名称",
      });
    }

    if (teamMembersRequired && value.teamMembers.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teamMembers"],
        message: "团队报名至少填写 1 名队员信息",
      });
    }
  });
}

function RequiredFormLabel({ children }: { children: ReactNode }) {
  return (
    <FormLabel>
      {children}
      <span className="ml-1 text-destructive" aria-hidden="true">
        *
      </span>
    </FormLabel>
  );
}

type TeamMemberValues = z.infer<typeof applicationTeamMemberSchema>;
type ApplicationValues = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  competition: Competition;
  registrationId?: string;
  initialData?: ApplicationValues;
}

interface SafeApplicationDraft {
  applicantName?: string;
  studentId?: string;
  college?: string;
  major?: string;
  grade?: string;
  phone?: string;
  email?: string;
  selectedSubTrack?: string;
  statement?: string;
  teamName?: string;
  teamMembers?: Array<{
    name: string;
    studentId: string;
    college: string;
    major: string;
    grade: string;
    phone: string;
    email: string;
  }>;
  advisors?: Array<{
    name: string;
    college: string;
    major: string;
    phone: string;
    email: string;
  }>;
  savedAt?: number;
}

// One complete RHF value replaces both scalar and array state, including empty arrays.
function draftValues(draft: SafeApplicationDraft, isTeamMode: boolean, subTracks: string[]): ApplicationValues {
  if (!draft || typeof draft !== "object") throw new Error("Invalid draft");
  return {
    applicantName: draft.applicantName ?? "", studentId: draft.studentId ?? "",
    college: draft.college ?? "", major: draft.major ?? "", grade: draft.grade ?? "",
    phone: draft.phone ?? "", email: draft.email ?? "", statement: draft.statement ?? "",
    selectedSubTrack: subTracks.includes(draft.selectedSubTrack ?? "") ? draft.selectedSubTrack ?? "" : "",
    teamName: isTeamMode ? draft.teamName ?? "" : "",
    teamMembers: isTeamMode && Array.isArray(draft.teamMembers) ? draft.teamMembers : [],
    advisors: Array.isArray(draft.advisors) ? draft.advisors : [],
  };
}

function createEmptyTeamMember(): TeamMemberValues {
  return {
    name: "",
    studentId: "",
    college: "",
    major: "",
    grade: "",
    phone: "",
    email: "",
  };
}

export function ApplicationForm({ competition, registrationId, initialData }: ApplicationFormProps) {
  const { tt } = useI18nText();
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const isEditMode = !!registrationId;
  const draftStorageKey = isEditMode
    ? `application-edit:${registrationId}`
    : `application-draft:${competition.id}`;
  const isTeamMode = competition.registrationMode === "team";
  const advisorsRequired = competition.advisorsRequired ?? false;
  const maxAdvisors = Math.min(MAX_APPLICATION_ADVISORS, Math.max(1, competition.maxAdvisors ?? 2));
  const maxTeamSize = Math.max(1, competition.maxTeamSize ?? (isTeamMode ? 5 : 1));
  const maxAdditionalMembers = Math.max(0, maxTeamSize - 1);
  const initialSelectedSubTrack = initialData?.selectedSubTrack?.trim() ?? "";

  const defaultValues = useMemo<ApplicationValues>(
    () =>
      initialData ?? {
        applicantName: "",
        studentId: "",
        college: "",
        major: "",
        grade: "",
        phone: "",
        email: "",
        selectedSubTrack: "",
        teamName: "",
        statement: "",
        teamMembers: [],
        advisors: [],
      },
    [initialData],
  );

  const schema = useMemo(
    () => createApplicationSchema(advisorsRequired, competition.subTracks.length > 0, isTeamMode, maxAdvisors),
    [advisorsRequired, competition.subTracks.length, isTeamMode, maxAdvisors],
  );

  const form = useForm<ApplicationValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const teamMembersFieldArray = useFieldArray({
    control: form.control,
    name: "teamMembers",
  });

  const advisorsFieldArray = useFieldArray({
    control: form.control,
    name: "advisors",
  });

  useEffect(() => {
    form.reset(defaultValues);
    if (isEditMode) return;
    const raw = getSafeStorageItem(draftStorageKey);
    if (!raw) return;
    try {
      form.reset(draftValues(JSON.parse(raw) as SafeApplicationDraft, isTeamMode, competition.subTracks), { keepDefaultValues: true });
      toast.success("已恢复本地草稿");
    } catch { removeSafeStorageItem(draftStorageKey); }
  }, [draftStorageKey, defaultValues, form, isEditMode, isTeamMode, competition.subTracks]);

  const saveDraft = () => {
    const current = form.getValues();
    const draft: SafeApplicationDraft = {
      applicantName: current.applicantName,
      studentId: current.studentId,
      college: current.college,
      major: current.major,
      grade: current.grade,
      phone: current.phone,
      email: current.email,
      selectedSubTrack:
        competition.subTracks.includes(current.selectedSubTrack ?? "")
          ? (current.selectedSubTrack ?? "")
          : undefined,
      statement: current.statement,
      teamName: isTeamMode ? current.teamName ?? "" : undefined,
      teamMembers: isTeamMode ? current.teamMembers : undefined,
      advisors: current.advisors.length > 0 ? current.advisors : undefined,
      savedAt: Date.now(),
    };
    const ok = setSafeStorageItem(
      draftStorageKey,
      JSON.stringify(draft),
    );
    if (!ok) {
      toast.error("当前浏览器不支持本地草稿暂存");
      return;
    }
    toast.success("草稿已暂存");
  };

  const clearDraft = () => {
    removeSafeStorageItem(draftStorageKey);
    toast.success("本地草稿已清除");
  };

  const restoreDraft = () => {
    const raw = getSafeStorageItem(draftStorageKey);
    if (!raw) {
      toast.error("没有可恢复的本地草稿");
      return;
    }

    try {
      form.reset(draftValues(JSON.parse(raw) as SafeApplicationDraft, isTeamMode, competition.subTracks), { keepDefaultValues: true });
      toast.success("已恢复本地草稿");
    } catch {
      removeSafeStorageItem(draftStorageKey);
      toast.error("草稿数据异常，已清除");
    }
  };

  useEffect(() => {
    const selectedSubTrack = form.getValues("selectedSubTrack") ?? "";
    if (selectedSubTrack && !competition.subTracks.includes(selectedSubTrack)) {
      form.setValue("selectedSubTrack", "");
    }
  }, [competition.subTracks, form]);

  const onSubmit = async (values: ApplicationValues) => {
    if (isTeamMode && values.teamMembers.length > maxAdditionalMembers) {
      form.setError("teamMembers", {
        message: `队伍总人数不能超过 ${maxTeamSize} 人`,
      });
      return;
    }

    const normalizedSelectedSubTrack = values.selectedSubTrack?.trim() ?? "";
    const selectedSubTrack = competition.subTracks.includes(normalizedSelectedSubTrack)
      ? normalizedSelectedSubTrack
      : undefined;
    const shouldCreateNewRegistration =
      isEditMode &&
      (selectedSubTrack ?? "") !== initialSelectedSubTrack;
    const url = shouldCreateNewRegistration
      ? "/api/applications"
      : isEditMode
        ? `/api/applications/${registrationId}`
        : "/api/applications";
    const method = shouldCreateNewRegistration ? "POST" : isEditMode ? "PUT" : "POST";

    setSubmitting(true);
    try {
      const payload = await requestJSON<{ application?: { id: string } }>(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          competitionId: competition.id,
          competitionTitle: competition.title,
          applicantName: values.applicantName,
          studentId: values.studentId,
          college: values.college,
          major: values.major,
          grade: values.grade,
          phone: values.phone,
          email: values.email,
          selectedSubTrack,
          statement: values.statement,
          teamName: isTeamMode ? values.teamName?.trim() ?? "" : undefined,
          teamMembers: isTeamMode ? values.teamMembers : [],
          advisors: values.advisors.length > 0 ? values.advisors : [],
          mode: competition.registrationMode,
        }),
      });

      if (isEditMode) {
        if (shouldCreateNewRegistration) {
          toast.success("已新增新的子赛项报名，原报名记录已保留。", {
            description: `新报名编号：${payload.application?.id ?? "已创建"}`,
          });
        } else {
          toast.success("报名信息修改成功，已提交审核。");
        }
      } else {
        toast.success("报名提交成功", {
          description: `报名编号：${payload.application?.id ?? "已创建"}`,
        });
      }
      removeSafeStorageItem(draftStorageKey);
      if (isEditMode) {
        router.push(`/me/applications/${payload.application?.id ?? registrationId}`);
        router.refresh();
        return;
      }
      form.reset(defaultValues);
    } catch (error) {
      const message = error instanceof Error ? error.message : "操作失败";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>{isEditMode ? tt("修改报名信息") : tt("收集校内报名信息")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="applicantName"
                render={({ field }) => (
                  <FormItem>
                    <RequiredFormLabel>队长姓名</RequiredFormLabel>
                    <FormControl>
                      <Input placeholder={tt("请输入队长姓名")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <RequiredFormLabel>队长学号</RequiredFormLabel>
                    <FormControl>
                      <Input placeholder="2023123456" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="college"
                render={({ field }) => (
                  <FormItem>
                    <RequiredFormLabel>学院</RequiredFormLabel>
                    <FormControl>
                      <Input placeholder={tt("请输入学院名称")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="major"
                render={({ field }) => (
                  <FormItem>
                    <RequiredFormLabel>专业</RequiredFormLabel>
                    <FormControl>
                      <Input placeholder={tt("请输入专业名称")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <RequiredFormLabel>年级</RequiredFormLabel>
                    <FormControl>
                      <Input placeholder={tt("如：2023 级")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <RequiredFormLabel>手机号</RequiredFormLabel>
                    <FormControl>
                      <Input placeholder="13800000000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <RequiredFormLabel>邮箱</RequiredFormLabel>
                    <FormControl>
                      <Input placeholder="name@stu.example.edu" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {competition.subTracks.length > 0 ? (
                <FormField
                  control={form.control}
                  name="selectedSubTrack"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <RequiredFormLabel>子赛道</RequiredFormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="请选择子赛道" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {competition.subTracks.map((track) => (
                            <SelectItem key={track} value={track}>
                              {track}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        每条报名必须选择一个子赛项；如需报名多个子赛项，请分别提交，系统会保留原报名记录。
                        {isEditMode
                          ? " 当前若改为其他子赛项，提交后会新建报名，不覆盖本条记录。"
                          : ""}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </div>

            {isTeamMode ? (
              <>
                <FormField
                  control={form.control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <RequiredFormLabel>团队名称</RequiredFormLabel>
                      <FormControl>
                        <Input placeholder={tt("请输入团队名称")} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-4 rounded-xl border border-border/70 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">队员信息</p>
                      <p className="text-xs text-muted-foreground">
                        队长统一为同组成员报名，至少添加 1 名队员。
                      </p>
                      <p className="text-xs text-muted-foreground">
                        当前比赛每队最多 {maxTeamSize} 人（含队长）。
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        teamMembersFieldArray.append(createEmptyTeamMember())
                      }
                      disabled={
                        teamMembersFieldArray.fields.length >= maxAdditionalMembers
                      }
                    >
                      <Plus className="mr-1 size-4" />
                      增加队员
                    </Button>
                  </div>

                  {teamMembersFieldArray.fields.map((member, index) => (
                    <div
                      key={member.id}
                      className="space-y-3 rounded-lg border border-border/60 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">队员 {index + 1}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => teamMembersFieldArray.remove(index)}
                        >
                          <Trash2 className="mr-1 size-4" />
                          删除
                        </Button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.name` as const}
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>姓名</RequiredFormLabel>
                              <FormControl>
                                <Input placeholder="队员姓名" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.studentId` as const}
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>学号</RequiredFormLabel>
                              <FormControl>
                                <Input placeholder="队员学号" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.college` as const}
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>学院</RequiredFormLabel>
                              <FormControl>
                                <Input placeholder="队员学院" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.major` as const}
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>专业</RequiredFormLabel>
                              <FormControl>
                                <Input placeholder="队员专业" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.grade` as const}
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>年级</RequiredFormLabel>
                              <FormControl>
                                <Input placeholder="队员年级" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.phone` as const}
                          render={({ field }) => (
                            <FormItem>
                              <RequiredFormLabel>手机号</RequiredFormLabel>
                              <FormControl>
                                <Input placeholder="队员手机号" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.email` as const}
                          render={({ field }) => (
                            <FormItem className="md:col-span-2">
                              <RequiredFormLabel>邮箱</RequiredFormLabel>
                              <FormControl>
                                <Input placeholder="队员邮箱" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                  {form.formState.errors.teamMembers?.message ? (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.teamMembers.message as string}
                    </p>
                  ) : null}
                </div>
              </>
            ) : null}

            {/* 指导老师 */}
            <div className="space-y-4 rounded-xl border border-border/70 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">
                    {advisorsRequired ? "指导老师（必填）" : "指导老师（选填）"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {advisorsRequired
                      ? `本比赛要求填写指导老师信息。最多可添加 ${maxAdvisors} 位指导老师。`
                      : `如有指导老师，可在此添加。最多可添加 ${maxAdvisors} 位指导老师。`}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (advisorsFieldArray.fields.length >= maxAdvisors) return;
                    advisorsFieldArray.append({
                      name: "",
                      college: "",
                      major: "",
                      phone: "",
                      email: "",
                    });
                  }}
                  disabled={advisorsFieldArray.fields.length >= maxAdvisors}
                >
                  <Plus className="mr-1 size-4" />
                  添加指导老师
                </Button>
              </div>

              {advisorsFieldArray.fields.map((advisorItem, advisorIndex) => (
                <div key={advisorItem.id} className="space-y-3 rounded-lg border border-border/50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{`指导老师 ${advisorIndex + 1}`}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => advisorsFieldArray.remove(advisorIndex)}
                    >
                      <Trash2 className="mr-1 size-4" />
                      删除
                    </Button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`advisors.${advisorIndex}.name` as const}
                      render={({ field }) => (
                        <FormItem>
                          <RequiredFormLabel>指导老师姓名</RequiredFormLabel>
                          <FormControl>
                            <Input placeholder="请输入指导老师姓名" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`advisors.${advisorIndex}.college` as const}
                      render={({ field }) => (
                        <FormItem>
                          <RequiredFormLabel>所在学院</RequiredFormLabel>
                          <FormControl>
                            <Input placeholder="请输入指导老师所在学院" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`advisors.${advisorIndex}.major` as const}
                      render={({ field }) => (
                        <FormItem>
                          <RequiredFormLabel>专业</RequiredFormLabel>
                          <FormControl>
                            <Input placeholder="请输入指导老师专业" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`advisors.${advisorIndex}.phone` as const}
                      render={({ field }) => (
                        <FormItem>
                          <RequiredFormLabel>手机号</RequiredFormLabel>
                          <FormControl>
                            <Input placeholder="请输入指导老师手机号" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`advisors.${advisorIndex}.email` as const}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <RequiredFormLabel>邮箱</RequiredFormLabel>
                          <FormControl>
                            <Input placeholder="teacher@example.edu" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>

            <FormField
              control={form.control}
              name="statement"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>备注（选填）</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={6}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? tt("提交中...") : isEditMode ? tt("保存修改") : tt("提交报名")}
              </Button>
              {isEditMode ? null : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={saveDraft}
                    disabled={submitting}
                  >
                    {tt("暂存草稿")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={restoreDraft}
                    disabled={submitting}
                  >
                    {tt("恢复草稿")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearDraft}
                    disabled={submitting}
                  >
                    {tt("清除草稿")}
                  </Button>
                </>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
