"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import { products as allProductsData } from "@/lib/data";
import ProductCard from "./ProductCard";
import type { Product } from "@/types";

function SectionBanner({
  title,
  subtitle,
  price,
  gradient,
  href,
  onBuy,
}: {
  title: string;
  subtitle: string;
  price: string;
  gradient: string;
  href: string;
  onBuy: () => void;
}) {
  return (
    <Link
      href={href}
      className={`relative rounded-[8px] overflow-hidden h-[380px] bg-gradient-to-br ${gradient} mb-[12px] block`}
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
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onBuy(); }}
          className="inline-block bg-white text-gray-900 text-[14px] font-medium rounded-full px-[28px] py-[10px] hover:bg-gray-100 transition-colors cursor-pointer"
        >
          Купити
        </button>
      </div>
    </Link>
  );
}

export default function Products({ initialData }: { initialData: Product[] }) {
  const { add } = useCart();
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
            Домашні системи резервного живлення
          </h2>
          <SectionBanner
            title="VoltMax + PowerCell Bundle"
            subtitle="Повна домашня система — інвертор + акумулятор LiFePO4, готова до встановлення"
            price="Від: $4,498 з ПДВ"
            gradient="from-slate-800 to-slate-600"
            href="/products/inv-5kw"
            onBuy={() => {
              ["inv-5kw", "bat-10kwh"].forEach((id) => {
                const p = allProductsData.find((p) => p.id === id);
                if (p) add(p);
              });
            }}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
            {homeProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        {/* Section 2: Solar Panels */}
        <section>
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="text-[22px] font-bold text-gray-900">Сонячні панелі</h2>
          </div>
          <SectionBanner
            title="SunPower Bifacial Series"
            subtitle="Преміум монокристалічні панелі — гарантія продуктивності 25 років"
            price="Від: $299 за панель"
            gradient="from-blue-900 to-slate-700"
            href="/products/sol-550w"
            onBuy={() => {
              const p = allProductsData.find((p) => p.id === "sol-550w");
              if (p) add(p);
            }}
          />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
            {solarProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            {/* View all card */}
            <div className="bg-white rounded-[6px] border border-gray-100 p-[20px] flex flex-col justify-between">
              <div>
                <p className="text-[11px] text-gray-500 font-medium mb-[8px] uppercase tracking-wider">
                  Каталог
                </p>
                <h4 className="text-[15px] font-semibold text-gray-900 mb-[4px]">
                  Переглянути всі товари
                </h4>
              </div>
              <Link
                href="/products"
                className="inline-flex items-center gap-[6px] text-[13px] font-medium text-blue-600 hover:text-blue-700 transition-colors mt-[16px]"
              >
                Переглянути всі
                <svg viewBox="0 0 16 16" fill="none" className="w-[14px] h-[14px]">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
