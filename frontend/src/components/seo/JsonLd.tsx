type JsonLdData = Record<string, unknown> | Record<string, unknown>[];

type JsonLdProps = {
  data?: JsonLdData | null;
};

export function JsonLd({ data }: JsonLdProps) {
  if (!data) {
    return null;
  }

  const safeJson = JSON.stringify(data).replace(/</g, "\\u003c");

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJson }} />;
}
