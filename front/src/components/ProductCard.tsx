"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { assetUrl } from "@/lib/api";
import type { Product } from "@/types";

const fallbackIcon = (
  <svg viewBox="0 0 80 80" fill="none" className="w-[80px] h-[80px]">
    <rect x="14" y="20" width="52" height="44" rx="6" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="1.5" />
    <path d="M14 33h52" stroke="#b0b8c4" strokeWidth="1.5" />
    <rect x="33" y="12" width="14" height="10" rx="2" fill="#b0b8c4" />
    <circle cx="40" cy="48" r="8" stroke="#b0b8c4" strokeWidth="1.5" />
  </svg>
);

const categoryIcon: Record<string, ReactNode> = {
  inverter: (
    <svg viewBox="0 0 80 80" fill="none" className="w-[80px] h-[80px]">
      <rect x="8" y="20" width="64" height="44" rx="6" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="1.5" />
      <path d="M24 48l10-14 8 10 8-8" stroke="#FFC107" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="20" y="12" width="40" height="8" rx="4" fill="#b0b8c4" />
      <circle cx="56" cy="28" r="5" fill="#22c55e" />
    </svg>
  ),
  battery: (
    <svg viewBox="0 0 80 80" fill="none" className="w-[80px] h-[80px]">
      <rect x="6" y="18" width="58" height="44" rx="6" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="1.5" />
      <rect x="64" y="30" width="8" height="20" rx="4" fill="#b0b8c4" />
      <rect x="12" y="26" width="38" height="28" rx="5" fill="#22c55e" opacity="0.65" />
      <path d="M34 36v8M30 40h8" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
  solar: (
    <svg viewBox="0 0 80 80" fill="none" className="w-[80px] h-[80px]">
      <rect x="6" y="16" width="68" height="48" rx="4" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="1.5" />
      <line x1="40" y1="16" x2="40" y2="64" stroke="#b0b8c4" strokeWidth="1" />
      <line x1="6" y1="40" x2="74" y2="40" stroke="#b0b8c4" strokeWidth="1" />
      <line x1="23" y1="16" x2="23" y2="64" stroke="#c8d0db" strokeWidth="1" />
      <line x1="57" y1="16" x2="57" y2="64" stroke="#c8d0db" strokeWidth="1" />
      <rect x="8" y="18" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
      <rect x="25" y="18" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
      <rect x="42" y="18" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
      <rect x="59" y="18" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
      <rect x="8" y="42" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
      <rect x="25" y="42" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
      <rect x="42" y="42" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
      <rect x="59" y="42" width="13" height="20" rx="2" fill="#fbbf24" opacity="0.75" />
    </svg>
  ),
  station: (
    <svg viewBox="0 0 80 80" fill="none" className="w-[80px] h-[80px]">
      <rect x="14" y="16" width="52" height="48" rx="6" fill="#dde1e7" stroke="#b0b8c4" strokeWidth="1.5" />
      <rect x="30" y="10" width="20" height="7" rx="3" fill="#b0b8c4" />
      <rect x="22" y="24" width="36" height="15" rx="3" fill="#22c55e" opacity="0.6" />
      <path d="M38 27l-4 6h5l-4 6" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="28" cy="52" r="3.5" fill="#b0b8c4" />
      <circle cx="40" cy="52" r="3.5" fill="#b0b8c4" />
      <circle cx="52" cy="52" r="3.5" fill="#b0b8c4" />
    </svg>
  ),
};

export default function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const { add } = useCart();
  const savings = product.originalPrice
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : null;

  return (
    <div
      onClick={() => router.push(`/products/${product.id}`)}
      className="group relative bg-white rounded-[6px] border border-gray-100 overflow-hidden hover:border-gray-200 hover:shadow-md transition-[border-color,box-shadow] duration-200 cursor-pointer"
    >
      {savings && (
        <div className="absolute top-[10px] right-[10px] z-10 bg-[#FFC107] text-gray-950 text-[10px] font-bold px-[8px] py-[3px] rounded-full">
          -{savings}%
        </div>
      )}

      <div className="bg-gray-50 h-[200px] flex items-center justify-center overflow-hidden">
        {product.images && product.images.length > 0 ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={assetUrl(product.images[0])} alt={product.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          categoryIcon[product.category] ?? fallbackIcon
        )}
      </div>

      <div className="p-[14px]">
        <h3 className="text-[14px] font-medium text-gray-900 mb-[8px] leading-snug line-clamp-2 group-hover:text-amber-700 transition-colors">
          {product.name}
        </h3>
        <div>
          {product.originalPrice && (
            <span className="text-[11px] text-gray-400 line-through mr-[6px]">
              ${product.originalPrice.toLocaleString("en-US")}
            </span>
          )}
          <span className="text-[11px] text-gray-500">Від: </span>
          <span className="text-[16px] font-bold text-gray-900">
            ${product.price.toLocaleString("en-US")}
          </span>
          <span className="text-[10px] text-gray-400 ml-[4px]">з ПДВ</span>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); add(product); }}
        className="absolute bottom-[14px] right-[14px] w-[32px] h-[32px] rounded-full bg-[#FFC107] text-gray-950 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm cursor-pointer"
        aria-label="Додати в кошик"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-[14px] h-[14px]">
          <path d="M1 1h2l2 8h8l1.5-5H5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="7" cy="13" r="1" fill="white" />
          <circle cx="12" cy="13" r="1" fill="white" />
        </svg>
      </button>
    </div>
  );
}
