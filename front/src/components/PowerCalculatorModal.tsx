"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCart } from "@/context/CartContext";
import { products as localProducts } from "@/lib/data";
import { fetchCalculator, fetchProducts } from "@/lib/api";
import type { CalcAppliance, CalcRecommendation, Product } from "@/types";

// ── Fallback data (used until the API responds, or if it is down) ──────────────

const FALLBACK_APPLIANCES: CalcAppliance[] = [
  { id: "fridge",    name: "Холодильник",       watts: 150,  icon: "🧊", group: "essential" },
  { id: "tv",        name: "Телевізор",          watts: 100,  icon: "📺", group: "essential" },
  { id: "laptop",    name: "Ноутбук",            watts: 65,   icon: "💻", group: "essential" },
  { id: "router",    name: "Роутер / інтернет",  watts: 15,   icon: "📶", group: "essential" },
  { id: "lighting",  name: "Освітлення",         watts: 100,  icon: "💡", group: "essential" },
  { id: "phone",     name: "Зарядка телефону",   watts: 20,   icon: "📱", group: "essential" },
  { id: "microwave", name: "Мікрохвильовка",     watts: 1000, icon: "🍲", group: "kitchen" },
  { id: "kettle",    name: "Чайник",             watts: 2000, icon: "☕", group: "kitchen" },
  { id: "coffee",    name: "Кавоварка",          watts: 800,  icon: "☕", group: "kitchen" },
  { id: "washing",   name: "Пральна машинка",    watts: 2000, icon: "🫧", group: "heavy" },
  { id: "hairdryer", name: "Фен",               watts: 1500, icon: "💨", group: "heavy" },
  { id: "iron",      name: "Праска",             watts: 2000, icon: "👔", group: "heavy" },
  { id: "vacuum",    name: "Пилосос",            watts: 1000, icon: "🧹", group: "heavy" },
  { id: "ac",        name: "Кондиціонер",        watts: 1500, icon: "❄️", group: "heavy" },
  { id: "boiler",    name: "Бойлер",             watts: 2000, icon: "🚿", group: "heavy" },
  { id: "pump",      name: "Водяний насос",      watts: 800,  icon: "💧", group: "heavy" },
];

const FALLBACK_REC: CalcRecommendation = {
  autonomyHours: 4,
  powerReservePct: 20,
  inverterCategory: "inverter",
  batteryCategory: "battery",
  stationCategory: "station",
};

const SMALL_LOAD_FALLBACK_WATTS = 1000;

// ── Spec parsers ───────────────────────────────────────────────────────────────
// Read power/capacity straight off each product's spec strings so the calculator
// can size against the whole catalogue rather than a fixed list of products.

function parseWatts(power?: string): number {
  if (!power) return 0;
  const m = power.replace(",", ".").match(/([\d.]+)\s*(квт|вт|kw|w)?/iu);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return 0;
  return /^(квт|kw)$/iu.test(m[2] || "") ? n * 1000 : n; // assume W by default
}

function parseKwh(capacity?: string): number {
  if (!capacity) return 0;
  const m = capacity
    .replace(",", ".")
    .match(/([\d.]+)\s*(квт(?:[·\s/-]*год|г)|вт(?:[·\s/-]*год|г)|kwh|wh)?/iu);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  if (!isFinite(n)) return 0;
  return /^(вт(?:[·\s/-]*год|г)|wh)$/iu.test(m[2] || "") ? n / 1000 : n; // Wh → kWh, kWh as-is
}

function inCategory(product: Product, category: string): boolean {
  if (!category) return false;
  const keys = product.categoryKeys ?? [product.category];
  return product.category === category || keys.some((key) => key === category || key.startsWith(`${category}-`));
}

function byPrice(a: { p: Product }, b: { p: Product }) {
  return a.p.price - b.p.price;
}

export type RecItem = { product: Product; quantity: number };
export type Recommendation = { items: RecItem[]; total: number; hours: number };

// ── Auto recommendation ────────────────────────────────────────────────────────
// Picks the cheapest solution that covers the load & desired autonomy, choosing
// from every product in the configured categories:
//   • an all-in-one portable station (power + capacity in one unit), OR
//   • an inverter (enough power) + battery (enough storage, ×qty if needed).

