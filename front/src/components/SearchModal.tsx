"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchProducts } from "@/lib/api";
import ProductCard from "./ProductCard";
import type { Product } from "@/types";

function searchProducts(products: Product[], query: string): Product[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.features.some((f) => f.toLowerCase().includes(q)) ||
      (p.badge && p.badge.toLowerCase().includes(q))
  );
}

export default function SearchModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { data: products = [] } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });
  const results = searchProducts(products, query);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Пошук"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative z-10 bg-white w-full shadow-xl">
        {/* Search input row */}
        <div className="max-w-[1280px] mx-auto px-[24px] h-[64px] flex items-center gap-[16px]">
          <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px] text-gray-400 shrink-0">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук товарів..."
            className="flex-1 text-[16px] text-gray-900 placeholder:text-gray-400 outline-none bg-transparent"
          />
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-900 transition-colors shrink-0"
            aria-label="Закрити пошук"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Results area */}
        {query.trim() && (
          <div className="border-t border-gray-100 max-h-[70vh] overflow-y-auto">
            <div className="max-w-[1280px] mx-auto px-[24px] py-[24px]">
              {results.length === 0 ? (
                <p className="text-[14px] text-gray-500 py-[16px] text-center">
                  Нічого не знайдено за запитом &ldquo;{query}&rdquo;
                </p>
              ) : (
                <>
                  <p className="text-[12px] text-gray-400 mb-[16px]">
                    Знайдено {results.length} {results.length === 1 ? "товар" : results.length < 5 ? "товари" : "товарів"}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-[12px]">
                    {results.map((p) => (
                      <div key={p.id} onClick={onClose}>
                        <ProductCard product={p} />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
