"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { fetchContent, fetchProducts, assetUrl } from "@/lib/api";
import { products as localProducts } from "@/lib/data";

const FEATURED_KIT_ID = "deye-kit-sun-6k-se-f5-pro-c";

export default function Hero() {
  const { add } = useCart();
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

  const heading = block?.heading || featured?.name || "Резервне живлення Deye для дому";
  const subheading = block?.subheading || (isKit
    ? "Готове сумісне рішення для резервного живлення з можливістю підключення сонячних панелей"
    : "Забезпечте свій дім електроенергією під час будь-якого відключення");
  const badge = block?.body || featured?.badge || "Рекомендований комплект";
  const rawImages = Array.from(new Set([
    ...(featured?.images ?? []),
    ...(featured?.image && featured.image !== "/placeholder.jpg" ? [featured.image] : []),
  ])).slice(0, isKit ? 2 : 1);
  const images = rawImages.map(assetUrl);

  const addToCart = () => {
    if (!featured || featured.price <= 0) return;
    add(featured);
    window.dispatchEvent(new Event("e-kit:open-cart"));
  };

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

          <div className="relative grid min-h-[540px] lg:grid-cols-[1.08fr_0.92fr]">
            <div className="flex flex-col justify-center px-[24px] py-[40px] sm:px-[48px] sm:py-[56px] lg:pr-[16px]">
              <div className="mb-[18px] inline-flex w-fit items-center gap-[8px] rounded-full border border-amber-300/30 bg-amber-400/10 px-[12px] py-[7px] text-[11px] font-bold uppercase tracking-[0.14em] text-amber-300">
                <span className="h-[7px] w-[7px] rounded-full bg-[#FFC107] shadow-[0_0_12px_#FFC107]" />
                {badge}
              </div>

              <h1 className="max-w-[700px] text-[34px] font-bold leading-[1.08] tracking-[-0.025em] text-white sm:text-[48px] lg:text-[52px]">
                {heading}
              </h1>
              <p className="mt-[18px] max-w-[620px] text-[15px] leading-relaxed text-slate-300 sm:text-[17px]">
                {subheading}
              </p>

              {isKit && (
                <div className="mt-[24px] flex flex-wrap gap-[8px]">
                  {["Інвертор 6 кВт", "LiFePO₄ 5,12 кВт·год", "1 фаза", "Готове рішення"].map((item) => (
                    <span key={item} className="rounded-full border border-white/15 bg-white/[0.06] px-[11px] py-[6px] text-[12px] font-medium text-slate-200">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              {featured && featured.price > 0 && (
                <div className="mt-[30px] flex flex-wrap items-end gap-x-[12px] gap-y-[4px]">
                  <span className="text-[12px] font-medium uppercase tracking-wider text-slate-400">Ціна комплекту</span>
                  <strong className="text-[32px] leading-none text-white">${featured.price.toLocaleString("en-US")}</strong>
                </div>
              )}

              <div className="mt-[26px] flex flex-wrap gap-[10px]">
                {featured && featured.price > 0 ? (
                  <button
                    type="button"
                    onClick={addToCart}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#FFC107] px-[28px] text-[14px] font-bold text-gray-950 shadow-[0_10px_28px_rgba(255,193,7,0.25)] transition hover:bg-amber-300 hover:shadow-[0_12px_34px_rgba(255,193,7,0.35)]"
                  >
                    Купити комплект
                  </button>
                ) : (
                  <Link href="/#contact" className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#FFC107] px-[28px] text-[14px] font-bold text-gray-950 hover:bg-amber-300">
                    Уточнити ціну
                  </Link>
                )}
                {featured && (
                  <Link
                    href={`/products/${featured.id}`}
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/25 px-[24px] text-[14px] font-semibold text-white transition hover:border-white/50 hover:bg-white/10"
                  >
                    Детальніше
                  </Link>
                )}
              </div>
              {featured && featured.price > 0 && (
                <p className="mt-[14px] text-[11px] text-slate-500">Орієнтовна ціна залежить від партії постачання</p>
              )}
            </div>

            <div className="relative flex min-h-[330px] items-center justify-center px-[24px] pb-[42px] lg:min-h-full lg:px-[44px] lg:py-[54px]">
              {images.length > 0 ? (
                <div className="relative flex w-full max-w-[520px] items-end justify-center gap-[12px] sm:gap-[18px]">
                  {images.map((image, index) => (
                    <Link
                      href={`/products/${featured?.id ?? ""}`}
                      key={image}
                      className={`flex h-[250px] flex-1 items-center justify-center rounded-[18px] border border-white/70 bg-white p-[16px] shadow-2xl transition hover:-translate-y-[4px] sm:h-[310px] sm:p-[22px] ${index === 1 ? "mb-[24px]" : ""}`}
                      aria-label={`Переглянути ${featured?.name ?? "комплект"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image} alt="" className="max-h-full max-w-full object-contain" loading="eager" />
                    </Link>
                  ))}
                  {isKit && images.length > 1 && (
                    <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-[16px] py-[8px] text-[12px] font-bold text-gray-900 shadow-lg">
                      2 пристрої · 1 готове рішення
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex h-[280px] w-[280px] items-center justify-center rounded-full border border-white/10 bg-white/5 text-[86px] text-[#FFC107]">⚡</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
