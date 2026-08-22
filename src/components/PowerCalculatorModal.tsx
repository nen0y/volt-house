"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
import { products } from "@/lib/data";

// ── Appliance data ────────────────────────────────────────────────────────────

const APPLIANCES = [
  { id: "fridge",    name: "Холодильник",       watts: 150,  icon: "🧊", category: "essential" },
  { id: "tv",        name: "Телевізор",          watts: 100,  icon: "📺", category: "essential" },
  { id: "laptop",    name: "Ноутбук",            watts: 65,   icon: "💻", category: "essential" },
  { id: "router",    name: "Роутер / інтернет",  watts: 15,   icon: "📶", category: "essential" },
  { id: "lighting",  name: "Освітлення",         watts: 100,  icon: "💡", category: "essential" },
  { id: "phone",     name: "Зарядка телефону",   watts: 20,   icon: "📱", category: "essential" },
  { id: "microwave", name: "Мікрохвильовка",     watts: 1000, icon: "🍲", category: "kitchen" },
  { id: "kettle",    name: "Чайник",             watts: 2000, icon: "☕", category: "kitchen" },
  { id: "coffee",    name: "Кавоварка",          watts: 800,  icon: "☕", category: "kitchen" },
  { id: "washing",   name: "Пральна машинка",    watts: 2000, icon: "🫧", category: "heavy" },
  { id: "hairdryer", name: "Фен",               watts: 1500, icon: "💨", category: "heavy" },
  { id: "iron",      name: "Праска",             watts: 2000, icon: "👔", category: "heavy" },
  { id: "vacuum",    name: "Пилосос",            watts: 1000, icon: "🧹", category: "heavy" },
  { id: "ac",        name: "Кондиціонер",        watts: 1500, icon: "❄️", category: "heavy" },
  { id: "boiler",    name: "Бойлер",             watts: 2000, icon: "🚿", category: "heavy" },
  { id: "pump",      name: "Водяний насос",      watts: 800,  icon: "💧", category: "heavy" },
] as const;

type ApplianceId = (typeof APPLIANCES)[number]["id"];

// ── Recommendation logic ──────────────────────────────────────────────────────

