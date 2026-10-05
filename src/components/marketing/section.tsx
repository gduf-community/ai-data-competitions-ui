import type * as React from "react";

import { cn } from "@/lib/utils";

export function Section({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("px-4 py-14 sm:py-20 md:px-6 md:py-24", className)}
      {...props}
    />
  );
}
