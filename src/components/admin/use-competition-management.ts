"use client";
import { useEffect, useRef, useState } from "react";
import type { Competition } from "@/lib/types";
import { useJSONResource } from "@/hooks/use-json-resource";
import { requestJSON, isAbortError } from "@/lib/http-client";
import { confirmI18n } from "@/lib/i18n/client";
import { toast } from "@/lib/i18n/toast";
import type { CompetitionFormRequest } from "./competition-form-model";
function parseCompetitions(payload: unknown): Competition[] {
  if (
    !payload ||
    typeof payload !== "object" ||
    !("competitions" in payload) ||
    !Array.isArray(payload.competitions)
  )
    throw new Error("比赛列表响应不完整，请重试");
  return payload.competitions;
}

export function useCompetitionManagement() {
  const resource = useJSONResource(
    "/api/admin/competitions",
    parseCompetitions,
  );
  const [editing, setEditing] = useState<Competition>();
  const [showForm, setShowForm] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string>();
  const [detailLoading, setDetailLoading] = useState(false);
  const detailRequest = useRef<AbortController | null>(null);
  const writeLock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      detailRequest.current?.abort();
    };
  }, []);
  function cancelDetail() {
    detailRequest.current?.abort();
    detailRequest.current = null;
    setDetailLoading(false);
  }
  function startCreate() {
    if (writeLock.current) return;
    cancelDetail();
    setEditing(undefined);
    setEditorKey((key) => key + 1);
    setShowForm(true);
  }
  async function startEdit(item: Competition) {
    if (writeLock.current) return;
    cancelDetail();
    setShowForm(false);
    setEditing(undefined);
    const controller = new AbortController();
    detailRequest.current = controller;
    setDetailLoading(true);
    try {
      const payload = await requestJSON<{ competition?: Competition }>(
        "/api/admin/competitions/" + item.id,
        { cache: "no-store", signal: controller.signal },
      );
      if (
        controller.signal.aborted ||
        detailRequest.current !== controller ||
        !mounted.current
      )
        return;
      if (!payload.competition || payload.competition.id !== item.id)
        throw new Error("比赛详情响应不完整");
      setEditing(payload.competition);
      setEditorKey((key) => key + 1);
      setShowForm(true);
    } catch (error) {
      if (mounted.current && !controller.signal.aborted && !isAbortError(error))
        toast.error(
          error instanceof Error ? error.message : "加载比赛详情失败",
        );
    } finally {
      if (mounted.current && detailRequest.current === controller) {
        detailRequest.current = null;
        setDetailLoading(false);
      }
    }
  }
  function cancelForm() {
    if (writeLock.current) return;
    cancelDetail();
    setShowForm(false);
    setEditing(undefined);
  }
  async function saveCompetition(input: CompetitionFormRequest) {
    if (writeLock.current) return;
    writeLock.current = true;
    setSaving(true);
    try {
      await requestJSON(
        editing
          ? "/api/admin/competitions/" + editing.id
          : "/api/admin/competitions",
        { method: editing ? "PATCH" : "POST", json: input },
      );
      if (!mounted.current) return;
      toast.success(editing ? "比赛已更新" : "比赛已创建");
      cancelDetail();
      setShowForm(false);
      setEditing(undefined);
      resource.reload();
    } finally {
      writeLock.current = false;
      if (mounted.current) setSaving(false);
    }
  }
  async function handleDelete(item: Competition) {
    if (
      writeLock.current ||
      !confirmI18n("确认删除比赛「" + item.title + "」吗？")
    )
      return;
    writeLock.current = true;
    setDeletingId(item.id);
    try {
      await requestJSON("/api/admin/competitions/" + item.id, {
        method: "DELETE",
        expect: "empty",
      });
      if (mounted.current) {
        toast.success("比赛已删除");
        resource.reload();
      }
    } catch (error) {
      if (mounted.current)
        toast.error(error instanceof Error ? error.message : "删除比赛失败");
    } finally {
      writeLock.current = false;
      if (mounted.current) setDeletingId(undefined);
    }
  }
  return {
    resource,
    editing,
    showForm,
    editorKey,
    saving,
    deletingId,
    busy: saving || !!deletingId,
    detailLoading,
    startCreate,
    startEdit,
    cancelDetail,
    cancelForm,
    saveCompetition,
    handleDelete,
  };
}
