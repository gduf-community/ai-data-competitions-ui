import Image, { type ImageProps } from "next/image"

import { cn } from "@/lib/utils"

interface LogoProps extends Omit<ImageProps, "src" | "alt" | "width" | "height"> {
  size?: number
}

export function Logo({ size = 24, className, ...props }: LogoProps) {
  return (
    <Image
      src="/gduf-community-icon-256.png"
      alt="学院竞赛平台"
      width={size}
      height={size}
      unoptimized
      className={cn("shrink-0 rounded-md object-contain", className)}
      {...props}
    />
  )
}
