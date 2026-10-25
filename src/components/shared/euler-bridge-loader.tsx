"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

// Split the closed loop at its four nodes so every particle source starts at an
// exact node, regardless of segment length. See docs/视觉与交互规范.md.
const curves = [
  {
    name: "bridge",
    color: "var(--euler-bridge-ink)",
    path: "M 49.606 8.503 C 95.494 8.503 85.527 39.345 49.600 54.600 C 13.673 69.855 15.100 91.000 49.609 91.000",
  },
  {
    name: "lower-arc",
    color: "var(--euler-bridge-ink)",
    path: "M 49.609 91.000 C 26.550 91.000 7.856 72.412 7.856 49.482",
  },
  {
    name: "bronze",
    color: "var(--euler-bridge-bronze)",
    path: "M 7.856 49.482 C 14.000 74.000 39.000 85.000 53.000 76.000 C 67.000 67.000 44.000 47.000 59.000 32.000 C 74.000 17.000 92.066 22.000 92.066 49.483",
  },
  {
    name: "upper-arc",
    color: "var(--euler-bridge-bronze)",
    path: "M 92.066 49.483 C 92.066 26.850 73.056 8.503 49.606 8.503",
  },
] as const;

const nodes = [
  { x: 49.606, y: 8.503, color: "var(--euler-bridge-bronze)" },
  { x: 92.066, y: 49.483, color: "var(--euler-bridge-bronze)" },
  { x: 49.609, y: 91, color: "var(--euler-bridge-ink)" },
  { x: 7.856, y: 49.482, color: "var(--euler-bridge-ink)" },
];

const particleCount = 32;
const durationMs = 4600;
const rotationDurationMs = 20000;
const trailSpan = 0.16;

export function EulerBridgeLoader({ className }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const rotorRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rotor = rotorRef.current!;
    let length = 0;
    const sections = Array.from(svgRef.current!.querySelectorAll<SVGGElement>("[data-curve]"), (group, index) => {
      const path = group.querySelector<SVGPathElement>("path")!;
      const sectionLength = path.getTotalLength();
      const offset = length;
      length += sectionLength;
      // Arc-length samples keep both speed and the four emission points exact.
      const samples = Array.from({ length: 257 }, (_, i) => path.getPointAtLength(sectionLength * i / 256));
      const color = curves[index].color;
      const particles = Array.from(group.querySelectorAll("circle"), (node, particleIndex) => {
        const tail = particleIndex / (particleCount - 1);
        const fade = Math.pow(1 - tail, 0.56);
        // Keep initialized particles under their source node until the first frame.
        node.setAttribute("cx", samples[0].x.toFixed(3));
        node.setAttribute("cy", samples[0].y.toFixed(3));
        node.setAttribute("r", (0.35 + fade * 1.2).toFixed(3));
        node.setAttribute("opacity", (0.04 + fade * 0.96).toFixed(3));
        node.setAttribute("fill", color);
        return { node, tailOffset: tail * trailSpan, color };
      });
      return { group, samples, length: sectionLength, offset, color: curves[index].color,
        particles };
    });
    let frame = 0;
    let previousTime: number | undefined;
    let elapsed = 0;

    // Adapted from the point()/getParticle() trail method in Paidax01/math-curve-loaders,
    // main.js at 70f4e00a6d452532039ff7c2ccb4c379ec90c772. No geometric pulse.
    function render(now: number) {
      if (previousTime !== undefined) elapsed += now - previousTime;
      previousTime = now;
      rotor.setAttribute("transform", `rotate(${(elapsed % rotationDurationMs) / rotationDurationMs * 360} 50 50)`);
      for (const trail of sections) {
        const progress = elapsed / durationMs + trail.offset / length;
        trail.particles.forEach(particle => {
          const position = ((progress - particle.tailOffset) % 1 + 1) % 1;
          const distance = position * length;
          const section = sections.find(item => distance < item.offset + item.length) ?? sections[sections.length - 1];
          const sample = Math.max(0, Math.min(256, (distance - section.offset) / section.length * 256));
          const start = Math.min(255, Math.floor(sample));
          const weight = sample - start;
          const a = section.samples[start], b = section.samples[start + 1];
          particle.node.setAttribute("cx", (a.x + (b.x - a.x) * weight).toFixed(3));
          particle.node.setAttribute("cy", (a.y + (b.y - a.y) * weight).toFixed(3));
          if (particle.color !== section.color) {
            particle.node.setAttribute("fill", section.color);
            particle.color = section.color;
          }
        });
      }
      frame = requestAnimationFrame(render);
    }

    function syncAnimation() {
      cancelAnimationFrame(frame);
      previousTime = undefined;
      const paused = motion.matches || document.hidden;
      if (motion.matches) {
        elapsed = 0;
        rotor.setAttribute("transform", "rotate(0 50 50)");
      }
      for (const { group } of sections) {
        group.querySelector("[data-particles]")!.setAttribute("visibility", paused ? "hidden" : "visible");
      }
      if (!paused) frame = requestAnimationFrame(render);
    }

    motion.addEventListener("change", syncAnimation);
    document.addEventListener("visibilitychange", syncAnimation);
    syncAnimation();
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener("change", syncAnimation);
      document.removeEventListener("visibilitychange", syncAnimation);
    };
  }, []);

  return (
    <svg ref={svgRef} viewBox="0 0 100 100" width={96} height={96}
      className={cn("euler-bridge-loader size-24 shrink-0", className)} aria-hidden="true" focusable="false">
      <g ref={rotorRef} data-rotor="" transform="rotate(0 50 50)">
        {curves.map(curve => (
          <g key={curve.name} data-curve={curve.name} fill={curve.color}>
            <path d={curve.path} fill="none" stroke={curve.color} strokeWidth={2.1}
              strokeLinecap="round" strokeLinejoin="round" opacity={0.35} />
            <g data-particles="" className="motion-reduce:hidden">
              {Array.from({ length: particleCount }, (_, i) => <circle key={i} cx={0} cy={0} r={0} opacity={0} />)}
            </g>
          </g>
        ))}
        {nodes.map((node, i) => <circle key={i} cx={node.x} cy={node.y} r={3.1} fill={node.color} />)}
      </g>
    </svg>
  );
}
