import type { Metadata } from "next";

import { SiteHeader } from "@/components/site-header";
import { HomePage } from "@/features/home/HomePage";

export const metadata: Metadata = {
  title: "Scholars Republic | Find Scholarships and Track Applications",
  description:
    "Discover scholarships, build your student profile, save opportunities, track applications, and prepare stronger scholarship documents with Scholars Republic.",
};

export default function Home() {
  return (
    <>
      <SiteHeader />
      <HomePage />
    </>
  );
}