function getRecommendation(totalWatts: number) {
  const inverterId = totalWatts <= 3500 ? "inv-5kw" : "inv-10kw";
  // Battery: assume 4h autonomy at full load
  const energyNeeded = (totalWatts * 4) / 1000; // kWh
  const batteryId = energyNeeded <= 8 ? "bat-10kwh" : "bat-20kwh";
  return {
    inverter: products.find((p) => p.id === inverterId)!,
    battery: products.find((p) => p.id === batteryId)!,
    hours: energyNeeded <= 8 ? 4 : Math.round((20 * 1000) / totalWatts),
  };
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
  onAdd,
}: {
  totalWatts: number;
  onAdd: (ids: string[]) => void;
}) {
  const rec = getRecommendation(totalWatts);

  return (
    <div className="bg-slate-900 rounded-[10px] p-[20px] text-white">
      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-[12px]">
        Рекомендована система
      </p>

      <div className="space-y-[10px] mb-[16px]">
        {[rec.inverter, rec.battery].map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-[12px]">
            <div className="flex items-center gap-[10px] min-w-0">
              <span className="text-[18px] shrink-0">
                {p.category === "inverter" ? "⚡" : "🔋"}
              </span>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-white leading-tight line-clamp-1">
                  {p.name}
                </p>
                {p.badge && (
                  <span className="text-[10px] text-blue-400 font-medium">{p.badge}</span>
                )}
              </div>
            </div>
            <span className="text-[13px] font-bold text-slate-300 shrink-0">
              ${p.price.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="space-y-[8px] mb-[16px]">
        <div className="grid grid-cols-2 gap-[8px]">
          <div className="bg-slate-800 rounded-[6px] p-[10px] text-center">
            <p className="text-[18px] font-bold text-white">{(totalWatts / 1000).toFixed(1)}</p>
            <p className="text-[10px] text-slate-400">кВт навант.</p>
          </div>
          <div className="bg-slate-800 rounded-[6px] p-[10px] text-center">
            <p className="text-[18px] font-bold text-white">{rec.hours}+</p>
            <p className="text-[10px] text-slate-400">годин роботи</p>
          </div>
        </div>
        <div className="bg-slate-800 rounded-[6px] p-[10px] flex items-center justify-between">
          <p className="text-[11px] text-slate-400">Разом</p>
          <p className="text-[18px] font-bold text-white">
            ${(rec.inverter.price + rec.battery.price).toLocaleString()}
          </p>
        </div>
      </div>

      <button
        onClick={() => onAdd([rec.inverter.id, rec.battery.id])}
        className="w-full py-[11px] rounded-[8px] bg-blue-600 text-white text-[14px] font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
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
  const [selected, setSelected] = useState<Set<ApplianceId>>(new Set());
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) {
      setSelected(new Set());
      setAdded(false);
    }
  }, [isOpen]);

  const toggle = (id: ApplianceId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalWatts = useMemo(
    () =>
      APPLIANCES.filter((a) => selected.has(a.id)).reduce(
        (sum, a) => sum + a.watts,
        0
      ),
    [selected]
  );

  const handleAddToCart = (ids: string[]) => {
    ids.forEach((id) => {
      const p = products.find((pr) => pr.id === id);
      if (p) add(p);
    });
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  const categories = [
    { key: "essential", label: "Основне" },
    { key: "kitchen",   label: "Кухня" },
    { key: "heavy",     label: "Потужні прилади" },
  ] as const;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[16px]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 bg-white rounded-[12px] shadow-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col overflow-hidden">
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
            onClick={onClose}
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
            {categories.map(({ key, label }) => (
              <div key={key} className="mb-[20px]">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-[10px]">
                  {label}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-[8px]">
                  {APPLIANCES.filter((a) => a.category === key).map((a) => {
                    const isSelected = selected.has(a.id);
                    return (
                      <button
                        key={a.id}
                        onClick={() => toggle(a.id)}
                        className={`relative flex flex-col items-start gap-[6px] rounded-[8px] border p-[12px] text-left transition-all duration-150 cursor-pointer ${
                          isSelected
                            ? "border-blue-500 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {/* Checkmark */}
                        <span
                          className={`absolute top-[8px] right-[8px] w-[16px] h-[16px] rounded-full border flex items-center justify-center transition-colors ${
                            isSelected
                              ? "bg-blue-600 border-blue-600"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <svg viewBox="0 0 10 10" fill="none" className="w-[8px] h-[8px]">
                              <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>

                        <span className="text-[22px] leading-none">{a.icon}</span>
                        <span className={`text-[13px] font-medium leading-tight pr-[18px] ${isSelected ? "text-blue-700" : "text-gray-800"}`}>
                          {a.name}
                        </span>
                        <span className="text-[11px] text-gray-400 font-medium">
                          {a.watts} Вт
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Right — summary panel */}
          <div className="lg:w-[280px] shrink-0 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-100 px-[24px] py-[24px] flex flex-col gap-[16px]">
            {/* Watt summary */}
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
                  {totalWatts.toLocaleString()}
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

            {/* Selected list */}
            {selected.size > 0 && (
              <div className="flex-1 overflow-y-auto">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-[8px]">
                  Обрано ({selected.size})
                </p>
                <ul className="space-y-[4px]">
                  {APPLIANCES.filter((a) => selected.has(a.id)).map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-[12px]">
                      <span className="text-gray-700">
                        {a.icon} {a.name}
                      </span>
                      <span className="text-gray-400 shrink-0 ml-[8px]">{a.watts} Вт</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Empty state */}
            {selected.size === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-[13px] text-gray-400 text-center">
                  Оберіть прилади ліворуч, щоб побачити рекомендацію
                </p>
              </div>
            )}

            {/* Recommendation */}
            {totalWatts > 0 && (
              <div>
                {added ? (
                  <div className="bg-green-50 rounded-[10px] p-[20px] text-center">
                    <p className="text-[22px] mb-[6px]">✓</p>
                    <p className="text-[14px] font-semibold text-green-700">Додано до кошика!</p>
                  </div>
                ) : (
                  <RecommendationCard
                    totalWatts={totalWatts}
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
