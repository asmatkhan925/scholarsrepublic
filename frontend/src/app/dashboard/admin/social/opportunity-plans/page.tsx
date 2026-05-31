"use client";

import { ClipboardList } from "lucide-react";

import { SocialPlanReviewPage } from "@/app/dashboard/admin/social/_components/SocialPlanReviewPage";

export default function OpportunitySocialPlansPage() {
  return (
    <SocialPlanReviewPage
      kind="opportunity"
      title="Opportunity Social Plans"
      description="Review individual scholarship social plans, captions, links, statuses, and schedule times."
      icon={ClipboardList}
    />
  );
}
