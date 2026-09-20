import type { Metadata } from "next";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ConsentScripts } from "@/components/ConsentScripts";
import { AppChrome } from "@/components/layout/AppChrome";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://scholarsrepublic.org";
const adsenseClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.trim();
const gaMeasurementId = process.env.NEXT_PUBLIC_GA_ID?.trim();
const siteDescription =
  "Find verified scholarships, save opportunities, track applications, and prepare stronger scholarship documents.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Scholars Republic",
  description: siteDescription,
  openGraph: {
    siteName: "Scholars Republic",
    type: "website",
    url: siteUrl,
    title: "Scholars Republic",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "Scholars Republic",
    description: siteDescription,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ConsentScripts adsenseClient={adsenseClient} gaMeasurementId={gaMeasurementId} />
        <ThemeProvider>
          <AuthProvider>
            <AppChrome>{children}</AppChrome>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
