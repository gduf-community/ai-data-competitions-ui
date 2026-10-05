"use client";

import { useEffect } from "react";

import {
  withCsrfHeaders,
} from "@/lib/security/csrf-client";

const FETCH_PATCHED_FLAG = "__competitionCsrfFetchPatched";

export function SecurityFetchProvider() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.fetch !== "function") {
      return;
    }

    const fetchWithFlag = window.fetch as typeof window.fetch & {
      [FETCH_PATCHED_FLAG]?: boolean;
    };
    if (fetchWithFlag[FETCH_PATCHED_FLAG]) {
      return;
    }

    const originalFetch = window.fetch.bind(window);
    const patchedFetch: typeof window.fetch = async (input, init) => {
      return originalFetch(input, withCsrfHeaders(input, init));
    };

    (patchedFetch as typeof patchedFetch & { [FETCH_PATCHED_FLAG]?: boolean })[
      FETCH_PATCHED_FLAG
    ] = true;
    window.fetch = patchedFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}
