import { createArticleJsonLd, createBreadcrumbJsonLd } from "@/lib/seo/jsonLd";

import { JsonLd } from "./JsonLd";

type GuideArticleJsonLdProps = {
  title: string;
  description: string;
  path: string;
};

export function GuideArticleJsonLd({ title, description, path }: GuideArticleJsonLdProps) {
  return (
    <JsonLd
      data={[
        createArticleJsonLd({
          headline: title,
          description,
          path,
        }),
        createBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: title, path },
        ]),
      ]}
    />
  );
}
