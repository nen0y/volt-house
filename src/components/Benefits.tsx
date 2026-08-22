"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { products } from "@/lib/data";

const featured = [
  { productId: "inv-5kw",   name: "VoltMax 5kW Pro",     subtitle: "Гібридний інвертор з MPPT",    price: "Від: $1,299", gradient: "from-slate-900 to-slate-700" },
  { productId: "bat-10kwh", name: "PowerCell 10kWh",     subtitle: "Акумуляторне сховище LiFePO4", price: "Від: $3,499", gradient: "from-zinc-900 to-zinc-700" },
  { productId: "sol-400w",  name: "SunPower 400W Panel", subtitle: "Монокристалічний PERC",         price: "Від: $299",   gradient: "from-stone-800 to-stone-600" },
  { productId: "bat-20kwh", name: "PowerCell 20kWh",     subtitle: "Модульна система LiFePO4",     price: "Від: $6,499", gradient: "from-neutral-900 to-neutral-700" },
];

export default function Benefits() {
  const { add } = useCart();

  return (
    <section id="benefits" className="bg-gray-100 py-[32px]">
      <div className="max-w-[1280px] mx-auto px-[24px]">
        <h2 className="text-[22px] font-bold text-gray-900 mb-[16px]">Новинки</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
          {featured.map((item) => (
            <Link
              key={item.name}
              href={`/products/${item.productId}`}
              className={`relative rounded-[8px] overflow-hidden h-[280px] bg-gradient-to-br ${item.gradient} block`}
            >
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-[20px]">
                <h3 className="text-white text-[17px] font-bold leading-tight mb-[4px]">
                  {item.name}
                </h3>
                <p className="text-gray-300 text-[12px] mb-[4px]">{item.subtitle}</p>
                <div className="flex items-end justify-between mt-[12px]">
                  <p className="text-gray-400 text-[11px]">{item.price}</p>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const product = products.find((p) => p.id === item.productId);
                      if (product) add(product);
                    }}
                    className="bg-white text-gray-900 text-[12px] font-medium rounded-full px-[16px] py-[6px] hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Купити
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
