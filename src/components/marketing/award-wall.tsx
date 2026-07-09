"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Award } from "lucide-react";

import type { AwardShowcaseEntry } from "@/lib/mock-data";

interface AwardWallProps {
  awards: AwardShowcaseEntry[];
}

function AwardWallImage({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return (
      <div className="flex size-full items-center justify-center bg-muted/40 px-4 text-center text-xs text-muted-foreground">
        奖状图片暂不可用
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      loading="lazy"
      quality={70}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
      className="object-cover transition-transform duration-500 group-hover:scale-105"
    />
  );
}

function AwardCard({
  award,
  index,
}: {
  award: AwardShowcaseEntry;
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
      className="group relative overflow-hidden rounded-xl border border-border/50 bg-background/80 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-primary/5"
    >
      <Link
        href={`/awards/${award.id}`}
        className="block focus-visible:outline-none"
        aria-label={`查看 ${award.competitionTitle} 奖状详情`}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <AwardWallImage src={award.imageUrl} alt={award.competitionTitle} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          <div className="absolute inset-x-0 bottom-0 flex translate-y-2 items-center justify-between px-3 py-2 text-xs text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <span>查看奖状详情</span>
            <span>{award.userName}</span>
          </div>
        </div>
      </Link>
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-sm font-medium text-foreground">
          {award.competitionTitle}
        </p>
        {award.awardLevel ? (
          <p className="text-xs text-primary">{award.awardLevel}</p>
        ) : null}
        <p className="text-xs text-muted-foreground">{award.userName}</p>
      </div>
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
