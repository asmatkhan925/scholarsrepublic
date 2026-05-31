"use client";

import { Layers } from "lucide-react";

import { SocialPlanReviewPage } from "@/app/dashboard/admin/social/_components/SocialPlanReviewPage";

export default function CollectionSocialPlansPage() {
  return (
    <SocialPlanReviewPage
      kind="collection"
      title="Collection Social Plans"
      description="Review collection social plans, captions, links, statuses, and scheduled posting times."
      icon={Layers}
    />
  );
}
