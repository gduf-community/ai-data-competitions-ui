"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { RichTextContent } from "@/components/shared/rich-text-content";
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
import { confirmI18n } from "@/lib/i18n/client";
import { sanitizeRichTextHtml } from "@/lib/security/html-sanitize";

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
  coverImage: z.string().nullable().refine(value => Boolean(value?.trim()), "请上传封面图"),
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
  /** 草稿与已下线内容可保存后直接发布。 */
  initialStatus?: string;
  initialRevision?: number;
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
  initialRevision,
  defaultValues,
}: ClubContentEditorProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const submittingRef = useRef(false);
  const coverUploadingRef = useRef(false);
  const mountedRef = useRef(true);
  const savedRef = useRef({ id: contentId, revision: initialRevision });
  const commandRef = useRef<string | null>(null);
  const pendingPublishRef = useRef<string | null>(null);
  const conflictRef = useRef(false);
  const conflictRequestRef = useRef<AbortController | null>(null);
  const [versionConflict, setVersionConflict] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [savedStatus, setSavedStatus] = useState(initialStatus);
  const [hasSavedContent, setHasSavedContent] = useState(Boolean(contentId));
  const [latestContent, setLatestContent] = useState<{ revision: number; status: string; values: FormValues } | null>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [initialValues] = useState(() => ({
    ...defaultValues,
    recruitmentStartAt: toDatetimeLocalValue(defaultValues.recruitmentStartAt),
    recruitmentEndAt: toDatetimeLocalValue(defaultValues.recruitmentEndAt),
    eventStartAt: toDatetimeLocalValue(defaultValues.eventStartAt),
    eventEndAt: toDatetimeLocalValue(defaultValues.eventEndAt),
  }));
  const baselineRef = useRef(initialValues);
  useLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      conflictRequestRef.current?.abort();
    };
  }, []);

  const form = useForm<FormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(formSchema) as any,
    defaultValues: initialValues,
  });

  const watchedValues = useWatch({ control: form.control });
  const contentType = watchedValues.contentType;
  const coverImage = watchedValues.coverImage ?? null;
  useEffect(() => {
    if (!form.formState.isDirty || submitting) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [form.formState.isDirty, submitting]);

  const canSubmitAfterSave =
    (!hasSavedContent && mode === "create") ||
    savedStatus === "draft" ||
    savedStatus === "offline";

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
    if (coverUploading || submitting || coverUploadingRef.current || submittingRef.current || conflictRef.current || !mountedRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const payload = buildPayload(values);

      let savedId = savedRef.current.id;
      const samePendingPublish = submitAfterSave && pendingPublishRef.current === JSON.stringify(payload);
      if (!savedId) {
        commandRef.current ??= crypto.randomUUID();
        const res = await fetchWithCsrf(`/api/admin/clubs/${clubId}/contents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ commandId: commandRef.current, contentType: values.contentType, ...payload }),
        });
        const body = await res.json().catch(() => ({}));
        if (!mountedRef.current) return;
        if (!res.ok) {
          if (body.field === "coverImage") {
            form.setError("coverImage", { message: body.message });
            document.getElementById("club-cover-upload")?.focus();
          }
          if (res.status === 409 && body.code === "VERSION_CONFLICT") {
            // commandId is the content ID. A lost creation response can be recovered
            // without creating a second draft or borrowing another editor's revision.
            savedRef.current = { id: commandRef.current ?? undefined, revision: undefined };
            setHasSavedContent(true);
            conflictRef.current = true;
            setVersionConflict(true);
            setLatestContent(null);
          }
          throw new Error(body.message ?? "创建失败");
        }
        if (typeof body.data?.id !== "string" || !Number.isInteger(body.data?.revision) || body.data.revision < 1) throw new Error("创建响应缺少有效内容或版本，请重试。");
        savedId = body.data?.id;
        savedRef.current = { id: savedId, revision: body.data?.revision };
        setHasSavedContent(true);
        setSavedStatus(body.data?.status ?? "draft");
      } else if (!samePendingPublish) {
        const previousPayload: Record<string, unknown> = buildPayload(baselineRef.current);
        const changedPayload = Object.fromEntries(Object.entries(payload)
          .filter(([field, value]) => value !== previousPayload[field]));
        const res = await fetchWithCsrf(
          `/api/admin/clubs/${clubId}/contents/${savedId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...changedPayload, expectedRevision: savedRef.current.revision }),
          },
        );
        const body = await res.json().catch(() => ({ message: "保存失败" }));
        if (!mountedRef.current) return;
        if (!res.ok) {
          if (body.field === "coverImage") {
            form.setError("coverImage", { message: body.message });
            document.getElementById("club-cover-upload")?.focus();
          }
          if (body.code === "VERSION_CONFLICT") {
            conflictRef.current = true;
            setVersionConflict(true);
            setLatestContent(null);
          }
          throw new Error(body.code === "VERSION_CONFLICT" ? "内容已被更新，请读取最新内容并核对。" : body.message);
        }
        if (!Number.isInteger(body.data?.revision) || body.data.revision < 1) throw new Error("保存响应缺少有效版本，请重试并核对最新内容。");
        savedRef.current = { id: savedId, revision: body.data?.revision };
      }
      baselineRef.current = { ...values };
      // A different successful save makes the previous publish shortcut stale.
      if (!samePendingPublish) pendingPublishRef.current = null;

      if (submitAfterSave && savedId) {
        pendingPublishRef.current = JSON.stringify(payload);
        const submitRes = await fetchWithCsrf(
          `/api/admin/clubs/${clubId}/contents/${savedId}/publish`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedRevision: savedRef.current.revision }) },
        );
        if (!mountedRef.current) return;
        if (!submitRes.ok) {
          const body = await submitRes
            .json()
            .catch(() => ({ message: "发布失败" }));
          if (!mountedRef.current) return;
          if (body.code === "VERSION_CONFLICT") {
            conflictRef.current = true;
            setVersionConflict(true);
            setLatestContent(null);
          }
          throw new Error(body.message);
        }
        toast.success("已发布");
      } else {
        toast.success(mode === "create" ? "已保存草稿" : "已保存");
      }

      router.push(`/admin/clubs/${clubId}/contents`);
      router.refresh();
    } catch (error) {
      if (!mountedRef.current) return;
      const message = error instanceof Error ? error.message : "操作失败";
      form.setError("root", { message });
      toast.error(message);
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setSubmitting(false);
    }
  }

  async function loadLatestContent() {
    if (!savedRef.current.id || conflictRequestRef.current || submittingRef.current) return;
    const request = new AbortController();
    conflictRequestRef.current = request;
    setConflictLoading(true);
    setLatestContent(null);
    try {
      const res = await fetchWithCsrf(`/api/admin/clubs/${clubId}/contents/${savedRef.current.id}`, { signal: request.signal });
      const body = await res.json();
      if (!mountedRef.current || request.signal.aborted) return;
      if (!res.ok) throw new Error(body.message ?? "读取最新内容失败，请重试。");
      if (body.canEdit !== true) throw new Error("该内容当前不可编辑。当前输入已保留，请联系社团管理人员核对。");
      const data = body.data;
      if (!Number.isInteger(data?.revision) || data.revision < 1) throw new Error("最新内容缺少有效版本，请重试。");
      setLatestContent({
        revision: data.revision, status: data.status,
        values: {
          contentType: data.contentType, title: data.title, content: data.content, coverImage: data.coverImage,
          recruitmentStartAt: toDatetimeLocalValue(data.recruitmentStartAt ?? ""),
          recruitmentEndAt: toDatetimeLocalValue(data.recruitmentEndAt ?? ""), registrationUrl: data.registrationUrl ?? "",
          eventStartAt: toDatetimeLocalValue(data.eventStartAt ?? ""), eventEndAt: toDatetimeLocalValue(data.eventEndAt ?? ""),
          eventLocation: data.eventLocation ?? "",
        },
      });
    } catch (error) {
      if (mountedRef.current && !request.signal.aborted) form.setError("root", { message: error instanceof Error ? error.message : "读取最新内容失败，请重试。" });
    } finally {
      if (conflictRequestRef.current === request) conflictRequestRef.current = null;
      if (mountedRef.current && !request.signal.aborted) setConflictLoading(false);
    }
  }

  function acceptLatestContent() {
    if (!latestContent || conflictLoading || submittingRef.current || !mountedRef.current) return;
    if (!confirmI18n("已核对两份内容？将保留你尚未保存的修改，并更新未修改字段；双方修改的同一字段会保留你的输入。再次保存前请确认这些内容。")) return;
    const local = form.getValues();
    for (const field of Object.keys(latestContent.values) as Array<keyof FormValues>) {
      if (field === "contentType" || local[field] === baselineRef.current[field]) {
        form.setValue(field, latestContent.values[field], { shouldDirty: true, shouldValidate: true });
      }
    }
    baselineRef.current = latestContent.values;
    savedRef.current = { ...savedRef.current, revision: latestContent.revision };
    pendingPublishRef.current = null;
    setSavedStatus(latestContent.status);
    conflictRef.current = false;
    setVersionConflict(false);
    setLatestContent(null);
    setEditorVersion(version => version + 1);
    form.clearErrors("root");
  }

  const conflictLabels: Record<keyof FormValues, string> = {
    contentType: "内容类型", title: "标题", content: "正文", coverImage: "封面图",
    recruitmentStartAt: "报名开始时间", recruitmentEndAt: "报名截止时间", registrationUrl: "报名链接",
    eventStartAt: "活动开始时间", eventEndAt: "活动结束时间", eventLocation: "活动地点",
  };
  const conflictDifferences = latestContent ? (Object.keys(latestContent.values) as Array<keyof FormValues>)
    .filter(field => watchedValues[field] !== latestContent.values[field]) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/admin/clubs/${clubId}/contents`} onClick={event => { if (form.formState.isDirty && !confirmI18n("当前编辑尚未保存，确认离开？")) event.preventDefault(); }}>
            <ArrowLeft className="mr-1 size-4" />
            返回
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">
          {mode === "create" ? "新建内容" : "编辑内容"}
        </h1>
      </div>

      <Form {...form}>
        <form className="space-y-6" inert={submitting} onSubmit={event => { void form.handleSubmit(values => save(values, false))(event); }}>
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
                      disabled={mode === "edit" || hasSavedContent}
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
                    {mode === "edit" || hasSavedContent ? (
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
                  key={`${clubId}:${contentId ?? "new"}`}
                  clubId={clubId}
                  value={coverImage}
                  onUploadingChange={uploading => { coverUploadingRef.current = uploading; setCoverUploading(uploading); }}
                  error={form.formState.errors.coverImage?.message}
                  onChange={(url) =>
                    form.setValue("coverImage", url, { shouldDirty: true, shouldValidate: true })
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
                        editorKey={`${contentId ?? "new"}:${editorVersion}`}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {form.formState.errors.root ? <p role="alert" className="text-sm text-destructive">{form.formState.errors.root.message} 编辑内容已保留。</p> : null}
          {versionConflict ? (
            <section className="space-y-3 rounded-lg border border-border p-4" aria-label="内容冲突核对">
              <p className="text-sm">当前输入已保留。先读取最新内容核对，再继续保存。</p>
              <Button type="button" variant="outline" loading={conflictLoading} disabled={conflictLoading} onClick={() => void loadLatestContent()}>读取最新内容</Button>
              {latestContent ? <>
                <p className="text-sm">以下字段与最新内容不同。继续后保留你尚未保存的修改，未修改字段使用最新内容；同一字段双方都修改时会保留你的输入，请逐项核对。内容类型以已创建内容为准。</p>
                {conflictDifferences.length === 0 ? <p className="text-sm">当前输入与最新内容一致。</p> : conflictDifferences.map(field => (
                  <div key={field} className="space-y-2 border-t border-border pt-3">
                    <h2 className="text-sm font-medium">{conflictLabels[field]}</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><p className="text-xs font-medium">当前输入</p>{field === "content" ? <RichTextContent html={sanitizeRichTextHtml(watchedValues.content ?? "")} /> : <p className="break-all text-sm">{watchedValues[field] || "（空）"}</p>}</div>
                      <div><p className="text-xs font-medium">最新内容</p>{field === "content" ? <RichTextContent html={sanitizeRichTextHtml(latestContent.values.content)} /> : <p className="break-all text-sm">{latestContent.values[field] || "（空）"}</p>}</div>
                    </div>
                  </div>
                ))}
                <Button type="button" onClick={acceptLatestContent}>已核对，合并后继续编辑</Button>
              </> : null}
            </section>
          ) : null}
          <div className="flex gap-2">
            <Button loading={submitting}
              type="button"
              variant="outline"
              disabled={submitting || coverUploading || versionConflict}
              onClick={event => { void form.handleSubmit(values => save(values, false))(event); }}
            >
              <Save className="mr-1 size-4" />
              {submitting ? "保存中..." : savedStatus === "published" ? "保存并更新公开内容" : "保存"}
            </Button>
            {canSubmitAfterSave ? (
              <Button loading={submitting}
                type="button"
                disabled={submitting || coverUploading || versionConflict}
                onClick={event => { void form.handleSubmit(values => save(values, true))(event); }}
              >
                <Send className="mr-1 size-4" />
                {submitting ? "提交中..." : "保存并发布"}
              </Button>
            ) : null}
          </div>
        </form>
      </Form>
    </div>
  );
}
