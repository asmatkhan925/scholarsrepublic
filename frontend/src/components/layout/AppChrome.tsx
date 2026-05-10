"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";

const hiddenFooterPrefixes = ["/dashboard", "/admin"];
const hiddenFooterExactPaths = ["/login", "/register"];

export function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const hideFooter =
    hiddenFooterExactPaths.includes(pathname) ||
    hiddenFooterPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  return (
    <>
      {children}
      {hideFooter ? null : <SiteFooter />}
    </>
  );
}
