import type { Product } from "@/types";
import { products as localProducts } from "./data";

// Server-side fetches use the internal backend URL (Docker: http://back:4000).
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:4000";

export async function getProductsServer(): Promise<Product[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products`, { next: { revalidate: 60 } });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) return data as Product[];
    }
  } catch {
    // backend unreachable (e.g. during a build before it is up) — use local data
  }
  return localProducts;
}

export async function getSeoServer(): Promise<{ indexable: boolean }> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/settings/seo`, { next: { revalidate: 30 } });
    if (res.ok) {
      const data = await res.json();
      if (typeof data?.indexable === "boolean") return { indexable: data.indexable };
    }
  } catch {
    // fall through
  }
  return { indexable: true };
}

export async function getProductServer(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/products/${encodeURIComponent(id)}`, {
      next: { revalidate: 60 },
    });
    if (res.ok) return (await res.json()) as Product;
    if (res.status === 404) return null;
  } catch {
    // fall through to local
  }
  return localProducts.find((p) => p.id === id) ?? null;
}
