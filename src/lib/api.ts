import axios from "axios";
import type { Product, Testimonial } from "@/types";
import { products as localProducts, testimonials as localTestimonials } from "./data";

// Simulated API delay for realistic loading states
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "",
  timeout: 8000,
});

export async function fetchProducts(category?: string): Promise<Product[]> {
  await delay(400);
  if (category && category !== "all") {
    return localProducts.filter((p) => p.category === category);
  }
  return localProducts;
}

export async function fetchTestimonials(): Promise<Testimonial[]> {
  await delay(300);
  return localTestimonials;
}
