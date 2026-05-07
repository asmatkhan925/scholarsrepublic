import type { Metadata } from "next";

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
      <body>{children}</body>
    </html>
  );
}
