import { buildJsonLd } from "@/lib/schema";
import type { SiteContent } from "@/content/types";

interface SchemaJsonLdProps {
  content: SiteContent;
}

export function SchemaJsonLd({ content }: SchemaJsonLdProps) {
  const schemas = buildJsonLd(content);

  return (
    <>
      {schemas.map((schema, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}
    </>
  );
}
