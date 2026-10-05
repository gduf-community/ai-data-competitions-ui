"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Send } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "@/lib/i18n/toast";
import { z } from "zod";

import { fetchWithCsrf } from "@/lib/security/csrf-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextField } from "@/components/forms/rich-text-field";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const AWARD_OPTIONS = [
  {
    group: "国家级",
    options: [
      "国家级特等奖",
      "国家级一等奖",
      "国家级二等奖",
      "国家级三等奖",
      "国家级优秀奖",
    ],
  },
  {
    group: "省级",
    options: [
      "省级特等奖",
      "省级一等奖",
      "省级二等奖",
      "省级三等奖",
      "省级优秀奖",
    ],
  },
  {
    group: "赛区级",
    options: [
      "赛区级特等奖",
      "赛区级一等奖",
      "赛区级二等奖",
      "赛区级三等奖",
      "赛区级优秀奖",
    ],
  },
] as const;

const postSchema = z.object({
  title: z.string().min(1, "标题不能为空").max(300),
  competitionTitle: z.string().max(300).default(""),
  awardLevel: z.string().max(500).default(""),
  content: z.string().default(""),
});

type PostFormValues = z.infer<typeof postSchema>;

interface ExperiencePostEditorProps {
  postId: string;
  defaultValues: {
    title: string;
    competitionTitle: string;
    awardLevel: string;
    content: string;
  };
}

function buildFormDefaults(
  defaultValues: ExperiencePostEditorProps["defaultValues"],
): PostFormValues {
  return {
    title: defaultValues.title,
    competitionTitle: defaultValues.competitionTitle,
    awardLevel: defaultValues.awardLevel,
    content: defaultValues.content,
  };
}

export function ExperiencePostEditor({
  postId,
  defaultValues,
}: ExperiencePostEditorProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<PostFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(postSchema) as any,
    defaultValues: buildFormDefaults(defaultValues),
  });

  useEffect(() => {
    form.reset(buildFormDefaults(defaultValues));
  }, [defaultValues, form]);

  const awardLevelValue = useWatch({
    control: form.control,
    name: "awardLevel",
  });

  const selectedAwards = (
    awardLevelValue
      ? awardLevelValue
          .split("、")
          .map((item) => item.trim())
          .filter(Boolean)
      : []
  ) as string[];

  const toggleAward = useCallback(
    (award: string) => {
      const current = form.getValues("awardLevel");
      const currentList = current
        ? current
            .split("、")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
      const next = currentList.includes(award)
        ? currentList.filter((item) => item !== award)
        : [...currentList, award];
      form.setValue("awardLevel", next.join("、"), { shouldDirty: true });
    },
    [form],
  );

  async function save(values: PostFormValues, submitAfterSave: boolean) {
    setSubmitting(true);
    try {
      const payload = {
        title: values.title,
        awardLevel: values.awardLevel || null,
        content: values.content,
      };

      const updateRes = await fetchWithCsrf(`/api/me/experience-posts/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!updateRes.ok) {
        const err = await updateRes
          .json()
          .catch(() => ({ message: "保存失败" }));
        throw new Error(err.message);
      }

      if (submitAfterSave) {
        const submitRes = await fetchWithCsrf(
          `/api/me/experience-posts/${postId}/submit`,
          { method: "POST" },
        );
        if (!submitRes.ok) {
          const err = await submitRes
            .json()
            .catch(() => ({ message: "提交审核失败" }));
          throw new Error(err.message);
        }
        toast.success("文章已提交审核");
      } else {
        toast.success("文章已保存");
      }

      router.push("/me/experiences");
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
          <Link href="/me/experiences">
            <ArrowLeft className="mr-1 size-4" />
            返回
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">编辑经验文章</h1>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">文章信息</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>标题</FormLabel>
                    <FormControl>
                      <Input placeholder="请输入文章标题" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="competitionTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>关联比赛</FormLabel>
                    <FormControl>
                      <Input {...field} disabled />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      关联比赛由超级管理员在邀请时指定，个人不可修改。
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="awardLevel"
                render={() => (
                  <FormItem>
                    <FormLabel>获奖等级（可多选）</FormLabel>
                    <FormControl>
                      <div className="space-y-3 rounded-md border border-border p-3">
                        {selectedAwards.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {selectedAwards.map((award) => (
                              <Badge
                                key={award}
                                variant="secondary"
                                className="cursor-pointer"
                                onClick={() => toggleAward(award)}
                              >
                                {award} ×
                              </Badge>
                            ))}
                          </div>
                        ) : null}

                        {AWARD_OPTIONS.map((group) => (
                          <div key={group.group} className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground">
                              {group.group}
                            </p>
                            <div className="flex flex-wrap gap-x-4 gap-y-1">
                              {group.options.map((option) => (
                                <label
                                  key={option}
                                  className="flex cursor-pointer items-center gap-1.5 text-sm"
                                >
                                  <Checkbox
                                    checked={selectedAwards.includes(option)}
                                    onCheckedChange={() => toggleAward(option)}
                                  />
                                  {option}
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">文章正文</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextField
                        placeholder="请填写文章正文。"
                        id="experience-content"
                        label="文章正文"
                        description="支持段落、列表、链接和空行。保存或再次提交后仍需管理员审核。"
                        value={field.value}
                        onChange={field.onChange}
                        editorKey={postId}
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
            <Button
              type="button"
              disabled={submitting}
              onClick={form.handleSubmit((values) => save(values, true))}
            >
              <Send className="mr-1 size-4" />
              {submitting ? "提交中..." : "保存并提交审核"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
