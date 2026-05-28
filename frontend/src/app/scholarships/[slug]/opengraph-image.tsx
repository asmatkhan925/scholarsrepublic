import { ImageResponse } from "next/og";

import { fetchScholarshipForSocialPreview } from "@/lib/seo/scholarshipMetadataFetch";
import {
  getCountryLabel,
  getDeadlineUrgency,
  getDegreeLabel,
  getFundingLabel,
  getProviderLabel,
  getScholarshipTitle,
  getStipendLabel,
  truncateText,
} from "@/lib/seo/scholarshipSocial";
import type { OpportunityDetail } from "@/types/opportunity";

export const alt = "Scholars Republic scholarship preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type OpenGraphImageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function deadlineBadgeColors(tone: ReturnType<typeof getDeadlineUrgency>["tone"]) {
  if (tone === "urgent") {
    return {
      background: "#fee2e2",
      border: "#ef4444",
      label: "#991b1b",
      value: "#7f1d1d",
    };
  }

  if (tone === "soon") {
    return {
      background: "#fff3d1",
      border: "#c9972b",
      label: "#92400e",
      value: "#78350f",
    };
  }

  return {
    background: "#e9f7ef",
    border: "#14532d",
    label: "#14532d",
    value: "#17231b",
  };
}

function FactBlock({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        flex: "1 1 0",
        minWidth: 210,
        border: "1px solid rgba(20, 83, 45, 0.16)",
        borderRadius: 18,
        background: "#ffffff",
        padding: "17px 18px",
      }}
    >
      <div
        style={{
          color: "#5d6a61",
          fontSize: 15,
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#17231b",
          fontSize: 25,
          fontWeight: 800,
          lineHeight: 1.12,
        }}
      >
        {truncateText(value, 56)}
      </div>
    </div>
  );
}

function DeadlineBadge({ urgency }: { urgency: ReturnType<typeof getDeadlineUrgency> }) {
  const colors = deadlineBadgeColors(urgency.tone);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 8,
        minWidth: 318,
        borderRadius: 22,
        border: `2px solid ${colors.border}`,
        background: colors.background,
        padding: "18px 22px",
      }}
    >
      <div
        style={{
          color: colors.label,
          fontSize: 22,
          fontWeight: 900,
          textTransform: "uppercase",
        }}
      >
        {urgency.label}
      </div>
      <div
        style={{
          color: colors.value,
          fontSize: urgency.value.length > 18 ? 30 : 36,
          fontWeight: 900,
          lineHeight: 1.05,
        }}
      >
        {urgency.value}
      </div>
    </div>
  );
}

function ScholarshipPreviewImage({ scholarship }: { scholarship?: OpportunityDetail | null }) {
  const rawTitle = typeof scholarship?.title === "string" ? scholarship.title.trim() : "";
  const hasRealTitle = Boolean(rawTitle);
  const title = truncateText(rawTitle || getScholarshipTitle(null), 112);
  const country = getCountryLabel(scholarship);
  const degree = getDegreeLabel(scholarship);
  const funding = getFundingLabel(scholarship);
  const stipend = getStipendLabel(scholarship);
  const provider = getProviderLabel(scholarship);
  const urgency = getDeadlineUrgency(scholarship);
  const factBlocks = [
    { label: "Country", value: country },
    { label: "Provider", value: provider },
    { label: "Degree", value: degree },
    { label: "Funding", value: stipend || funding },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value));
  const isFallback = !scholarship || !hasRealTitle;

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#fffdf7",
        color: "#17231b",
        fontFamily: "Arial, sans-serif",
        padding: 34,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 92% 8%, rgba(201, 151, 43, 0.18), transparent 28%), linear-gradient(135deg, rgba(20, 83, 45, 0.10), transparent 46%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          width: "100%",
          border: "2px solid rgba(20, 83, 45, 0.18)",
          borderRadius: 28,
          background: "rgba(255, 253, 247, 0.97)",
          padding: "26px 32px 28px",
          boxShadow: "0 18px 60px rgba(23, 35, 27, 0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "#14532d",
                color: "#fffdf5",
                fontSize: 21,
                fontWeight: 900,
              }}
            >
              SR
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ color: "#14532d", fontSize: 24, fontWeight: 900 }}>
                Scholars Republic
              </div>
              <div style={{ color: "#52625a", fontSize: 16, fontWeight: 600 }}>
                Scholarship announcements and application guidance
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              borderRadius: 16,
              background: "#f1d18b",
              color: "#17231b",
              padding: "11px 18px",
              fontSize: 19,
              fontWeight: 800,
            }}
          >
            Scholarship Announcement
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 1100 }}>
          <div
            style={{
              width: 104,
              height: 7,
              borderRadius: 999,
              background: "#c9972b",
            }}
          />
          <div
            style={{
              color: "#17231b",
              fontSize: title.length > 92 ? 45 : title.length > 68 ? 52 : 64,
              fontWeight: 900,
              lineHeight: 1.02,
              maxWidth: 1060,
            }}
          >
            {title}
          </div>

          {isFallback ? (
            <div style={{ color: "#52625a", fontSize: 26, fontWeight: 700 }}>
              View scholarship details on ScholarsRepublic.org
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "stretch" }}>
            <DeadlineBadge urgency={urgency} />
            <div style={{ display: "flex", flex: 1, gap: 12, flexWrap: "wrap" }}>
              {factBlocks.slice(0, 4).map((fact) => (
                <FactBlock key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(20, 83, 45, 0.14)",
              paddingTop: 14,
            }}
          >
            <div style={{ color: "#14532d", fontSize: 22, fontWeight: 900 }}>
              Apply / Read details on ScholarsRepublic.org
            </div>
            <div style={{ color: "#52625a", fontSize: 17, fontWeight: 700 }}>
              Confirm final requirements from the official scholarship source.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function OpenGraphImage({ params }: OpenGraphImageProps) {
  const { slug } = await params;
  const scholarship = await fetchScholarshipForSocialPreview(slug);

  if (!scholarship || !scholarship.title?.trim()) {
    console.warn(`[scholarship-og-image] Missing scholarship data for slug: ${slug}`);
  }

  return new ImageResponse(<ScholarshipPreviewImage scholarship={scholarship} />, size);
}
