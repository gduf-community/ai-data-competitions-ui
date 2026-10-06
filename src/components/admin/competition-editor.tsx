"use client";
import { useState } from "react";
import { Paperclip, Plus, Trash2, X } from "lucide-react";
import { RichTextField } from "@/components/forms/rich-text-field";
import { useI18nText } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Competition, CompetitionRecognition, CompetitionStatus, CompetitionCtaType, RegistrationMode } from "@/lib/types";
import { buildCompetitionRequest, competitionToForm, createDefaultCompetitionFormValues, type CompetitionFormValues, type CompetitionFormRequest } from "./competition-form-model";
export { buildCompetitionRequest, competitionToForm, createDefaultCompetitionFormValues } from "./competition-form-model";
export type { CompetitionFormValues, CompetitionFormRequest } from "./competition-form-model";

/* ---------- helpers ---------- */

function normalizeText(value: string) { return value.trim(); }

/* ---------- dynamic list helpers ---------- */

function addStringItem(list: string[], setter: (items: string[]) => void) {
  setter([...list, ""]);
}

function updateStringItem(
  list: string[],
  index: number,
  value: string,
  setter: (items: string[]) => void,
) {
  const next = [...list];
  next[index] = value;
  setter(next);
}

function removeStringItem(
  list: string[],
  index: number,
  setter: (items: string[]) => void,
) {
  setter(list.filter((_, i) => i !== index));
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="md:col-span-2 mt-2 mb-1 border-b border-border/60 pb-1.5 text-sm font-semibold text-muted-foreground">
      {children}
    </div>
  );
}

