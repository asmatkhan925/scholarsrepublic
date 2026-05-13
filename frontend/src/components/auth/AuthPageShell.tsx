import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn } from "@/lib/cn";

type AuthPageShellProps = {
  children: ReactNode;
  mainClassName?: string;
};

export function AuthPageShell({ children, mainClassName }: AuthPageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-slate-50">
      <SiteHeader variant="auth" />
      <main
        className={cn(
          "flex flex-1 items-center px-4 py-10 sm:px-5 md:px-8 md:py-12",
          mainClassName,
        )}
      >
        {children}
      </main>
      <SiteFooter variant="auth" />
    </div>
  );
}
