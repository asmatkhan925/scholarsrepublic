"use client";

import { type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui";

export function ProfileSection({
  id,
  title,
  description,
  icon,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28">
      <Card className="dark:border-white/10 dark:bg-[#181b1d]">
        <CardContent className="p-3 md:p-4">
          <div className="mb-3 flex flex-col gap-2 border-b border-pine/10 pb-2 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint text-pine dark:bg-pine/20">
                {icon}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <h2 className="text-base font-bold text-ink dark:text-white md:text-lg">
                    {title}
                  </h2>
                </div>
                <p className="mt-0.5 text-sm leading-5 text-ink/60 dark:text-white/58">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div>{children}</div>
        </CardContent>
      </Card>
    </section>
  );
}
