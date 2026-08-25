"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchHomeSections, fetchProducts } from "@/lib/api";
import ProductCard from "./ProductCard";
import ConsultationModal from "./ConsultationModal";
import type { HomeSection, Product } from "@/types";

function ctaTarget(s: HomeSection): string {
  if (s.ctaHref) return s.ctaHref;
  if (s.category) return `/products?category=${s.category}`;
  return "/products";
}

function CatalogButton({ href, label }: { href: string; label: string }) {
  return (
    <div className="flex justify-center mt-[24px]">
      <Link
        href={href}
        className="inline-flex items-center gap-[8px] bg-[#FFC107] text-gray-950 text-[14px] font-semibold rounded-full px-[28px] py-[12px] hover:bg-amber-400 transition-colors"
      >
        {label}
        <svg viewBox="0 0 16 16" fill="none" className="w-[14px] h-[14px]">
          <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Link>
    </div>
  );
}

export default function HomeSections() {
  const { data: sections } = useQuery({ queryKey: ["home-sections"], queryFn: fetchHomeSections });
  const { data: products } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });
  const [callbackOpen, setCallbackOpen] = useState(false);

  const all = products ?? [];
  const list = (sections ?? []).filter((s) => s.enabled);

  const productsFor = (s: HomeSection): Product[] => {
    if (s.mode === "category") return all.filter((p) => p.category === s.category);
    return s.productIds
      .map((id) => all.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  };

  let productSectionIdx = 0;

  return (
    <>
      <ConsultationModal isOpen={callbackOpen} onClose={() => setCallbackOpen(false)} />

      {list.map((s) => {
        // ── CTA band ──
        if (s.mode === "cta") {
          return (
            <section key={s.id} className="bg-gray-950 py-[44px]">
              <div className="max-w-[1280px] mx-auto px-[24px] text-center">
                {s.title && <h2 className="text-[24px] font-bold text-white mb-[8px]">{s.title}</h2>}
                {s.subtitle && (
                  <p className="text-[14px] text-gray-300 mb-[24px] max-w-[600px] mx-auto leading-relaxed">
                    {s.subtitle}
                  </p>
                )}
                <div className="flex items-center justify-center gap-[12px] flex-wrap">
                  <button
                    onClick={() => setCallbackOpen(true)}
                    className="bg-[#FFC107] text-gray-950 text-[14px] font-semibold rounded-full px-[28px] py-[12px] hover:bg-amber-400 transition-colors cursor-pointer"
                  >
                    {s.ctaLabel || "Замовити дзвінок"}
                  </button>
                  <a
                    href="/#contact"
                    className="border border-white/70 text-white text-[14px] font-semibold rounded-full px-[28px] py-[12px] hover:bg-white/10 transition-colors"
                  >
                    Отримати консультацію
                  </a>
                </div>
              </div>
            </section>
          );
        }

        // ── Product grid ──
        const items = productsFor(s);
        if (items.length === 0) return null;
        const bg = productSectionIdx++ % 2 === 0 ? "bg-gray-100" : "bg-white";

        return (
          <section key={s.id} className={`${bg} py-[40px]`}>
            <div className="max-w-[1280px] mx-auto px-[24px]">
              <div className="mb-[16px]">
                <h2 className="text-[22px] font-bold text-gray-900">{s.title}</h2>
                {s.subtitle && <p className="text-[14px] text-gray-500 mt-[4px]">{s.subtitle}</p>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              {s.ctaLabel && <CatalogButton href={ctaTarget(s)} label={s.ctaLabel} />}
            </div>
          </section>
        );
      })}
    </>
  );
}
