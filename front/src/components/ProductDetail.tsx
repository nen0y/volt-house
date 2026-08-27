"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { fetchCategories, assetUrl } from "@/lib/api";
import ConsultationModal from "./ConsultationModal";
import ProductCard from "./ProductCard";
import type { Product } from "@/types";

const fallbackIllustration = (
  <svg viewBox="0 0 160 160" fill="none" className="w-[140px] h-[140px]">
    <rect x="24" y="36" width="112" height="88" rx="10" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="2" />
    <path d="M24 60h112" stroke="#b0b8c4" strokeWidth="2" />
    <rect x="66" y="22" width="28" height="14" rx="6" fill="#b0b8c4" />
    <circle cx="80" cy="92" r="18" stroke="#b0b8c4" strokeWidth="2" />
  </svg>
);

const categoryLabel: Record<string, string> = {
  inverter: "Інвертор",
  battery: "Акумулятор",
  solar: "Сонячна панель",
  station: "Зарядна станція",
  kits: "Комплект",
  "inverter-hybrid": "Гібридний інвертор",
  "inverter-grid": "Мережевий інвертор",
  "battery-lifepo4": "LiFePO4 акумулятор",
  "solar-mono": "Монокристалічна панель",
  "station-portable": "Портативна станція",
};

const categoryIllustration: Record<string, React.ReactNode> = {
  inverter: (
    <svg viewBox="0 0 160 160" fill="none" className="w-[140px] h-[140px]">
      <rect x="16" y="40" width="128" height="88" rx="10" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="2" />
      <path d="M48 96l20-28 16 20 16-16" stroke="#FFC107" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="40" y="24" width="80" height="16" rx="6" fill="#b0b8c4" />
      <circle cx="112" cy="56" r="10" fill="#22c55e" />
    </svg>
  ),
  battery: (
    <svg viewBox="0 0 160 160" fill="none" className="w-[140px] h-[140px]">
      <rect x="12" y="36" width="116" height="88" rx="10" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="2" />
      <rect x="128" y="60" width="16" height="40" rx="6" fill="#b0b8c4" />
      <rect x="24" y="52" width="76" height="56" rx="8" fill="#22c55e" opacity="0.65" />
      <path d="M68 72v16M60 80h16" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  solar: (
    <svg viewBox="0 0 160 160" fill="none" className="w-[140px] h-[140px]">
      <rect x="8" y="32" width="144" height="96" rx="6" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="2" />
      <line x1="80" y1="32" x2="80" y2="128" stroke="#b0b8c4" strokeWidth="1.5" />
      <line x1="8" y1="80" x2="152" y2="80" stroke="#b0b8c4" strokeWidth="1.5" />
      <line x1="44" y1="32" x2="44" y2="128" stroke="#c8d0db" strokeWidth="1" />
      <line x1="116" y1="32" x2="116" y2="128" stroke="#c8d0db" strokeWidth="1" />
      <rect x="12" y="36" width="30" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
      <rect x="48" y="36" width="30" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
      <rect x="84" y="36" width="30" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
      <rect x="118" y="36" width="28" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
      <rect x="12" y="84" width="30" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
      <rect x="48" y="84" width="30" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
      <rect x="84" y="84" width="30" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
      <rect x="118" y="84" width="28" height="40" rx="3" fill="#fbbf24" opacity="0.8" />
    </svg>
  ),
  station: (
    <svg viewBox="0 0 160 160" fill="none" className="w-[140px] h-[140px]">
      <rect x="28" y="36" width="104" height="96" rx="10" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="2" />
      <rect x="62" y="24" width="36" height="12" rx="6" fill="#b0b8c4" />
      <rect x="44" y="52" width="72" height="30" rx="6" fill="#22c55e" opacity="0.6" />
      <path d="M84 58l-8 12h10l-8 12" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="56" cy="104" r="7" fill="#b0b8c4" />
      <circle cx="80" cy="104" r="7" fill="#b0b8c4" />
      <circle cx="104" cy="104" r="7" fill="#b0b8c4" />
    </svg>
  ),
};

export default function ProductDetail({
  product,
  related,
}: {
  product: Product;
  related: Product[];
}) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const [imgIdx, setImgIdx] = useState(0);
  const images = product.images ?? [];

  const { data: cats } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const catLabel =
    cats?.find((c) => c.key === product.category)?.labelSingular ||
    categoryLabel[product.category] ||
    product.category;

  const handleAdd = () => {
    if (product.price <= 0) return;
    add(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const hasPrice = product.price > 0;
  const savings = hasPrice && product.originalPrice
    ? Math.round(
        ((product.originalPrice - product.price) / product.originalPrice) * 100
      )
    : null;

  return (
    <div className="max-w-[1280px] mx-auto px-[24px] py-[40px]">
      <ConsultationModal isOpen={consultOpen} onClose={() => setConsultOpen(false)} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-[8px] text-[13px] text-gray-400 mb-[32px]">
        <Link href="/" className="hover:text-gray-600 transition-colors">
          Головна
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:text-gray-600 transition-colors">
          Товари
        </Link>
        <span>/</span>
        <span className="text-gray-700">{product.name}</span>
      </nav>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-[48px] mb-[64px]">
        {/* Left — images or illustration */}
        <div className="bg-white rounded-[12px] border border-gray-100 flex flex-col items-center justify-center min-h-[360px] overflow-hidden">
          {images.length > 0 ? (
            <div className="w-full">
              <div className="h-[360px] w-full flex items-center justify-center overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={assetUrl(images[Math.min(imgIdx, images.length - 1)])}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>
              {images.length > 1 && (
                <div className="flex gap-[8px] p-[12px] flex-wrap">
                  {images.map((img, i) => (
                    <button
                      key={img}
                      onClick={() => setImgIdx(i)}
                      className={`w-[56px] h-[56px] rounded-[6px] overflow-hidden border transition-colors ${
                        i === imgIdx ? "border-amber-400" : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={assetUrl(img)} alt="" className="w-full h-full object-contain bg-white p-[3px]" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="opacity-80">
              {categoryIllustration[product.category] ?? fallbackIllustration}
            </div>
          )}
        </div>

        {/* Right — details */}
        <div className="flex flex-col">
          {/* Category + badge */}
          <div className="flex items-center gap-[10px] mb-[12px]">
            {product.brand && <span className="text-[12px] font-semibold text-gray-700 bg-gray-100 px-[10px] py-[3px] rounded-full">{product.brand.name}</span>}
            <span className="text-[12px] font-medium text-amber-800 bg-amber-50 px-[10px] py-[3px] rounded-full">
              {catLabel}
            </span>
            {product.badge && (
              <span className="text-[12px] font-bold text-amber-900 bg-amber-100 px-[10px] py-[3px] rounded-full">
                {product.badge}
              </span>
            )}
          </div>

          <h1 className="text-[28px] font-bold text-gray-900 leading-tight mb-[20px]">
            {product.name}
          </h1>

          {/* Price */}
          <div className="flex items-baseline gap-[10px] mb-[24px]">
            {hasPrice && product.originalPrice ? (
              <span className="text-[16px] text-gray-400 line-through">
                ${product.originalPrice.toLocaleString("en-US")}
              </span>
            ) : null}
            {hasPrice ? <>
              <span className="text-[32px] font-bold text-gray-900">${product.price.toLocaleString("en-US")}</span>
              <span className="text-[13px] text-gray-400">з ПДВ</span>
            </> : <span className="text-[24px] font-bold text-amber-700">Ціну уточнюйте</span>}
            {savings && (
              <span className="text-[13px] font-bold text-green-600 bg-green-50 px-[8px] py-[2px] rounded-full">
                -{savings}%
              </span>
            )}
          </div>

          {/* Specs */}
          {(product.efficiency || product.power || product.capacity) && (
          <div className="grid grid-cols-2 gap-[12px] mb-[28px]">
            {product.efficiency && (
              <div className="bg-gray-50 rounded-[8px] p-[14px] text-center">
                <p className="text-[11px] text-gray-400 mb-[4px] uppercase tracking-wider">ККД</p>
                <p className="text-[16px] font-bold text-gray-900">{product.efficiency}</p>
              </div>
            )}
            {(product.power || product.capacity) && (
              <div className="bg-gray-50 rounded-[8px] p-[14px] text-center">
                <p className="text-[11px] text-gray-400 mb-[4px] uppercase tracking-wider">
                  {product.power ? "Потужність" : "Ємність"}
                </p>
                <p className="text-[16px] font-bold text-gray-900">
                  {product.power ?? product.capacity}
                </p>
              </div>
            )}
          </div>
          )}

          {/* Warranty */}
          {product.warranty && (
            <div className="flex items-center gap-[8px] mb-[20px]">
              <svg viewBox="0 0 16 16" fill="none" className="w-[16px] h-[16px] text-green-600 shrink-0">
                <path d="M8 1L2 3.5v4.5c0 3.5 2.5 5.5 6 7 3.5-1.5 6-3.5 6-7V3.5L8 1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M5.5 8l1.5 1.5L10.5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="text-[13px] text-gray-500">Гарантія:</span>
              <span className="text-[13px] font-semibold text-gray-800">{product.warranty}</span>
            </div>
          )}

          {/* Features */}
          <div className="mb-[32px]">
            <p className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider mb-[12px]">
              Характеристики
            </p>
            <ul className="space-y-[8px]">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-[10px]">
                  <svg
                    viewBox="0 0 16 16"
                    fill="none"
                    className="w-[16px] h-[16px] text-amber-500 mt-[2px] shrink-0"
                  >
                    <path
                      d="M3 8l3.5 3.5L13 4.5"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[14px] text-gray-700">{f}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <div className="flex gap-[12px] mt-auto">
            {hasPrice ? <button
              onClick={handleAdd}
              className={`flex-1 py-[14px] rounded-[8px] text-[15px] font-semibold transition-colors cursor-pointer ${
                added
                  ? "bg-gray-800 text-white ring-2 ring-amber-300"
                  : "bg-[#FFC107] text-gray-950 hover:bg-amber-400 shadow-sm"
              }`}
            >
              {added ? "✓ Додано до кошика" : "Додати в кошик"}
            </button> : null}
            <button
              onClick={() => setConsultOpen(true)}
              className="px-[20px] py-[14px] rounded-[8px] border border-gray-200 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              Консультація
            </button>
          </div>
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <section>
          <h2 className="text-[20px] font-bold text-gray-900 mb-[16px]">
            Схожі товари
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-[12px]">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