function buildRecommendation(
  totalWatts: number,
  productList: Product[],
  rec: CalcRecommendation
): Recommendation | null {
  if (totalWatts <= 0) return null;
  const requiredW = totalWatts * (1 + (rec.powerReservePct ?? 0) / 100);
  const requiredKwh = (totalWatts * rec.autonomyHours) / 1000;
  const availableProducts = productList.filter((product) => product.price > 0);

  const solutions: Array<{ items: RecItem[]; total: number; capacityKwh: number }> = [];

  // 1) All-in-one station that covers both power and energy
  if (rec.stationCategory) {
    const stations = availableProducts
      .filter((p) => inCategory(p, rec.stationCategory))
      .map((p) => ({ p, w: parseWatts(p.power), kwh: parseKwh(p.capacity) }))
      .sort(byPrice);
    const station = stations.find((x) =>
      (x.w >= requiredW || (x.w === 0 && requiredW <= SMALL_LOAD_FALLBACK_WATTS)) &&
      (x.kwh >= requiredKwh || (x.kwh === 0 && requiredW <= SMALL_LOAD_FALLBACK_WATTS))
    );
    if (station) {
      solutions.push({
        items: [{ product: station.p, quantity: 1 }],
        total: station.p.price,
        capacityKwh: station.kwh || requiredKwh,
      });
    }
  }

  // 2) Inverter + battery system
  const inverters = availableProducts
    .filter((p) => inCategory(p, rec.inverterCategory))
    .map((p) => ({ p, w: parseWatts(p.power) }))
    .sort(byPrice);
  const batteries = availableProducts
    .filter((p) => inCategory(p, rec.batteryCategory))
    .map((p) => ({ p, kwh: parseKwh(p.capacity) }))
    .sort(byPrice);

  if (inverters.length && batteries.length) {
    // Unknown structured power no longer pushes an inexpensive real product
    // behind an oversized industrial inverter. Among eligible candidates, the
    // cheapest option wins; known undersized models are excluded.
    const inverterCandidates = inverters.filter((x) =>
      x.w >= requiredW || (x.w === 0 && requiredW <= SMALL_LOAD_FALLBACK_WATTS)
    );
    const inv = inverterCandidates[0] ?? [...inverters].sort((a, b) => b.w - a.w)[0];

    // Compare the complete battery cost, including quantity, instead of always
    // preferring the smallest nominal capacity.
    const batteryOptions = batteries
      .map((bat) => {
        const qty = bat.kwh > 0 ? Math.max(1, Math.ceil(requiredKwh / bat.kwh)) : 1;
        return { bat, qty, total: bat.p.price * qty };
      })
      .sort((a, b) => a.total - b.total || a.bat.p.price - b.bat.p.price);
    const { bat, qty } = batteryOptions[0];

    solutions.push({
      items: [
        { product: inv.p, quantity: 1 },
        { product: bat.p, quantity: qty },
      ],
      total: inv.p.price + bat.p.price * qty,
      capacityKwh: bat.kwh > 0 ? bat.kwh * qty : requiredKwh,
    });
  }

  if (!solutions.length) return null;

  const best = solutions.sort((a, b) => a.total - b.total)[0];
  const hours = Math.max(1, Math.round((best.capacityKwh * 1000) / totalWatts));
  return { items: best.items, total: best.total, hours };
}

// ── Watt meter bar ────────────────────────────────────────────────────────────

