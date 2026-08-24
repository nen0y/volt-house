// Renders a JSON-LD structured-data <script> for search engines.
export default function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is safe to inline; no user-controlled </script> here.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
