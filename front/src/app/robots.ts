import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Always reflect the current admin toggle (no caching) so it flips instantly.
export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

async function isIndexable(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/settings/seo`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      return data?.indexable !== false;
    }
  } catch {
    // fall through
  }
  return true;
}

export default async function robots(): Promise<MetadataRoute.Robots> {
  // Site closed from indexing (e.g. dev server) — block everything.
  if (!(await isIndexable())) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/uploads"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