// Parent keys this editor per open action; create/edit never share stale input.
export function CompetitionEditor({ competition, submitting, onSave, onCancel }: {
  competition?: Competition; submitting: boolean;
  onSave: (input: CompetitionFormRequest) => Promise<void>; onCancel: () => void;
}) {
  const { tt } = useI18nText();
  const [formValues, setFormValues] = useState<CompetitionFormValues>(() => competition ? competitionToForm(competition) : createDefaultCompetitionFormValues());
  const [subTrackInput, setSubTrackInput] = useState("");
  function commitSubTrackInput() {
    const nextValue = normalizeText(subTrackInput);
    if (!nextValue) return;

    setFormValues((current) => {
      if (current.subTracks.includes(nextValue)) {
        return current;
      }
      return {
        ...current,
        subTracks: [...current.subTracks, nextValue],
      };
    });
    setSubTrackInput("");
  }

  async function submitForm() {
    if (
      !formValues.title.trim() ||
      !formValues.category.trim() ||
      !Number.isInteger(formValues.competitionYear) ||
      !formValues.summary.trim() ||
      !formValues.department.trim()
    ) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (formValues.competitionYear < 2000 || formValues.competitionYear > 2100) {
      toast.error("所属年份需在 2000 到 2100 之间");
      return;
    }

    if (formValues.registrationMode === "team" && formValues.maxTeamSize < 2) {
      toast.error("团队报名比赛的每队最大人数不能小于 2");
      return;
    }

    if (
      formValues.registrationStartAt &&
      formValues.registrationEndAt &&
      formValues.registrationStartAt >= formValues.registrationEndAt
    ) {
      toast.error("报名开始时间必须早于报名截止时间");
      return;
    }

    if (
      formValues.eventStartAt &&
      formValues.eventEndAt &&
      formValues.eventStartAt >= formValues.eventEndAt
    ) {
      toast.error("比赛开始时间必须早于比赛结束时间");
      return;
    }

    try {
      await onSave(buildCompetitionRequest(formValues, competition?.id));
    } catch (error) { toast.error(error instanceof Error ? error.message : "保存比赛失败"); }
  }
  return (
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>{competition?.id ? "编辑比赛" : "新建比赛"}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <fieldset disabled={submitting} className="contents">
              {/* ---- 基本信息 ---- */}
              <SectionLabel>基本信息</SectionLabel>
              <div className="space-y-2">
                <Label htmlFor="c-title">比赛标题 *</Label>
                <Input
                  id="c-title"
                  value={formValues.title}
                  onChange={(e) => setFormValues((p) => ({ ...p, title: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-category">比赛分类 *</Label>
                <Input
                  id="c-category"
                  value={formValues.category}
                  onChange={(e) => setFormValues((p) => ({ ...p, category: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-year">所属年份 *</Label>
                <Input
                  id="c-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={formValues.competitionYear}
                  onChange={(e) =>
                    setFormValues((p) => ({
                      ...p,
                      competitionYear: Number(e.target.value || 2026),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>认可标签 *</Label>
                <Select
                  value={formValues.recognition}
                  onValueChange={(v) =>
                    setFormValues((p) => ({
                      ...p,
                      recognition: v as CompetitionRecognition,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school_listed">校内名单</SelectItem>
                    <SelectItem value="national_listed">全国名单</SelectItem>
                    <SelectItem value="school_and_national">校内名单+全国名单</SelectItem>
                    <SelectItem value="unlisted">名单外</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-department">主办院系 *</Label>
                <Input
                  id="c-department"
                  value={formValues.department}
                  onChange={(e) => setFormValues((p) => ({ ...p, department: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-location">比赛地点</Label>
                <Input
                  id="c-location"
                  value={formValues.location}
                  placeholder={tt("如：学院楼B201")}
                  onChange={(e) => setFormValues((p) => ({ ...p, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="c-summary">比赛简介 *</Label>
                <Input
                  id="c-summary"
                  value={formValues.summary}
                  onChange={(e) => setFormValues((p) => ({ ...p, summary: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="c-description">比赛详情（长文本）</Label>
                <RichTextField
                  id="c-description"
                  label=" "
                  description={tt("直接复用通知富文本样板，支持段落、列表、链接和空行。")}
                  value={formValues.description}
                  onChange={(value) => setFormValues((p) => ({ ...p, description: value }))}
                  placeholder={tt("详细描述比赛要求、评审标准、奖项设置等...")}
                  editorKey={competition?.id ?? "new-competition"}
                />
              </div>
              <div className="space-y-2">
                <Label>比赛状态</Label>
                <Select
                  value={formValues.status}
                  onValueChange={(v) => setFormValues((p) => ({ ...p, status: v as CompetitionStatus }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="upcoming">即将开始</SelectItem>
                    <SelectItem value="registration_open">报名中</SelectItem>
                    <SelectItem value="in_progress">进行中</SelectItem>
                    <SelectItem value="finished">已结束</SelectItem>
                    <SelectItem value="previous_recording">往期比赛补录中</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-cover-label">封面标签</Label>
                <Input
                  id="c-cover-label"
                  value={formValues.coverLabel}
                  placeholder={tt("如：国家级 · A类")}
                  onChange={(e) => setFormValues((p) => ({ ...p, coverLabel: e.target.value }))}
                />
              </div>

              {/* ---- 时间安排 ---- */}
              <SectionLabel>时间安排</SectionLabel>
              <div className="space-y-2">
                <Label htmlFor="c-reg-start">报名开始</Label>
                <Input
                  id="c-reg-start"
                  type="datetime-local"
                  value={formValues.registrationStartAt}
                  onChange={(e) => setFormValues((p) => ({ ...p, registrationStartAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-reg-end">报名截止</Label>
                <Input
                  id="c-reg-end"
                  type="datetime-local"
                  value={formValues.registrationEndAt}
                  onChange={(e) => setFormValues((p) => ({ ...p, registrationEndAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-event-start">比赛开始</Label>
                <Input
                  id="c-event-start"
                  type="datetime-local"
                  value={formValues.eventStartAt}
                  onChange={(e) => setFormValues((p) => ({ ...p, eventStartAt: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-event-end">比赛结束</Label>
                <Input
                  id="c-event-end"
                  type="datetime-local"
                  value={formValues.eventEndAt}
                  onChange={(e) => setFormValues((p) => ({ ...p, eventEndAt: e.target.value }))}
                />
              </div>

              {/* ---- 报名配置 ---- */}
              <SectionLabel>报名配置</SectionLabel>
              <div className="space-y-2">
                <Label>报名模式</Label>
                <Select
                  value={formValues.registrationMode}
                  onValueChange={(v) =>
                    setFormValues((p) => ({
                      ...p,
                      registrationMode: v as RegistrationMode,
                      maxTeamSize: v === "team" ? Math.max(p.maxTeamSize, 2) : 1,
                    }))
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">个人报名</SelectItem>
                    <SelectItem value="team">团队报名</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-max-team">每队最大人数</Label>
                <Input
                  id="c-max-team"
                  type="number"
                  min={1}
                  max={20}
                  value={formValues.maxTeamSize}
                  onChange={(e) => {
                    const raw = Number(e.target.value);
                    const next = Number.isFinite(raw) ? Math.trunc(raw) : 1;
                    setFormValues((p) => ({
                      ...p,
                      maxTeamSize: p.registrationMode === "team" ? Math.min(20, Math.max(2, next)) : 1,
                    }));
                  }}
                  disabled={formValues.registrationMode !== "team"}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 pt-2">
                  <input
                    id="c-advisors-required"
                    type="checkbox"
                    checked={formValues.advisorsRequired}
                    onChange={(e) =>
                      setFormValues((p) => ({ ...p, advisorsRequired: e.target.checked }))
                    }
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                  <Label htmlFor="c-advisors-required" className="cursor-pointer">
                    指导老师为必填项
                  </Label>
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="c-sub-track-input">子赛道</Label>
                <div className="flex gap-2">
                  <Input
                    id="c-sub-track-input"
                    value={subTrackInput}
                    placeholder={tt("输入子赛道后按回车添加，如：视觉导航")}
                    onChange={(e) => setSubTrackInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitSubTrackInput();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={commitSubTrackInput}>
                    添加
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  支持按回车逐个添加。未配置子赛道时，报名页默认不展示选择项。
                </p>
                {formValues.subTracks.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formValues.subTracks.map((item) => (
                      <Badge
                        key={item}
                        variant="secondary"
                        className="flex items-center gap-1 rounded-full px-3 py-1"
                      >
                        <span>{item}</span>
                        <button
                          type="button"
                          className="rounded-full p-0.5 text-muted-foreground transition hover:text-foreground"
                          onClick={() =>
                            setFormValues((current) => ({
                              ...current,
                              subTracks: current.subTracks.filter((track) => track !== item),
                            }))
                          }
                          aria-label={`删除子赛道 ${item}`}
                        >
                          <X className="size-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>报名入口类型</Label>
                <Select
                  value={formValues.ctaType}
                  onValueChange={(v) => setFormValues((p) => ({ ...p, ctaType: v as CompetitionCtaType }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal_only">仅校内报名</SelectItem>
                    <SelectItem value="official_plus_profile">官网 + 校内资料</SelectItem>
                    <SelectItem value="official_only">仅官网报名</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-official-url">官网链接</Label>
                <Input
                  id="c-official-url"
                  placeholder={tt("https://")}
                  value={formValues.officialUrl}
                  onChange={(e) => setFormValues((p) => ({ ...p, officialUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-wechat-url">微信推文链接</Label>
                <Input
                  id="c-wechat-url"
                  placeholder={tt("https://mp.weixin.qq.com/...")}
                  value={formValues.wechatArticleUrl}
                  onChange={(e) => setFormValues((p) => ({ ...p, wechatArticleUrl: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="c-cta-override">按钮文案覆盖（可选）</Label>
                <Input
                  id="c-cta-override"
                  placeholder={tt("如：官网报名并填写资料")}
                  value={formValues.ctaLabelOverride}
                  onChange={(e) => setFormValues((p) => ({ ...p, ctaLabelOverride: e.target.value }))}
                />
              </div>

              {/* ---- 赛事亮点 ---- */}
              <SectionLabel>赛事亮点</SectionLabel>
              <div className="space-y-2 md:col-span-2">
                {formValues.highlights.map((h, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={h}
                      placeholder={tt(`亮点 #${i + 1}`)}
                      onChange={(e) =>
                        updateStringItem(formValues.highlights, i, e.target.value, (v) =>
                          setFormValues((p) => ({ ...p, highlights: v })),
                        )
                      }
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        removeStringItem(formValues.highlights, i, (v) =>
                          setFormValues((p) => ({ ...p, highlights: v })),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    addStringItem(formValues.highlights, (v) =>
                      setFormValues((p) => ({ ...p, highlights: v })),
                    )
                  }
                >
                  <Plus className="size-3.5 mr-1" /> 添加亮点
                </Button>
              </div>

              {/* ---- 时间轴 / 赛程 ---- */}
              <SectionLabel>时间轴 / 赛程安排</SectionLabel>
              <div className="space-y-3 md:col-span-2">
                {formValues.timeline.map((item, i) => (
                  <div key={i} className="grid gap-2 rounded border border-border p-3 md:grid-cols-3">
                    <Input
                      placeholder={tt("阶段名（如：初赛）")}
                      value={item.label}
                      onChange={(e) => {
                        const next = [...formValues.timeline];
                        next[i] = { ...next[i], label: e.target.value };
                        setFormValues((p) => ({ ...p, timeline: next }));
                      }}
                    />
                    <Input
                      placeholder={tt("日期（如：2025-03-15）")}
                      value={item.date}
                      onChange={(e) => {
                        const next = [...formValues.timeline];
                        next[i] = { ...next[i], date: e.target.value };
                        setFormValues((p) => ({ ...p, timeline: next }));
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder={tt("说明")}
                        value={item.description}
                        onChange={(e) => {
                          const next = [...formValues.timeline];
                          next[i] = { ...next[i], description: e.target.value };
                          setFormValues((p) => ({ ...p, timeline: next }));
                        }}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setFormValues((p) => ({
                            ...p,
                            timeline: p.timeline.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFormValues((p) => ({
                      ...p,
                      timeline: [...p.timeline, { label: "", date: "", description: "" }],
                    }))
                  }
                >
                  <Plus className="size-3.5 mr-1" /> 添加赛程节点
                </Button>
              </div>

              {/* ---- 常见问题 FAQ ---- */}
              <SectionLabel>常见问题 FAQ</SectionLabel>
              <div className="space-y-3 md:col-span-2">
                {formValues.faqs.map((faq, i) => (
                  <div key={i} className="grid gap-2 rounded border border-border p-3 md:grid-cols-2">
                    <Input
                      placeholder={tt("问题")}
                      value={faq.question}
                      onChange={(e) => {
                        const next = [...formValues.faqs];
                        next[i] = { ...next[i], question: e.target.value };
                        setFormValues((p) => ({ ...p, faqs: next }));
                      }}
                    />
                    <div className="flex gap-2">
                      <Input
                        placeholder={tt("答案")}
                        value={faq.answer}
                        onChange={(e) => {
                          const next = [...formValues.faqs];
                          next[i] = { ...next[i], answer: e.target.value };
                          setFormValues((p) => ({ ...p, faqs: next }));
                        }}
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() =>
                          setFormValues((p) => ({
                            ...p,
                            faqs: p.faqs.filter((_, idx) => idx !== i),
                          }))
                        }
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setFormValues((p) => ({
                      ...p,
                      faqs: [...p.faqs, { question: "", answer: "" }],
                    }))
                  }
                >
                  <Plus className="size-3.5 mr-1" /> 添加 FAQ
                </Button>
              </div>

              {/* ---- 相关问题链接 ---- */}
              <SectionLabel>相关比赛提示（关联问题）</SectionLabel>
              <div className="space-y-2 md:col-span-2">
                {formValues.relatedQuestions.map((q, i) => (
                  <div key={i} className="flex gap-2">
                    <Input
                      value={q}
                      placeholder={tt(`问题 #${i + 1}`)}
                      onChange={(e) =>
                        updateStringItem(formValues.relatedQuestions, i, e.target.value, (v) =>
                          setFormValues((p) => ({ ...p, relatedQuestions: v })),
                        )
                      }
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        removeStringItem(formValues.relatedQuestions, i, (v) =>
                          setFormValues((p) => ({ ...p, relatedQuestions: v })),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    addStringItem(formValues.relatedQuestions, (v) =>
                      setFormValues((p) => ({ ...p, relatedQuestions: v })),
                    )
                  }
                >
                  <Plus className="size-3.5 mr-1" /> 添加问题
                </Button>
              </div>

              {/* ---- 附件下载 ---- */}
              <SectionLabel>附件下载</SectionLabel>
              <div className="space-y-3 md:col-span-2">
                <p className="text-xs text-muted-foreground">
                  手动输入附件名称或下载链接（格式：名称|||下载链接）。
                </p>

                {formValues.attachments.map((name, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
                      <Paperclip className="size-3.5 text-muted-foreground shrink-0" />
                      <Input
                        value={name}
                        placeholder={tt("附件名称（如：报名表模板）")}
                        className="border-0 p-0 h-auto shadow-none focus-visible:ring-0"
                        onChange={(e) =>
                          updateStringItem(formValues.attachments, i, e.target.value, (v) =>
                            setFormValues((p) => ({ ...p, attachments: v })),
                          )
                        }
                      />
                    </div>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        removeStringItem(formValues.attachments, i, (v) =>
                          setFormValues((p) => ({ ...p, attachments: v })),
                        )
                      }
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    addStringItem(formValues.attachments, (v) =>
                      setFormValues((p) => ({ ...p, attachments: v })),
                    )
                  }
                >
                  <Plus className="size-3.5 mr-1" /> 手动添加附件名称
                </Button>
              </div>

              {/* ---- 按钮区 ---- */}
              <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
                <Button onClick={submitForm} disabled={submitting}>
                  {submitting ? "保存中..." : competition?.id ? "保存修改" : "创建比赛"}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={submitting}>
                  取消
                </Button>
              </div>
              </fieldset>
            </CardContent>
          </Card>
  );
}
