"use client";

import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import type { ClubContactRow } from "@/lib/contracts/clubs";

const CONTACT_TYPE_OPTIONS = [
  { value: "advisor", label: "指导老师" },
  { value: "student_lead", label: "学生负责人" },
  { value: "email", label: "邮箱" },
  { value: "wechat", label: "微信" },
  { value: "qq_group", label: "QQ群" },
] as const;

interface ClubContactsEditorProps {
  clubSlug: string;
  initialContacts: ClubContactRow[];
}

interface ContactDraft {
  contactType: (typeof CONTACT_TYPE_OPTIONS)[number]["value"];
  label: string;
  value: string;
}

export function ClubContactsEditor({
  clubSlug,
  initialContacts,
}: ClubContactsEditorProps) {
  const [contacts, setContacts] = useState<ContactDraft[]>(
    initialContacts.map((c) => ({
      contactType: c.contactType,
      label: c.label ?? "",
      value: c.value,
    })),
  );
  const [saving, setSaving] = useState(false);

  function addRow() {
    setContacts((prev) => [
      ...prev,
      { contactType: "student_lead", label: "", value: "" },
    ]);
  }

  function updateRow(index: number, patch: Partial<ContactDraft>) {
    setContacts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(index: number) {
    setContacts((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    const invalid = contacts.some((c) => !c.value.trim());
    if (invalid) {
      toast.error("联系方式内容不能为空");
      return;
    }

    setSaving(true);
    try {
      const res = await fetchWithCsrf(`/api/admin/clubs/${clubSlug}/contacts`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          contacts.map((c, index) => ({
            contactType: c.contactType,
            label: c.label || undefined,
            value: c.value.trim(),
            displayOrder: index,
          })),
        ),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message ?? "保存失败");
      }
      toast.success("联系方式已保存");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">联系方式</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {contacts.map((contact, index) => (
          <div
            key={index}
            className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center"
          >
            <Select
              value={contact.contactType}
              onValueChange={(value) =>
                updateRow(index, {
                  contactType: value as ContactDraft["contactType"],
                })
              }
            >
              <SelectTrigger className="sm:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="显示名称（可选）"
              className="sm:w-40"
              value={contact.label}
              onChange={(e) => updateRow(index, { label: e.target.value })}
            />
            <Input
              placeholder="联系方式内容"
              className="flex-1"
              value={contact.value}
              onChange={(e) => updateRow(index, { value: e.target.value })}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeRow(index)}
              className="shrink-0"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ))}

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addRow}>
            <Plus className="mr-1 size-3.5" />
            添加联系方式
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="mr-1 size-3.5" />
            {saving ? "保存中..." : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
