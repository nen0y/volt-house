"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts, fetchCategories } from "@/lib/api";
import { FALLBACK_CATEGORIES } from "@/types";
import ProductCard from "./ProductCard";
import ConsultationModal from "./ConsultationModal";
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

  const rootCategories = categories.filter((c) => !c.parentKey);

  const categoryKeys = useCallback((key: string) => {
    const keys = [key];
    for (let i = 0; i < keys.length; i++) {
      categories.filter((c) => c.parentKey === keys[i]).forEach((c) => {
        if (!keys.includes(c.key)) keys.push(c.key);
      });
    }
    return keys;
  }, [categories]);

  const searchParams = useSearchParams();
  const asSort = (s: string | null): SortKey =>
    s === "price-asc" || s === "price-desc" ? s : "default";

  // Initial filter state comes from the URL, so a shared link opens pre-filtered.
  const [filter, setFilter] = useState<string>(
    () => searchParams.get("category") || initialCategory || "all"
  );
  const [brand, setBrand] = useState(() => searchParams.get("brand") || "all");
  const [query, setQuery] = useState(() => searchParams.get("q") || "");
  const [sort, setSort] = useState<SortKey>(() => asSort(searchParams.get("sort")));

  // Reflect the active filters back into the URL (no reload) so the current view
  // can be copied from the address bar and shared with someone else.
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter && filter !== "all") params.set("category", filter);
    if (brand !== "all") params.set("brand", brand);
    const q = query.trim();
    if (q) params.set("q", q);
    if (sort !== "default") params.set("sort", sort);
    const qs = params.toString();
    window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
  }, [filter, brand, query, sort]);

  const [consultOpen, setConsultOpen] = useState(false);

  // Products matching the active brand + search (but NOT the selected category),
  // so the per-category counts reflect those filters as you narrow down.
  const scoped = useMemo(() => {
    let list = all;
    if (brand !== "all") list = list.filter((p) => p.brandSlug === brand);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.features.some((f) => f.toLowerCase().includes(q))
      );
    }
    return list;
  }, [all, brand, query]);

  const count = (key: string) =>
    key === "all"
      ? scoped.length
      : scoped.filter((p) => (p.categoryKeys ?? [p.category]).some((productKey) => categoryKeys(key).includes(productKey))).length;

  const visible = useMemo(() => {
    let list = filter === "all" ? scoped : scoped.filter((p) => (p.categoryKeys ?? [p.category]).some((productKey) => categoryKeys(filter).includes(productKey)));
    if (sort === "price-asc") list = [...list].sort((a, b) => a.price <= 0 ? 1 : b.price <= 0 ? -1 : a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => a.price <= 0 ? 1 : b.price <= 0 ? -1 : b.price - a.price);
    return list;
  }, [scoped, categoryKeys, filter, sort]);

  const brands = useMemo(() => Array.from(new Map(all.filter((p) => p.brand).map((p) => [p.brand!.slug, p.brand!])).values()).sort((a, b) => a.name.localeCompare(b.name, "uk")), [all]);

  const activeCategory = categories.find((c) => c.key === filter);
  const activeRootKey = activeCategory?.parentKey || activeCategory?.key;
  const activeRoot = rootCategories.find((c) => c.key === activeRootKey);
  const subcategories = activeRootKey
    ? categories.filter((c) => c.parentKey === activeRootKey)
    : [];
  const activeLabel = filter === "all" ? "Всі товари" : activeCategory?.label ?? "Товари";

  return (
    <div className="max-w-[1280px] mx-auto px-[24px] py-[40px]">
      <ConsultationModal isOpen={consultOpen} onClose={() => setConsultOpen(false)} />
      {/* Heading */}
      <div className="mb-[24px]">
        <h1 className="text-[28px] font-bold text-gray-900 mb-[4px]">{activeLabel}</h1>
        <p className="text-[14px] text-gray-500">{visible.length} товарів у каталозі</p>
      </div>

      <div className="mb-[20px] rounded-[12px] border border-amber-200 bg-amber-50 px-[16px] py-[13px] text-[13px] leading-relaxed text-gray-700">
        <strong className="text-gray-900">Не знайшли потрібний товар?</strong>{" "}
        Ми постійно оновлюємо асортимент, тому товар може бути в наявності, навіть якщо його поки немає на сайті.{" "}
        <button
          type="button"
          onClick={() => setConsultOpen(true)}
          className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 cursor-pointer"
        >
          Уточніть у менеджера
        </button>
        .
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
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
          className="px-[14px] py-[10px] rounded-[8px] border border-gray-200 bg-white text-[14px] text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="all">Усі бренди</option>
          {brands.map((b) => <option key={b.slug} value={b.slug}>{b.name}</option>)}
        </select>
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

      {/* Main categories */}
      <div className="mb-[24px]">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500 mb-[8px]">Основні категорії</div>
        <div className="flex items-center gap-[8px] flex-wrap">
        {[{ key: "all", label: "Всі товари" }, ...rootCategories].map((f) => {
          const isActive = f.key === "all" ? filter === "all" : activeRootKey === f.key;
          return (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-[6px] px-[16px] py-[8px] rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
              isActive
                ? "bg-[#FFC107] text-gray-950"
                : "bg-white border border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            {f.label}
            <span
              className={`text-[11px] font-bold px-[6px] py-[1px] rounded-full ${
                isActive ? "bg-gray-950 text-[#FFC107]" : "bg-gray-100 text-gray-500"
              }`}
            >
              {count(f.key)}
            </span>
          </button>
          );
        })}
        </div>

        {activeRoot && subcategories.length > 0 && (
          <div className="mt-[14px] rounded-[14px] border border-amber-200/70 bg-gradient-to-r from-amber-50 via-white to-white p-[16px]">
            <div className="flex flex-col sm:flex-row sm:items-center gap-[14px]">
              <div className="flex items-center gap-[10px] sm:min-w-[210px]">
                <div className="w-[34px] h-[34px] shrink-0 rounded-[10px] bg-[#FFC107] text-gray-950 flex items-center justify-center text-[17px]">
                  {activeRoot.icon || "•"}
                </div>
                <div>
                  <div className="text-[14px] font-bold text-gray-950">{activeRoot.label}</div>
                  <div className="text-[11px] text-gray-500 mt-[1px]">Оберіть потрібний тип</div>
                </div>
              </div>
              <div className="flex items-center gap-[8px] flex-wrap sm:border-l sm:border-amber-200 sm:pl-[14px]">
                <button
                  onClick={() => setFilter(activeRoot.key)}
                  className={`px-[14px] py-[7px] rounded-full text-[13px] font-medium border cursor-pointer transition-colors ${filter === activeRoot.key ? "bg-[#FFC107] border-[#FFC107] text-gray-950 shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:border-amber-300"}`}
                >
                  Усі {activeRoot.label.toLocaleLowerCase("uk-UA")} <span className="ml-[4px] text-[11px] opacity-60">{count(activeRoot.key)}</span>
                </button>
                {subcategories.map((sub) => (
                  <button
                    key={sub.key}
                    onClick={() => setFilter(sub.key)}
                    className={`px-[14px] py-[7px] rounded-full text-[13px] font-medium border cursor-pointer transition-colors ${filter === sub.key ? "bg-[#FFC107] border-[#FFC107] text-gray-950 shadow-sm" : "bg-white border-gray-200 text-gray-700 hover:border-amber-300"}`}
                  >
                    {sub.label} <span className="ml-[4px] text-[11px] opacity-70">{count(sub.key)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid */}
      {visible.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-[12px]">
          {visible.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-[60px] text-gray-500 text-[14px]">
          <p>Нічого не знайдено. Спробуйте змінити фільтри.</p>
          <p className="mt-[8px]">
            Потрібний товар може бути в наявності —{" "}
            <button
              type="button"
              onClick={() => setConsultOpen(true)}
              className="font-semibold text-amber-700 underline underline-offset-2 hover:text-amber-800 cursor-pointer"
            >
              уточніть у менеджера
            </button>.
          </p>
        </div>
      )}
    </div>
  );
}
