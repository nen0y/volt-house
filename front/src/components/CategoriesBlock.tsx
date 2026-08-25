"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchCategories } from "@/lib/api";
import { FALLBACK_CATEGORIES } from "@/types";

export default function CategoriesBlock() {
  const { data } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const categories = (data ?? FALLBACK_CATEGORIES).filter((c) => c.enabled);
  const roots = categories.filter((c) => !c.parentKey);
  if (categories.length === 0) return null;

  return (
    <section className="bg-gray-100 py-[32px]">
      <div className="max-w-[1280px] mx-auto px-[24px]">
        <div className="flex items-center justify-between mb-[16px]">
          <h2 className="text-[22px] font-bold text-gray-900">Категорії</h2>
          <Link href="/products" className="text-[13px] font-medium text-amber-700 hover:text-amber-800 transition-colors">
            Усі товари →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-[12px]">
          {roots.map((c) => (
            <Link
              key={c.key}
              href={`/products?category=${c.key}`}
              className="group bg-white rounded-[10px] border border-gray-100 p-[24px] hover:border-amber-300 hover:shadow-md transition-all flex flex-col"
            >
              <span className="text-[32px] mb-[12px] leading-none">{c.icon}</span>
              <h3 className="text-[15px] font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">
                {c.label}
              </h3>
              {c.description && (
                <p className="text-[12px] text-gray-400 mt-[4px] leading-relaxed">{c.description}</p>
              )}
              {categories.some((child) => child.parentKey === c.key) && (
                <div className="mt-[12px] flex flex-wrap gap-[5px]">
                  {categories.filter((child) => child.parentKey === c.key).map((child) => (
                    <span key={child.key} className="text-[10px] text-gray-600 bg-gray-100 rounded-full px-[7px] py-[3px]">
                      {child.label}
                    </span>
                  ))}
                </div>
              )}
              <span className="mt-[16px] text-[13px] font-medium text-amber-700 inline-flex items-center gap-[4px]">
                Переглянути
                <svg viewBox="0 0 16 16" fill="none" className="w-[12px] h-[12px]">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
