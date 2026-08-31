import { createHash } from "crypto";
import type { Product } from "@/types";
import { SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

function xml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function absoluteUrl(value: string): string {
  return new URL(value, `${SITE_URL}/`).href;
}

function merchantId(productId: string): string {
  if (productId.length <= 50) return productId;
  return `ek-${createHash("sha1").update(productId).digest("hex")}`;
}

function productImages(product: Product): string[] {
  return Array.from(new Set([...(product.images ?? []), product.image].filter(Boolean)))
    .filter((image) => image !== "/placeholder.jpg" && (/^https?:\/\//i.test(image) || image.startsWith("/")))
    .map(absoluteUrl)
    .slice(0, 11);
}

function productDescription(product: Product): string {
  const description = product.features?.filter(Boolean).join(". ") || product.name;
  return description.slice(0, 5000);
}

function productItem(product: Product): string {
  const images = productImages(product);
  const mainImage = images[0];
  const additionalImages = images
    .slice(1)
    .map((image) => `      <g:additional_image_link>${xml(image)}</g:additional_image_link>`)
    .join("\n");

  return `    <item>
      <g:id>${xml(merchantId(product.id))}</g:id>
      <title>${xml(product.name.slice(0, 150))}</title>
      <description>${xml(productDescription(product))}</description>
      <link>${xml(`${SITE_URL}/products/${encodeURIComponent(product.id)}`)}</link>
      <g:image_link>${xml(mainImage)}</g:image_link>
${additionalImages ? `${additionalImages}\n` : ""}      <g:availability>in_stock</g:availability>
      <g:price>${product.price.toFixed(2)} USD</g:price>
      <g:condition>new</g:condition>
      ${product.brand?.name ? `<g:brand>${xml(product.brand.name)}</g:brand>\n      ` : ""}<g:identifier_exists>false</g:identifier_exists>
    </item>`;
}

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/products`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Backend returned ${response.status}`);

    const products = (await response.json()) as Product[];
    const eligible = products.filter((product) => product.enabled !== false && product.price > 0 && productImages(product).length > 0);
    const items = eligible.map(productItem).join("\n");
    const generatedAt = new Date().toUTCString();

    const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${xml(`${SITE_NAME} — каталог товарів`)}</title>
    <link>${xml(SITE_URL)}</link>
    <description>${xml(`Актуальний товарний фід ${SITE_NAME} для Google Merchant Center`)}</description>
    <lastBuildDate>${xml(generatedAt)}</lastBuildDate>
${items}
  </channel>
</rss>`;

    return new Response(feed, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Content-Disposition": 'inline; filename="merchant-feed.xml"',
        "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("[merchant-feed] Failed to build feed", error);
    return new Response("Merchant feed is temporarily unavailable", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
