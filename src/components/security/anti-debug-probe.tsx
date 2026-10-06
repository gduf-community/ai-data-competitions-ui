"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { getAntiDebugRoutePolicy } from "@/lib/security/anti-debug-policy";
import {
  markSensitiveDebugDetected,
  reportClientSecurityEvent,
} from "@/lib/security/client-security-event";

function detectViewportDelta() {
  const deltaWidth = Math.abs(window.outerWidth - window.innerWidth);
  const deltaHeight = Math.abs(window.outerHeight - window.innerHeight);
  return deltaWidth > 160 || deltaHeight > 160;
}

function detectDebuggerDelay() {
  const start = performance.now();
  debugger;
  const elapsed = performance.now() - start;
  return elapsed > 120;
}

export function AntiDebugProbe() {
  const pathname = usePathname();
  const runCountRef = useRef(0);

  useEffect(() => {
    if (!pathname) return;

    const { policy, tab } = getAntiDebugRoutePolicy(pathname);
    if (policy === "off") return;

    let disposed = false;
    const maybeReport = async (detection: "viewport_delta" | "debugger_delay") => {
      if (disposed) return;
      const reported = await reportClientSecurityEvent({
        policy,
        detection,
        pathname,
        tab,
      });
      if (reported && policy === "sensitive") {
        markSensitiveDebugDetected();
      }
    };

    const runDetection = () => {
      if (detectViewportDelta()) {
        void maybeReport("viewport_delta");
      }

      runCountRef.current += 1;
      if (runCountRef.current % 3 === 0 && detectDebuggerDelay()) {
        void maybeReport("debugger_delay");
      }
    };

    const interval = window.setInterval(runDetection, 4000);
    window.addEventListener("resize", runDetection);
    runDetection();

    return () => {
      disposed = true;
      clearInterval(interval);
      window.removeEventListener("resize", runDetection);
    };
  }, [pathname]);

  return null;
}
