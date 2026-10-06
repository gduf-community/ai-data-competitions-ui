"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "@/lib/i18n/toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchWithCsrf } from "@/lib/security/csrf-client";
import type { ClubAdminRow } from "@/lib/contracts/clubs";

interface ClubAdminsEditorProps {
  clubSlug: string;
  initialAdmins: ClubAdminRow[];
}

export function ClubAdminsEditor({
  clubSlug,
  initialAdmins,
}: ClubAdminsEditorProps) {
  const [admins, setAdmins] = useState(initialAdmins);
  const [email, setEmail] = useState("");
  const [binding, setBinding] = useState(false);
  const [unbindingId, setUnbindingId] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch(`/api/admin/clubs/${clubSlug}/admins`);
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      setAdmins(body.data ?? []);
    }
  }

  async function handleBind() {
    if (!email.trim()) {
      toast.error("请输入用户邮箱");
      return;
    }
    setBinding(true);
    try {
      const res = await fetchWithCsrf(`/api/admin/clubs/${clubSlug}/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message ?? "绑定失败");
      }
      toast.success("已绑定社团管理员");
      setEmail("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "绑定失败");
    } finally {
      setBinding(false);
    }
  }

  async function handleUnbind(userId: string) {
    setUnbindingId(userId);
    try {
      const res = await fetchWithCsrf(
        `/api/admin/clubs/${clubSlug}/admins/${userId}`,
        { method: "DELETE" },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.message ?? "解绑失败");
      }
      toast.success("已解绑");
      setAdmins((prev) => prev.filter((a) => a.userId !== userId));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "解绑失败");
    } finally {
      setUnbindingId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">社团管理员</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="输入用户邮箱以绑定"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Button onClick={handleBind} disabled={binding} className="shrink-0">
            <Plus className="mr-1 size-4" />
            {binding ? "绑定中..." : "绑定"}
          </Button>
        </div>

        {admins.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            暂无社团管理员，绑定后对方即可在&ldquo;我的-社团管理&rdquo;中发布内容。
          </p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{admin.userName}</p>
                  <p className="text-xs text-muted-foreground">
                    {admin.userEmail}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={unbindingId === admin.userId}
                  onClick={() => handleUnbind(admin.userId)}
                >
                  <Trash2 className="mr-1 size-3.5 text-destructive" />
                  解绑
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
