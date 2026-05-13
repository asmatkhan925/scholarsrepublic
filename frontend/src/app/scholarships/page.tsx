import type { Metadata } from "next";

import ScholarshipsPage from "@/features/scholarships/ScholarshipsPage";
import { getPublicScholarshipsInitial } from "@/lib/serverApi";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Scholarships for Pakistani Students - Scholars Republic",
  description:
    "Search verified scholarship opportunities by country, funding, deadline, IELTS requirements, and application fees on Scholars Republic.",
};

export default async function ScholarshipsRoutePage() {
  const initialScholarships = await getPublicScholarshipsInitial();

  return <ScholarshipsPage initialData={initialScholarships.data} />;
}
