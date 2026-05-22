import { ImageResponse } from "next/og";

import { fetchScholarshipForSocialPreview } from "@/lib/seo/scholarshipMetadataFetch";
import {
  getProviderLabel,
  getScholarshipCardFacts,
  getScholarshipTitle,
  getStipendLabel,
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
        gap: 5,
        minWidth: 178,
        maxWidth: 258,
        border: "1px solid rgba(20, 83, 45, 0.18)",
        borderRadius: 16,
        background: "#ffffff",
        padding: "13px 15px",
      }}
    >
      <div
        style={{
          color: "#52625a",
          fontSize: 15,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 1.1,
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
        {value}
      </div>
    </div>
  );
}

function SecondaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        borderRadius: 14,
        background: "rgba(20, 83, 45, 0.08)",
        padding: "12px 15px",
      }}
    >
      <div style={{ color: "#14532d", fontSize: 18, fontWeight: 900 }}>{label}</div>
      <div style={{ color: "#17231b", fontSize: 20, fontWeight: 700 }}>
        {truncateText(value, 74)}
      </div>
    </div>
  );
}

function ScholarshipPreviewImage({ scholarship }: { scholarship?: OpportunityDetail | null }) {
  const title = truncateText(getScholarshipTitle(scholarship), 118);
  const facts = getScholarshipCardFacts(scholarship);
  const stipend = getStipendLabel(scholarship);
  const provider = getProviderLabel(scholarship);
  const statusLabel = scholarship?.verified_status
    ? "Verified Scholarship"
    : "Scholarship Opportunity";
  const isFallback = !scholarship;

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: "#fffdf7",
        color: "#17231b",
        fontFamily: "Arial, sans-serif",
        padding: 42,
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
          border: "1px solid rgba(20, 83, 45, 0.16)",
          borderRadius: 30,
          background: "rgba(248, 250, 247, 0.94)",
          padding: "28px 34px 30px",
          boxShadow: "0 20px 70px rgba(23, 35, 27, 0.10)",
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
                borderRadius: 14,
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
                Scholarship details and application preparation
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              borderRadius: 999,
              background: scholarship?.verified_status ? "#dff7ec" : "#f1d18b",
              color: "#17231b",
              padding: "10px 18px",
              fontSize: 18,
              fontWeight: 800,
            }}
          >
            {statusLabel}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
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
              fontSize: title.length > 92 ? 46 : title.length > 68 ? 53 : 66,
              fontWeight: 900,
              lineHeight: 1,
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

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {facts.length ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {facts.map((fact) => (
                <InfoBadge key={fact.label} label={fact.label} value={fact.value} />
              ))}
            </div>
          ) : null}

          {stipend || provider ? (
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {stipend ? <SecondaryFact label="Stipend" value={stipend} /> : null}
              {provider ? <SecondaryFact label="Provider" value={provider} /> : null}
            </div>
          ) : null}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: "1px solid rgba(20, 83, 45, 0.14)",
              paddingTop: 12,
            }}
          >
            <div style={{ color: "#14532d", fontSize: 19, fontWeight: 900 }}>
              View details on ScholarsRepublic.org
            </div>
            <div style={{ color: "#52625a", fontSize: 16, fontWeight: 600 }}>
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

  return new ImageResponse(<ScholarshipPreviewImage scholarship={scholarship} />, size);
}
