"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface HallOfFameFormData {
  email: string;
  tag: string;
  bio: string;
  adminBio?: string | null;
  status: "invited" | "candidate" | "active" | "hidden";
  displayOrder: number;
}

interface HallOfFameEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultValues?: HallOfFameFormData;
  onSave: (data: HallOfFameFormData) => Promise<void>;
  isEdit: boolean;
}

const emptyValues: HallOfFameFormData = {
  email: "",
  tag: "",
  bio: "",
  adminBio: "",
  status: "invited",
  displayOrder: 0,
};

export function HallOfFameEditDialog({
  open,
  onOpenChange,
  defaultValues,
  onSave,
  isEdit,
}: HallOfFameEditDialogProps) {
  const [formData, setFormData] = useState<HallOfFameFormData>(
    defaultValues ?? emptyValues,
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        adminBio: formData.adminBio || null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "编辑名人堂成员" : "发送名人堂邀请"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isEdit ? (
            <div className="grid gap-2">
              <Label htmlFor="email">用户邮箱</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, email: event.target.value }))
                }
                placeholder="user@example.com"
              />
            </div>
          ) : null}
          <div className="grid gap-2">
            <Label htmlFor="tag">名人堂标签</Label>
            <Input
              id="tag"
              value={formData.tag}
              onChange={(event) =>
                setFormData((current) => ({ ...current, tag: event.target.value }))
              }
              placeholder="邀请阶段可留空，审核前再补充"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="bio">学生简介</Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(event) =>
                setFormData((current) => ({ ...current, bio: event.target.value }))
              }
              rows={3}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="adminBio">管理员备注</Label>
            <Textarea
              id="adminBio"
              value={formData.adminBio ?? ""}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  adminBio: event.target.value,
                }))
              }
              rows={2}
              placeholder="可选，可覆盖学生简介"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>状态</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    status: value as HallOfFameFormData["status"],
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="invited">已邀请</SelectItem>
                  <SelectItem value="candidate">待审核</SelectItem>
                  <SelectItem value="active">展示中</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="displayOrder">排序</Label>
              <Input
                id="displayOrder"
                type="number"
                value={formData.displayOrder}
                onChange={(event) =>
                  setFormData((current) => ({
                    ...current,
                    displayOrder: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
