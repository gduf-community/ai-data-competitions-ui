"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/i18n/toast";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RichTextField } from "@/components/forms/rich-text-field";
import { ClubCoverUploadField } from "@/components/clubs-admin/club-cover-upload-field";
import {
  Form,
  FormControl,
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
import { fetchWithCsrf } from "@/lib/security/csrf-client";

const CONTENT_TYPE_OPTIONS = [
  { value: "recruitment", label: "招新信息" },
  { value: "activity", label: "近期活动" },
  { value: "announcement", label: "社团公告" },
  { value: "event_summary", label: "往期活动" },
] as const;

const formSchema = z.object({
  contentType: z.enum([
    "recruitment",
    "activity",
    "announcement",
    "event_summary",
  ]),
  title: z.string().trim().min(1, "标题不能为空").max(300),
  content: z.string().default(""),
  coverImage: z.string().nullable().default(null),
  recruitmentStartAt: z.string().default(""),
  recruitmentEndAt: z.string().default(""),
  registrationUrl: z.string().default(""),
  eventStartAt: z.string().default(""),
  eventEndAt: z.string().default(""),
  eventLocation: z.string().default(""),
});

type FormValues = z.infer<typeof formSchema>;

export interface ClubContentEditorDefaultValues {
  contentType: FormValues["contentType"];
  title: string;
  content: string;
  coverImage: string | null;
  recruitmentStartAt: string;
  recruitmentEndAt: string;
  registrationUrl: string;
  eventStartAt: string;
  eventEndAt: string;
  eventLocation: string;
}

interface ClubContentEditorProps {
  clubId: string;
  mode: "create" | "edit";
  contentId?: string;
  /** 编辑模式下原状态，决定是否显示"保存并提交审核"（仅 draft / rejected 可提交）。 */
  initialStatus?: string;
  defaultValues: ClubContentEditorDefaultValues;
}

/** Date -> <input type="datetime-local"> 所需的本地时间字符串。 */
function toDatetimeLocalValue(iso: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocalValue(value: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export function ClubContentEditor({
  clubId,
  mode,
  contentId,
  initialStatus,
  defaultValues,
}: ClubContentEditorProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: {
      ...defaultValues,
      recruitmentStartAt: toDatetimeLocalValue(defaultValues.recruitmentStartAt),
      recruitmentEndAt: toDatetimeLocalValue(defaultValues.recruitmentEndAt),
      eventStartAt: toDatetimeLocalValue(defaultValues.eventStartAt),
      eventEndAt: toDatetimeLocalValue(defaultValues.eventEndAt),
    },
  });

  const contentType = useWatch({ control: form.control, name: "contentType" });
  const coverImage = useWatch({ control: form.control, name: "coverImage" });

  const canSubmitAfterSave =
    mode === "create" ||
    initialStatus === "draft" ||
    initialStatus === "rejected";

  function buildPayload(values: FormValues) {
    const base = {
      title: values.title,
      content: values.content,
      coverImage: values.coverImage || null,
    };

    if (values.contentType === "recruitment") {
      return {
        ...base,
        recruitmentStartAt: fromDatetimeLocalValue(values.recruitmentStartAt),
        recruitmentEndAt: fromDatetimeLocalValue(values.recruitmentEndAt),
        registrationUrl: values.registrationUrl || null,
      };
    }

    if (values.contentType === "activity") {
      return {
        ...base,
        eventStartAt: fromDatetimeLocalValue(values.eventStartAt),
        eventEndAt: fromDatetimeLocalValue(values.eventEndAt),
        eventLocation: values.eventLocation || null,
      };
    }

    return base;
  }

  async function save(values: FormValues, submitAfterSave: boolean) {
    setSubmitting(true);
    try {
      const payload = buildPayload(values);

      let savedId = contentId;
      if (mode === "create") {
        const res = await fetchWithCsrf(`/api/me/clubs/${clubId}/contents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentType: values.contentType, ...payload }),
        });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(body.message ?? "创建失败");
        }
        savedId = body.data?.id;
      } else {
        const res = await fetchWithCsrf(
          `/api/me/clubs/${clubId}/contents/${contentId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({ message: "保存失败" }));
          throw new Error(body.message);
        }
      }

      if (submitAfterSave && savedId) {
        const submitRes = await fetchWithCsrf(
          `/api/me/clubs/${clubId}/contents/${savedId}/submit`,
          { method: "POST" },
        );
        if (!submitRes.ok) {
          const body = await submitRes
            .json()
            .catch(() => ({ message: "提交审核失败" }));
          throw new Error(body.message);
        }
        toast.success("已提交审核");
      } else {
        toast.success(mode === "create" ? "已保存草稿" : "已保存");
      }

      router.push(`/me/clubs/${clubId}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "操作失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/me/clubs/${clubId}`}>
            <ArrowLeft className="mr-1 size-4" />
            返回
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">
          {mode === "create" ? "新建内容" : "编辑内容"}
        </h1>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">基础信息</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="contentType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>内容类型</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={mode === "edit"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CONTENT_TYPE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {mode === "edit" ? (
                      <p className="text-xs text-muted-foreground">
                        内容类型创建后不可修改。
                      </p>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {contentType === "recruitment" ? (
                <>
                  <FormField
                    control={form.control}
                    name="recruitmentStartAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>报名开始时间</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="recruitmentEndAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>报名截止时间</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="registrationUrl"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>报名链接（需 https）</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="https://..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              {contentType === "activity" ? (
                <>
                  <FormField
                    control={form.control}
                    name="eventStartAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>活动开始时间</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventEndAt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>活动结束时间</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventLocation"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>活动地点</FormLabel>
                        <FormControl>
                          <Input placeholder="例如：图书馆报告厅" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}

              <div className="sm:col-span-2">
                <ClubCoverUploadField
                  clubId={clubId}
                  value={coverImage}
                  onChange={(url) =>
                    form.setValue("coverImage", url, { shouldDirty: true })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">正文</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextField
                        id="club-content-body"
                        label="正文内容"
                        description="支持段落、列表与链接。"
                        value={field.value}
                        onChange={field.onChange}
                        editorKey={contentId ?? "new"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={submitting}
              onClick={form.handleSubmit((values) => save(values, false))}
            >
              <Save className="mr-1 size-4" />
              {submitting ? "保存中..." : "保存草稿"}
            </Button>
            {canSubmitAfterSave ? (
              <Button
                type="button"
                disabled={submitting}
                onClick={form.handleSubmit((values) => save(values, true))}
              >
                <Send className="mr-1 size-4" />
                {submitting ? "提交中..." : "保存并提交审核"}
              </Button>
            ) : null}
          </div>
        </form>
      </Form>
    </div>
  );
}
