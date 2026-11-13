"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

// UI-only state for this browser tab; revisiting A must not replay completed counters.
const animatedCounts = new Set<string>();

export function AwardCount({ value, unit }: { value: number; unit: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reducedMotion = useReducedMotion();
  const completedValue = useRef<number | null>(null);
  const [counter, setCounter] = useState({ target: value, display: value });
  const display = reducedMotion || counter.target !== value ? value : counter.display;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const key = `${unit}:${value}`;
    if (animatedCounts.has(key) || !window.IntersectionObserver || reducedMotion || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const finish = requestAnimationFrame(() => {
        completedValue.current = value;
        setCounter({ target: value, display: value });
      });
      return () => cancelAnimationFrame(finish);
    }
    if (completedValue.current === value) return;
    let frame = 0;
    let started = false;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || entry.intersectionRatio < 0.5 || started) return;
      started = true;
      animatedCounts.add(key);
      observer.disconnect();
      setCounter({ target: value, display: 0 });
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - start) / 3000, 1);
        setCounter({ target: value, display: Math.floor(value * (1 - (1 - progress) ** 2)) });
        if (progress < 1) frame = requestAnimationFrame(tick);
        else completedValue.current = value;
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value, unit, reducedMotion]);
  return (
    <span ref={ref} role="img" className="inline-flex items-baseline gap-1 whitespace-nowrap" aria-label={`${value}${unit}`}>
      <strong aria-hidden="true" className="text-4xl font-semibold tabular-nums text-primary">{display.toLocaleString("zh-CN")}</strong>
      <span aria-hidden="true" className="text-sm text-muted-foreground">{unit}</span>
    </span>
  );
}

export function AwardCardMotion({ children }: { children: ReactNode }) {
  const reducedMotion = useReducedMotion();
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  return (
    <motion.article
      className="min-w-0"
      animate={reducedMotion ? { x: 0, y: 0 } : offset}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      onPointerMove={(event) => {
        if (event.pointerType !== "mouse" || reducedMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
        const box = event.currentTarget.getBoundingClientRect();
        setOffset({
          x: Math.max(-6, Math.min(6, (event.clientX - box.left - box.width / 2) / 30)),
          y: Math.max(-6, Math.min(6, (event.clientY - box.top - box.height / 2) / 30)),
        });
      }}
      onPointerLeave={() => setOffset({ x: 0, y: 0 })}
      onFocusCapture={() => setOffset({ x: 0, y: 0 })}
    >
      {children}
    </motion.article>
  );
}

export function AwardGalleryHeading({ title, navigationKey }: { title: string; navigationKey: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [navigationKey]);
  return (
    <h1 ref={heading} tabIndex={-1} className="text-2xl font-bold leading-relaxed break-words focus-visible:outline-2 focus-visible:outline-primary sm:text-3xl">
      {title}
    </h1>
  );
}
