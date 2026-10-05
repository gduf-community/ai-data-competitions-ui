import Link from "next/link";
import type { ReactNode } from "react";
import { CircleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AuthStatusPanelProps {
  code: string;
  title: string;
  description: string;
  details?: ReactNode;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function AuthStatusPanel({
  code,
  title,
  description,
  details,
  primaryHref = "/",
  primaryLabel = "返回首页",
  secondaryHref,
  secondaryLabel,
}: AuthStatusPanelProps) {
  return (
    <div className="bg-muted/30 flex min-h-dvh items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl border-border/70 shadow-sm">
        <CardContent className="space-y-8 p-8 text-center sm:p-10">
          <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CircleAlert className="size-8" />
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold tracking-[0.24em] text-muted-foreground uppercase">
              {code}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              {description}
            </p>
            {details ? <div className="mx-auto max-w-xl text-left">{details}</div> : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild>
              <Link href={primaryHref}>{primaryLabel}</Link>
            </Button>
            {secondaryHref && secondaryLabel ? (
              <Button variant="outline" asChild>
                <Link href={secondaryHref}>{secondaryLabel}</Link>
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
