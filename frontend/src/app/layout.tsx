import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { AppChrome } from "@/components/layout/AppChrome";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Scholars Republic",
  description:
    "Scholarship search, student profiles, application tracking, and document preparation tools for students.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AppChrome>{children}</AppChrome>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
