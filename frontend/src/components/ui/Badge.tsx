import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

type BadgeTone = "pine" | "saffron" | "mint" | "sky" | "neutral" | "danger";

const toneClasses: Record<BadgeTone, string> = {
  pine: "bg-pine text-white",
  saffron: "bg-saffron text-ink",
  mint: "bg-mint text-pine",
  sky: "bg-skyglass text-ink",
  neutral: "bg-ink/5 text-ink",
  danger: "bg-red-50 text-red-700",
};

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: BadgeTone;
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
