"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchContent, fetchProducts, assetUrl } from "@/lib/api";
import { products as localProducts } from "@/lib/data";
import LeadCaptureForm from "./LeadCaptureForm";

const FEATURED_KIT_ID = "deye-kit-sun-6k-se-f5-pro-c";

export default function Hero() {
  const { data: content } = useQuery({ queryKey: ["content"], queryFn: fetchContent });
  const { data: liveProducts } = useQuery({ queryKey: ["products"], queryFn: () => fetchProducts() });
  const block = content?.hero;

  const pool = liveProducts?.length ? liveProducts : localProducts;
  const productId = block?.productIds?.[0] || FEATURED_KIT_ID;
  const configuredProduct = pool.find((product) => product.id === productId);
  const featured = (configuredProduct?.price ?? 0) > 0
    ? configuredProduct
    : pool.find((product) => product.id === FEATURED_KIT_ID) ?? pool.find((product) => product.price > 0);
  const isKit = featured?.category === "kits";

  const heading = block?.heading || "Підберемо резервне живлення під ваш дім і бюджет";
  const subheading = block?.subheading || "Безкоштовно розрахуємо потрібну потужність, перевіримо сумісність обладнання та запропонуємо кілька варіантів без переплати.";
  const badge = block?.body || "Безкоштовна консультація спеціаліста";
  const rawImages = Array.from(new Set([
    ...(featured?.images ?? []),
    ...(featured?.image && featured.image !== "/placeholder.jpg" ? [featured.image] : []),
  ])).slice(0, isKit ? 2 : 1);
  const images = rawImages.map(assetUrl);

  return (
    <section className="bg-gray-100 pt-[88px] sm:pt-[104px]">
      <div className="mx-auto max-w-[1280px] px-[16px] pb-[20px] sm:px-[24px] sm:pb-[24px]">
        <div className="relative overflow-hidden rounded-[16px] bg-[#111827] shadow-[0_20px_60px_rgba(15,23,42,0.18)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "54px 54px",
            }}
          />
          <div className="pointer-events-none absolute -left-[100px] -top-[180px] h-[420px] w-[420px] rounded-full bg-[#FFC107]/20 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-[220px] right-[10%] h-[460px] w-[460px] rounded-full bg-amber-400/10 blur-[90px]" />

          <div className="relative grid min-w-0 lg:min-h-[570px] lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex min-w-0 flex-col justify-center px-[24px] py-[40px] sm:px-[48px] sm:py-[56px] lg:pr-[16px]">
              <div className="mb-[18px] inline-flex w-fit max-w-full items-center gap-[8px] rounded-full border border-amber-300/30 bg-amber-400/10 px-[12px] py-[7px] text-[11px] font-bold uppercase leading-relaxed tracking-[0.14em] text-amber-300">
                <span className="h-[7px] w-[7px] rounded-full bg-[#FFC107] shadow-[0_0_12px_#FFC107]" />
                {badge}
              </div>

              <h1 className="max-w-[700px] text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[48px] lg:text-[52px]">
                {heading}
              </h1>
              <p className="mt-[18px] max-w-[620px] text-[15px] leading-relaxed text-slate-300 sm:text-[17px]">
                {subheading}
              </p>

              <ul className="mt-[24px] space-y-[11px] text-[15px] text-slate-200">
                {["Під ваші потреби та реальне споживання", "Перевіримо сумісність усіх компонентів", "Пояснимо ціну, строки й варіанти встановлення"].map((item) => (
                  <li key={item} className="flex items-start gap-[10px]">
                    <span className="mt-[2px] flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-amber-400/15 text-[12px] font-bold text-amber-300">✓</span>
                    {item}
                  </li>
                ))}
              </ul>

              <div className="mt-[28px] flex flex-wrap items-center gap-[14px]">
                <Link href="/#quick-lead" className="inline-flex min-h-[50px] items-center justify-center rounded-full bg-[#FFC107] px-[26px] text-[15px] font-bold text-gray-950 lg:hidden">
                  Отримати підбір
                </Link>
                <Link href="/products" className="text-[14px] font-semibold text-white underline decoration-white/30 underline-offset-4 hover:decoration-white">
                  Переглянути каталог
                </Link>
              </div>
            </div>

            <div id="quick-lead" className="relative flex min-w-0 items-center px-[18px] pb-[28px] sm:px-[48px] sm:pb-[48px] lg:px-[44px] lg:py-[54px]">
              <div className="w-full rounded-[20px] border border-white/15 bg-white/[0.08] p-[22px] shadow-2xl backdrop-blur sm:p-[30px]">
                <LeadCaptureForm source="hero" dark />
                {featured && images[0] && (
                  <Link href={`/products/${featured.id}`} className="mt-[20px] flex items-center gap-[12px] border-t border-white/10 pt-[18px] text-left">
                    <span className="flex h-[54px] w-[54px] shrink-0 items-center justify-center rounded-[10px] bg-white p-[5px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={images[0]} alt="" className="max-h-full max-w-full object-contain" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[12px] text-slate-400">Популярне готове рішення</span>
                      <span className="block truncate text-[14px] font-semibold text-white">{featured.name}</span>
                    </span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
