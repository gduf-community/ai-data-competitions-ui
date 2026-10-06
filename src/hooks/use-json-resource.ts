"use client";

import { useCallback, useEffect, useState } from "react";
import { requestJSON } from "@/lib/http-client";

// Shared only by full-list readers; mutations remain explicit in their business page.
export function useJSONResource<T>(url: string, parse: (payload: unknown) => T) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{ url: string; revision: number; data?: T; error?: string }>();
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController();
    void requestJSON<unknown>(url, { cache: "no-store", signal: controller.signal })
      .then(parse)
      .then(data => {
        if (!controller.signal.aborted) setResult({ url, revision, data });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setResult(current => ({ url, revision,
          data: current?.url === url ? current.data : undefined,
          error: error instanceof Error ? error.message : "加载失败，请重试",
        }));
      });
    return () => controller.abort();
  }, [url, revision, parse]);
  const current = result?.url === url && result.revision === revision;
  return { data: result?.url === url ? result.data : undefined, loading: !current,
    error: current ? result.error : undefined, reload };
}
