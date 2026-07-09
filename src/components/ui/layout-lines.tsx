import * as React from "react";

import { cn } from "@/lib/utils";

function LayoutLines({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("pointer-events-none fixed inset-0 top-0 z-0", className)}
      {...props}
    >
      <div className="line-y line-dashed mx-auto flex h-full max-w-6xl flex-col"></div>
    </section>
  );
}

export { LayoutLines };
