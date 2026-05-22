import { ImageResponse } from "next/og";

import { getPublicScholarshipInitial } from "@/lib/serverApi";
import {
  formatDeadline,
  formatFundingType,
  getCountryLabel,
  getDegreeLabel,
  getProviderLabel,
  getScholarshipTitle,
  truncateText,
} from "@/lib/seo/scholarshipSocial";
import type { OpportunityDetail } from "@/types/opportunity";

export const alt = "Scholars Republic scholarship preview";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type OpenGraphImageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function InfoBadge({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 190,
        maxWidth: 270,
        border: "1px solid rgba(20, 83, 45, 0.16)",
        borderRadius: 18,
        background: "rgba(255, 255, 255, 0.84)",
        padding: "16px 18px",
      }}
    >
      <div
        style={{
          color: "#6b7b70",
          fontSize: 18,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          color: "#17231b",
          fontSize: 27,
          fontWeight: 800,
          lineHeight: 1.18,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function ScholarshipPreviewImage({ scholarship }: { scholarship?: OpportunityDetail | null }) {
  const title = truncateText(getScholarshipTitle(scholarship), 112);
  const country = getCountryLabel(scholarship);
  const funding = formatFundingType(scholarship?.funding_type);
  const degree = getDegreeLabel(scholarship);
  const deadline = formatDeadline(scholarship?.deadline);
  const provider = getProviderLabel(scholarship);
  const statusLabel = scholarship?.verified_status
    ? "Verified Scholarship"
    : "Scholarship Opportunity";
  const badges = [
    country ? { label: "Country", value: country } : null,
    funding ? { label: "Funding", value: funding } : null,
    degree ? { label: "Degree", value: degree } : null,
    deadline ? { label: "Deadline", value: deadline } : null,
  ].filter((item): item is { label: string; value: string } => Boolean(item));

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#fffdf5",
        color: "#17231b",
        fontFamily: "Arial, sans-serif",
        padding: 54,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 92% 10%, rgba(201, 151, 43, 0.18), transparent 30%), linear-gradient(135deg, rgba(20, 83, 45, 0.08), transparent 42%)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          width: "100%",
          border: "1px solid rgba(20, 83, 45, 0.18)",
          borderRadius: 34,
          background: "rgba(248, 250, 247, 0.9)",
          padding: "38px 42px",
          boxShadow: "0 20px 70px rgba(23, 35, 27, 0.10)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 58,
                height: 58,
                borderRadius: 18,
                background: "#14532d",
                color: "#fffdf5",
                fontSize: 30,
                fontWeight: 900,
              }}
            >
              SR
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <div style={{ color: "#14532d", fontSize: 31, fontWeight: 900 }}>
                Scholars Republic
              </div>
              <div style={{ color: "#5f6f64", fontSize: 19, fontWeight: 600 }}>
                Scholarship discovery and preparation
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: "#f1d18b",
              color: "#17231b",
              padding: "13px 22px",
              fontSize: 20,
              fontWeight: 800,
            }}
          >
            {statusLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            style={{
              width: 90,
              height: 8,
              borderRadius: 999,
              background: "#c9972b",
            }}
          />
          <div
            style={{
              color: "#17231b",
              fontSize: title.length > 78 ? 54 : 62,
              fontWeight: 900,
              lineHeight: 1.05,
              maxWidth: 980,
            }}
          >
            {title}
          </div>
          {provider ? (
            <div style={{ color: "#5f6f64", fontSize: 25, fontWeight: 700 }}>
              Provider: {truncateText(provider, 72)}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {badges.length ? (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {badges.map((badge) => (
                <InfoBadge key={badge.label} label={badge.label} value={badge.value} />
              ))}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(20, 83, 45, 0.14)",
              paddingTop: 18,
            }}
          >
            <div style={{ color: "#14532d", fontSize: 23, fontWeight: 900 }}>
              View details on ScholarsRepublic.org
            </div>
            <div style={{ color: "#5f6f64", fontSize: 19, fontWeight: 600 }}>
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
  const scholarship = await getPublicScholarshipInitial(slug).catch(() => ({
    data: null,
    notFound: false,
  }));

  return new ImageResponse(<ScholarshipPreviewImage scholarship={scholarship.data} />, size);
}