function WattBar({ totalWatts }: { totalWatts: number }) {
  const max = 10000;
  const pct = Math.min((totalWatts / max) * 100, 100);
  const color =
    totalWatts === 0
      ? "bg-gray-200"
      : totalWatts < 3500
      ? "bg-green-500"
      : totalWatts < 7000
      ? "bg-yellow-400"
      : "bg-red-500";

  return (
    <div className="w-full h-[6px] bg-gray-100 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Recommendation card ───────────────────────────────────────────────────────

function RecommendationCard({
  totalWatts,
  rec,
  productList,
  onAdd,
}: {
  totalWatts: number;
  rec: CalcRecommendation;
  productList: Product[];
  onAdd: (items: RecItem[]) => void;
}) {
  const result = buildRecommendation(totalWatts, productList, rec);

  if (!result || result.items.length === 0) {
    return (
      <div className="bg-slate-900 rounded-[10px] p-[20px] text-white text-[13px] text-slate-300">
        Не вдалося підібрати товар під це навантаження. Додайте більше товарів у каталог або перевірте
        налаштування калькулятора в адмінці.
      </div>
    );
  }

  const { items, total, hours } = result;

  return (
    <div className="bg-slate-900 rounded-[10px] p-[20px] text-white">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-[12px]">
        Рекомендована система
      </p>

      <div className="space-y-[10px] mb-[16px]">
        {items.map(({ product: p, quantity }) => {
          const isInverter = inCategory(p, rec.inverterCategory);
          const isStation = inCategory(p, rec.stationCategory);
          const typeLabel = isInverter ? "Інвертор" : isStation ? "Зарядна станція" : "Акумулятор";
          const icon = isInverter ? "⚡" : isStation ? "🔌" : "🔋";
          const specs = [p.power, p.capacity].filter(Boolean).join(" · ");

          return (
            <div key={p.id} className="rounded-[8px] border border-white/10 bg-slate-800/70 p-[12px]">
              <div className="flex items-start justify-between gap-[10px]">
                <div className="flex min-w-0 items-center gap-[8px]">
                  <span className="text-[18px] shrink-0" aria-hidden="true">{icon}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    {typeLabel}
                  </span>
                  {quantity > 1 && (
                    <span className="rounded-full bg-amber-400/15 px-[7px] py-[2px] text-[10px] font-bold text-amber-300">
                      × {quantity}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[13px] font-bold text-white">
                  ${(p.price * quantity).toLocaleString("en-US")}
                </span>
              </div>
              <p className="mt-[7px] break-words text-[13px] font-semibold leading-[1.35] text-white">
                {p.name}
              </p>
              {(specs || p.badge) && (
                <p className="mt-[5px] text-[10px] leading-snug text-slate-400">
                  {[specs, p.badge].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="space-y-[8px] mb-[16px]">
        <div className="grid grid-cols-2 gap-[8px]">
          <div className="bg-slate-800 rounded-[6px] p-[10px] text-center">
            <p className="text-[18px] font-bold text-white">{(totalWatts / 1000).toFixed(1)}</p>
            <p className="text-[10px] text-slate-400">кВт навант.</p>
          </div>
          <div className="bg-slate-800 rounded-[6px] p-[10px] text-center">
            <p className="text-[18px] font-bold text-white">{hours}+</p>
            <p className="text-[10px] text-slate-400">годин роботи</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-[6px] p-[10px] flex items-center justify-between">
          <p className="text-[11px] text-slate-400">Разом</p>
          <p className="text-[18px] font-bold text-white">${total.toLocaleString("en-US")}</p>
        </div>
      </div>

      <button
        onClick={() => onAdd(items)}
        className="w-full py-[11px] rounded-[8px] bg-[#FFC107] text-gray-950 text-[14px] font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
      >
        Додати в кошик
      </button>

      <p className="text-[10px] text-slate-500 leading-relaxed mt-[10px]">
        * Розраховано на основі середніх показників. Фактичне споживання залежить від виробника та моделі приладу.
      </p>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function PowerCalculatorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { add } = useCart();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [added, setAdded] = useState(false);

  const { data: calc } = useQuery({ queryKey: ["calculator"], queryFn: fetchCalculator });
  const { data: prods } = useQuery({
    queryKey: ["products"],
    queryFn: () => fetchProducts(),
    initialData: localProducts,
  });

  const appliances = calc?.appliances?.length ? calc.appliances : FALLBACK_APPLIANCES;
  const rec = calc?.recommendation ?? FALLBACK_REC;
  const productList = prods ?? localProducts;

  const handleClose = useCallback(() => {
    setSelected(new Set());
    setAdded(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose, isOpen]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalWatts = useMemo(
    () => appliances.filter((a) => selected.has(a.id)).reduce((sum, a) => sum + a.watts, 0),
    [selected, appliances]
  );

  const handleAddToCart = (items: RecItem[]) => {
    items.forEach(({ product, quantity }) => {
      for (let i = 0; i < quantity; i++) add(product);
    });
    setAdded(true);
    setTimeout(() => {
      handleClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const groups = [
    { key: "essential", label: "Основне" },
    { key: "kitchen",   label: "Кухня" },
    { key: "heavy",     label: "Потужні прилади" },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[16px]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-[12px] shadow-2xl w-full max-w-[1040px] max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-[28px] pt-[24px] pb-[16px] shrink-0">
          <div>
            <h2 className="text-[20px] font-bold text-gray-900 mb-[4px]">
              Калькулятор потужності
            </h2>
            <p className="text-[13px] text-gray-500">
              Оберіть прилади, які мають працювати під час відключення світла
            </p>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer ml-[16px] shrink-0 mt-[2px]"
            aria-label="Закрити"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
          {/* Left — appliance grid */}
          <div className="flex-1 overflow-y-auto px-[28px] pb-[24px]">
            {groups.map(({ key, label }) => {
              const items = appliances.filter((a) => a.group === key);
              if (items.length === 0) return null;
              return (
                <div key={key} className="mb-[20px]">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-[10px]">
                    {label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-[8px]">
                    {items.map((a) => {
                      const isSelected = selected.has(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() => toggle(a.id)}
                          className={`relative flex flex-col items-start gap-[6px] rounded-[8px] border p-[12px] text-left transition-all duration-150 cursor-pointer ${
                            isSelected
                              ? "border-amber-400 bg-amber-50 shadow-sm"
                              : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <span
                            className={`absolute top-[8px] right-[8px] w-[16px] h-[16px] rounded-full border flex items-center justify-center transition-colors ${
                              isSelected ? "bg-gray-950 border-gray-950" : "border-gray-300"
                            }`}
                          >
                            {isSelected && (
                              <svg viewBox="0 0 10 10" fill="none" className="w-[8px] h-[8px]">
                                <path d="M2 5l2.5 2.5L8 3" stroke="#FFC107" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>

                          <span className="text-[22px] leading-none">{a.icon}</span>
                          <span className={`text-[13px] font-medium leading-tight pr-[18px] ${isSelected ? "text-amber-800" : "text-gray-800"}`}>
                            {a.name}
                          </span>
                          <span className="text-[11px] text-gray-400 font-medium">{a.watts} Вт</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right — summary panel */}
          <div className="lg:w-[340px] shrink-0 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-100 px-[24px] py-[24px] flex flex-col gap-[16px]">
            <div>
              <div className="flex items-end justify-between mb-[8px]">
                <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">
                  Загальна потужність
                </span>
                <span className={`text-[22px] font-black leading-none ${
                  totalWatts === 0 ? "text-gray-300" :
                  totalWatts < 3500 ? "text-green-600" :
                  totalWatts < 7000 ? "text-yellow-500" : "text-red-500"
                }`}>
                  {totalWatts.toLocaleString("en-US")}
                  <span className="text-[12px] font-medium text-gray-400 ml-[4px]">Вт</span>
                </span>
              </div>
              <WattBar totalWatts={totalWatts} />
              <div className="flex justify-between mt-[6px]">
                <span className="text-[10px] text-gray-400">0</span>
                <span className="text-[10px] text-gray-400">5 кВт</span>
                <span className="text-[10px] text-gray-400">10 кВт</span>
              </div>
            </div>

            {selected.size > 0 && (
              <div className="flex-1 overflow-y-auto">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-[8px]">
                  Обрано ({selected.size})
                </p>
                <ul className="space-y-[4px]">
                  {appliances.filter((a) => selected.has(a.id)).map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-700">{a.icon} {a.name}</span>
                      <span className="text-gray-400 shrink-0 ml-[8px]">{a.watts} Вт</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selected.size === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[13px] text-gray-400 text-center">
                  Оберіть прилади ліворуч, щоб побачити рекомендацію
                </p>
              </div>
            )}

            {totalWatts > 0 && (
              <div>
                {added ? (
                  <div className="bg-gray-100 border border-amber-200 rounded-[10px] p-[20px] text-center">
                    <p className="text-[22px] mb-[6px]">✓</p>
                    <p className="text-[14px] font-semibold text-gray-800">Додано до кошика!</p>
                  </div>
                ) : (
                  <RecommendationCard
                    totalWatts={totalWatts}
                    rec={rec}
                    productList={productList}
                    onAdd={handleAddToCart}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
