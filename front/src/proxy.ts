import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

// Cache the setting briefly so we don't hit the backend on every request.
let cache: { indexable: boolean; expires: number } | null = null;

async function isIndexable(): Promise<boolean> {
  const now = Date.now();
  if (cache && cache.expires > now) return cache.indexable;
  let indexable = true; // open to indexing by default
  try {
    const res = await fetch(`${BACKEND_URL}/api/settings/seo`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.indexable === "boolean") indexable = data.indexable;
    }
  } catch {
    // backend unreachable — keep default (open)
  }
  cache = { indexable, expires: now + 30_000 };
  return indexable;
}

export async function proxy(_request: NextRequest) {
  const res = NextResponse.next();
  if (!(await isIndexable())) {
    // Authoritative "do not index" signal for every page (works for static pages too).
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  }
  return res;
}

export const config = {
  // Skip proxied/asset paths; run on real storefront pages.
  matcher: ["/((?!api|_next|uploads|admin|favicon.ico).*)"],
};
