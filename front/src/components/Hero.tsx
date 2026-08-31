"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { fetchContent, fetchProducts, assetUrl } from "@/lib/api";
import { products as localProducts } from "@/lib/data";

export default function Hero() {
  const { add } = useCart();
  const { data: content } = useQuery({ queryKey: ["content"], queryFn: fetchContent });
  const { data: liveProducts } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });
  const block = content?.["hero"];

  // Featured product comes from the LIVE catalogue (local demo data is only a
  // fallback when the API is unreachable) — never the placeholder VoltMax rows.
  const pool = liveProducts?.length ? liveProducts : localProducts;
  const productId = block?.productIds?.[0] || "deye-deye-sun-8k-sg-lp1-1-faza";
  const featured = pool.find((p) => p.id === productId) ?? pool[0];

  const heading = block?.heading || featured?.name || "Гібридні інвертори та накопичувачі Deye";
  const subheading =
    block?.subheading || "Забезпечте свій дім електроенергією під час будь-якого відключення";
  const badge = block?.body || "Хіт продажів";

  // Real product photo when available, otherwise the generic illustration below.
  const rawImg =
    featured?.images?.[0] ||
    (featured?.image && featured.image !== "/placeholder.jpg" ? featured.image : "");
  const heroImg = rawImg ? assetUrl(rawImg) : "";

  return (
    <section className="pt-[112px] pb-[0px] bg-gray-100">
      <div className="max-w-[1280px] mx-auto px-[24px] pb-[24px]">
        {/* Whole banner is a link to the product page */}
        <Link
          href={`/products/${featured?.id ?? ""}`}
          className="relative rounded-[8px] overflow-hidden h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 block"
        >
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          {/* Product image on a clean card, or the generic illustration fallback */}
          <div className="absolute right-[5%] top-1/2 -translate-y-1/2 hidden sm:flex">
            {heroImg ? (
              <div className="w-[300px] h-[300px] rounded-[16px] bg-white/95 p-[20px] shadow-2xl flex items-center justify-center">
                <img
                  src={heroImg}
                  alt={heading}
                  className="max-w-full max-h-full object-contain"
                  loading="eager"
                />
              </div>
            ) : (
              <svg viewBox="0 0 300 300" fill="none" className="w-[400px] h-[400px] opacity-20">
                <rect x="60" y="80" width="180" height="140" rx="12" fill="white" />
                <rect x="80" y="100" width="60" height="100" rx="4" fill="white" opacity="0.3" />
                <rect x="160" y="100" width="60" height="100" rx="4" fill="white" opacity="0.3" />
                <path d="M150 40L120 90h25L130 160l60-80h-25L150 40z" fill="white" />
                <circle cx="150" cy="240" r="30" stroke="white" strokeWidth="3" />
                <path
                  d="M140 240l8 8 16-16"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-[40px]">
            <p className="text-gray-400 text-[13px] mb-[8px] font-medium uppercase tracking-wider">
              {badge}
            </p>
            <h1 className="text-white text-[36px] font-bold leading-tight mb-[6px]">{heading}</h1>
            <p className="text-gray-300 text-[14px] mb-[6px]">{subheading}</p>
            {featured && featured.price > 0 && (
              <p className="text-gray-400 text-[12px] mb-[24px]">
                Від: ${featured.price.toLocaleString("en-US")}
              </p>
            )}
            {featured && featured.price > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  add(featured);
                }}
                className="inline-block bg-white text-gray-900 text-[14px] font-medium rounded-full px-[28px] py-[10px] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Купити
              </button>
            )}
            {featured && featured.price <= 0 && (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.location.href = "/#contact"; }}
                className="inline-block bg-white text-gray-900 text-[14px] font-medium rounded-full px-[28px] py-[10px] hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Уточнити ціну
              </button>
            )}
          </div>
        </Link>
      </div>
    </section>
  );
}
