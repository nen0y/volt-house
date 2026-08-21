"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import ProductCard from "./ProductCard";
import type { Product } from "@/types";

function SectionBanner({
  title,
  subtitle,
  price,
  gradient,
}: {
  title: string;
  subtitle: string;
  price: string;
  gradient: string;
}) {
  return (
    <div
      className={`relative rounded-[8px] overflow-hidden h-[380px] bg-gradient-to-br ${gradient} mb-[12px]`}
    >
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />
      <div className="absolute bottom-0 left-0 p-[36px]">
        <h3 className="text-white text-[28px] font-bold mb-[6px]">{title}</h3>
        <p className="text-gray-300 text-[14px] mb-[4px]">{subtitle}</p>
        <p className="text-gray-400 text-[12px] mb-[24px]">{price}</p>
        <a
          href="#contact"
          className="inline-block bg-white text-gray-900 text-[14px] font-medium rounded-full px-[28px] py-[10px] hover:bg-gray-100 transition-colors"
        >
          Buy Now
        </a>
      </div>
    </div>
  );
}

export default function Products({ initialData }: { initialData: Product[] }) {
  const { data: allProducts } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    initialData,
  });

  const homeProducts = allProducts?.filter(
    (p) => p.category === "inverter" || p.category === "battery"
  ) ?? [];

  const solarProducts = allProducts?.filter(
    (p) => p.category === "solar"
  ) ?? [];

  return (
    <div id="products" className="bg-gray-100 py-[32px]">
      <div className="max-w-[1280px] mx-auto px-[24px] space-y-[48px]">
        {/* Section 1: Home Backup Systems */}
        <section>
          <h2 className="text-[22px] font-bold text-gray-900 mb-[16px]">
            Home Backup Systems
          </h2>
          <SectionBanner
            title="VoltMax + PowerCell Bundle"
            subtitle="Complete home backup — inverter + LiFePO4 battery, pre-configured"
            price="From: $4,498 incl. VAT"
            gradient="from-slate-800 to-slate-600"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
            {homeProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Section 2: Solar Panels */}
        <section>
          <h2 className="text-[22px] font-bold text-gray-900 mb-[16px]">
            Solar Panels
          </h2>
          <SectionBanner
            title="SunPower Bifacial Series"
            subtitle="Premium monocrystalline panels — 25-year performance guarantee"
            price="From: $299 per panel"
            gradient="from-blue-900 to-slate-700"
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
            {solarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            {/* Buying guide card */}
            <div className="bg-white rounded-[6px] border border-gray-100 p-[20px] flex flex-col justify-between">
              <div>
                <p className="text-[11px] text-gray-500 font-medium mb-[8px] uppercase tracking-wider">
                  Buying Guide
                </p>
                <h4 className="text-[15px] font-semibold text-gray-900 mb-[4px]">
                  Which Solar Panel Should I Buy?
                </h4>
              </div>
              <a
                href="#contact"
                className="inline-flex items-center gap-[6px] text-[13px] font-medium text-blue-600 hover:text-blue-700 transition-colors mt-[16px]"
              >
                View All
                <svg viewBox="0 0 16 16" fill="none" className="w-[14px] h-[14px]">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
