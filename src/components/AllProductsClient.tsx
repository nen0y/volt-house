"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import type { Product } from "@/types";

const FILTERS = [
  { key: "all",      label: "Всі товари" },
  { key: "inverter", label: "Інвертори" },
  { key: "battery",  label: "Акумулятори" },
  { key: "solar",    label: "Сонячні панелі" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

export default function AllProductsClient({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<FilterKey>("all");

  const filtered =
    filter === "all" ? products : products.filter((p) => p.category === filter);

  const count = (key: FilterKey) =>
    key === "all" ? products.length : products.filter((p) => p.category === key).length;

  return (
    <div className="max-w-[1280px] mx-auto px-[24px] py-[40px]">
      {/* Heading */}
      <div className="mb-[32px]">
        <h1 className="text-[28px] font-bold text-gray-900 mb-[4px]">Всі товари</h1>
        <p className="text-[14px] text-gray-500">{products.length} товарів у наявності</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-[8px] mb-[24px] flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-[6px] px-[16px] py-[8px] rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
              filter === f.key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {f.label}
            <span
              className={`text-[11px] font-bold px-[6px] py-[1px] rounded-full ${
                filter === f.key ? "bg-blue-500 text-blue-100" : "bg-gray-100 text-gray-500"
              }`}
            >
              {count(f.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[12px]">
        {filtered.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
