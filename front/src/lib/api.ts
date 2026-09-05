import axios from "axios";
import type { Product, Testimonial, ContentMap, CalculatorData, Category, HomeSection } from "@/types";
import { FALLBACK_CATEGORIES } from "@/types";
import { products as localProducts, testimonials as localTestimonials } from "./data";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
});

// Resolve a stored asset path ("/uploads/…") to an absolute URL on the API host.
export function assetUrl(path?: string): string {
  if (!path) return "";
  if (/^https?:\/\//.test(path) || path.startsWith("data:")) return path;
  return `${API_BASE}${path}`;
}

// ── Catalogue ────────────────────────────────────────────────────────────────
// Data is served by the backend API; local data.ts is kept only as a safe
// fallback so the storefront still renders if the API is unreachable.

export async function fetchProducts(category?: string): Promise<Product[]> {
  try {
    const { data } = await api.get<Product[]>("/api/products", {
      params: category && category !== "all" ? { category } : undefined,
    });
    if (Array.isArray(data)) return data;
  } catch {
    // fall through to local data
  }
  if (category && category !== "all") {
    return localProducts.filter((p) => p.category === category);
  }
  return localProducts;
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const { data } = await api.get<Testimonial[]>("/api/testimonials");
    if (Array.isArray(data) && data.length) return data;
  } catch {
    // fall through to local data
  }
  return localTestimonials;
}

// ── Leads (заявки) ───────────────────────────────────────────────────────────
// Orders, consultation requests and callbacks all post here; the backend stores
// them and emails the administrator.

export type LeadType = "order" | "consultation" | "callback";

export interface LeadItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface LeadPayload {
  type: LeadType;
  name: string;
  phone: string;
  email?: string;
  interest?: string;
  message?: string;
  items?: LeadItem[];
  total?: number;
}

export async function submitLead(
  payload: LeadPayload
): Promise<{ ok: boolean; id?: string; telegram?: boolean }> {
  const { data } = await api.post("/api/leads", payload);
  if (data?.ok !== true) {
    throw new Error("Lead was not accepted");
  }
  // Track only confirmed submissions from any of the site's lead forms.
  // Analytics must never turn a saved lead into a failed submission in the UI.
  try {
    if (typeof window !== "undefined") {
      const pixelWindow = window as Window & {
        fbq?: (command: "track", event: "Lead") => void;
      };
      pixelWindow.fbq?.("track", "Lead");
    }
  } catch {
    // The lead is already saved, even if tracking is unavailable.
  }
  return data;
}

// ── Editable content blocks ──────────────────────────────────────────────────

export async function fetchContent(): Promise<ContentMap> {
  try {
    const { data } = await api.get<ContentMap>("/api/content");
    if (data && typeof data === "object") return data;
  } catch {
    // fall through
  }
  return {};
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function fetchCategories(): Promise<Category[]> {
  try {
    const { data } = await api.get<Category[]>("/api/categories");
    if (Array.isArray(data) && data.length) return data;
  } catch {
    // fall through
  }
  return FALLBACK_CATEGORIES;
}

// ── Home sections (editable homepage builder) ────────────────────────────────

export async function fetchHomeSections(): Promise<HomeSection[]> {
  try {
    const { data } = await api.get<HomeSection[]>("/api/home-sections");
    if (Array.isArray(data)) return data;
  } catch {
    // fall through
  }
  return [];
}

// ── Power calculator config ──────────────────────────────────────────────────

export async function fetchCalculator(): Promise<CalculatorData | null> {
  try {
    const { data } = await api.get<CalculatorData>("/api/calculator");
    if (data && Array.isArray(data.appliances) && data.recommendation) return data;
  } catch {
    // fall through
  }
  return null;
}
