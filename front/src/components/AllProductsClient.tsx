"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories } from "@/lib/api";
import { FALLBACK_CATEGORIES } from "@/types";
import ProductCard from "./ProductCard";
import type { Product } from "@/types";

type SortKey = "default" | "price-asc" | "price-desc";

export default function AllProductsClient({
  products,
  initialCategory = "all",
}: {
  products: Product[];
  initialCategory?: string;
}) {
  const { data: prodData } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    initialData: products,
  });
  const all = prodData ?? products;

  const { data: catData } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const categories = (catData ?? FALLBACK_CATEGORIES).filter((c) => c.enabled);

  const filters = [{ key: "all", label: "Всі товари" }, ...categories.map((c) => ({ key: c.key, label: c.label }))];

  const [filter, setFilter] = useState<string>(initialCategory || "all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("default");

  const count = (key: string) =>
    key === "all" ? all.length : all.filter((p) => p.category === key).length;

  const visible = useMemo(() => {
    let list = filter === "all" ? all : all.filter((p) => p.category === filter);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.features.some((f) => f.toLowerCase().includes(q))
      );
    }
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [all, filter, query, sort]);

  const activeLabel = filters.find((f) => f.key === filter)?.label ?? "Товари";

  return (
    <div className="max-w-[1280px] mx-auto px-[24px] py-[40px]">
      {/* Heading */}
      <div className="mb-[24px]">
        <h1 className="text-[28px] font-bold text-gray-900 mb-[4px]">{activeLabel}</h1>
        <p className="text-[14px] text-gray-500">{visible.length} товарів у наявності</p>
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-[12px] mb-[16px]">
        <div className="relative flex-1">
          <svg viewBox="0 0 24 24" fill="none" className="w-[16px] h-[16px] text-gray-400 absolute left-[12px] top-1/2 -translate-y-1/2">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук товарів…"
            className="w-full pl-[36px] pr-[14px] py-[10px] rounded-[8px] border border-gray-200 bg-white text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="px-[14px] py-[10px] rounded-[8px] border border-gray-200 bg-white text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="default">За замовчуванням</option>
          <option value="price-asc">Ціна: спочатку дешевші</option>
          <option value="price-desc">Ціна: спочатку дорожчі</option>
        </select>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-[8px] mb-[24px] flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-[6px] px-[16px] py-[8px] rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
              filter === f.key
                ? "bg-gray-950 text-white"
                : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {f.label}
            <span
              className={`text-[11px] font-bold px-[6px] py-[1px] rounded-full ${
                filter === f.key ? "bg-gray-950 text-[#FFC107]" : "bg-gray-100 text-gray-500"
              }`}
            >
              {count(f.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[12px]">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-[60px] text-gray-400 text-[14px]">
          Нічого не знайдено. Спробуйте змінити фільтри.
        </div>
      )}
    </div>
  );
}
