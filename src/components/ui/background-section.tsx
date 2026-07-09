import React from "react";

import { cn } from "@/lib/utils";

type BackgroundSectionProps = {
  children: React.ReactNode;
  variant?: "top" | "bottom";
  className?: string;
};

export const BackgroundSection = ({
  children,
  variant = "top",
  className,
}: BackgroundSectionProps) => {
  return (
    <div
      className={cn(
        "relative",
        variant === "top" &&
          "from-primary/5 via-background to-background rounded-t-3xl rounded-b-2xl bg-linear-to-b via-20%",
        variant === "bottom" &&
          "from-background via-background to-primary/5 rounded-t-2xl rounded-b-3xl bg-linear-to-b",
        className,
      )}
    >
      {children}
    </div>
  );
};
