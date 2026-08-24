import type { Product } from "@/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const SITE_NAME = "VoltHouse";
export const SITE_TITLE = "VoltHouse — Системи резервного живлення";
export const SITE_DESCRIPTION =
  "Преміум інвертори, акумулятори LiFePO4, сонячні панелі та портативні зарядні станції для надійного резервного живлення вдома та для бізнесу. Безкоштовна консультація та підбір системи під ваш дім.";

export const SITE_KEYWORDS = [
  "інвертор",
  "гібридний інвертор",
  "акумулятор LiFePO4",
  "сонячні панелі",
  "зарядна станція",
  "портативна станція",
  "резервне живлення",
  "безперебійне живлення",
  "сонячна електростанція",
  "накопичувач енергії",
  "VoltHouse",
];

/** Absolute URL on the public site. */
export const abs = (path = "/") => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

const categoryLabel: Record<string, string> = {
  inverter: "Інвертор",
  battery: "Акумулятор",
  solar: "Сонячна панель",
  station: "Зарядна станція",
};

// ── JSON-LD builders ─────────────────────────────────────────────────────────

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs("/opengraph-image"),
    description: SITE_DESCRIPTION,
    areaServed: "UA",
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "uk-UA",
  };
}

export function productSchema(product: Product) {
  const images = (product.images && product.images.length ? product.images : []).map((p) =>
    p.startsWith("http") ? p : abs(p)
  );
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.features?.slice(0, 4).join(". ") || SITE_DESCRIPTION,
    image: images.length ? images : [abs("/opengraph-image")],
    sku: product.id,
    category: categoryLabel[product.category] || product.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: abs(`/products/${product.id}`),
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: SITE_NAME },
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: abs(it.path),
    })),
  };
}
