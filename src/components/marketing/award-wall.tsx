"use client";

import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Award } from "lucide-react";

import { CertificateCard } from "./certificate-card";
import type { AwardShowcaseRow } from "@/lib/contracts/profiles";

interface AwardWallProps {
  awards: AwardShowcaseRow[];
}

function AwardCard({
  award,
  index,
}: {
  award: AwardShowcaseRow;
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  const prefersReducedMotion = useReducedMotion();

  const delay = Math.min(index * 0.08, 0.4);

  return (
    <motion.div
      ref={ref}
      style={{
        opacity: prefersReducedMotion ? 1 : isInView ? 1 : 0,
        transform: prefersReducedMotion
          ? "none"
          : isInView
            ? "translateY(0) scale(1)"
            : `translateY(${20 + (index % 3) * 10}px) scale(0.95)`,
        transition: `opacity 0.6s cubic-bezier(0.25,0.1,0.25,1) ${delay}s, transform 0.6s cubic-bezier(0.25,0.1,0.25,1) ${delay}s`,
      }}
    >
      <CertificateCard award={award} variant="featured" />
    </motion.div>
  );
}

export function AwardWall({ awards }: AwardWallProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const gridY = useTransform(scrollYProgress, [0, 1], ["4%", "-4%"]);
  const gridScale = useTransform(scrollYProgress, [0, 0.5], [0.97, 1]);

  if (awards.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center">
        <Award className="mx-auto size-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">奖状作品墙准备中</p>
        <p className="mt-1 text-xs text-muted-foreground">
          管理台选中的优秀奖状会展示在这里
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <motion.div
        style={prefersReducedMotion ? undefined : { y: gridY, scale: gridScale }}
        className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
      >
        {awards.map((award, index) => (
          <AwardCard key={award.id} award={award} index={index} />
        ))}
      </motion.div>
    </div>
  );
}
