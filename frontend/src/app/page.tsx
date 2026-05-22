import type { Metadata } from "next";

import { JsonLd } from "@/components/seo/JsonLd";
import { SiteHeader } from "@/components/site-header";
import { HomePage } from "@/features/home/HomePage";
import {
  createBreadcrumbJsonLd,
  createOrganizationJsonLd,
  createWebPageJsonLd,
  createWebSiteJsonLd,
} from "@/lib/seo/jsonLd";

export const metadata: Metadata = {
  title: "Scholars Republic | Find Scholarships and Track Applications",
  description:
    "Discover scholarships, build your student profile, save opportunities, track applications, and prepare stronger scholarship documents with Scholars Republic.",
};

export default function Home() {
  return (
    <>
      <JsonLd
        data={[
          createOrganizationJsonLd(),
          createWebSiteJsonLd(),
          createWebPageJsonLd({
            name: "Scholars Republic",
            description:
              "Discover scholarships, build your student profile, save opportunities, track applications, and prepare stronger scholarship documents with Scholars Republic.",
            path: "/",
          }),
          createBreadcrumbJsonLd([{ name: "Home", path: "/" }]),
        ]}
      />
      <SiteHeader />
      <HomePage />
    </>
  );
}
