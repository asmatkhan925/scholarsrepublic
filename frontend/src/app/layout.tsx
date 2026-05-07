import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";

import "./globals.css";

export const metadata: Metadata = {
  title: "Scholars Republic",
  description: "Pakistan-first scholarship matching and study-abroad guidance platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
