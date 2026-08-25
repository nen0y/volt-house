"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import PhoneInput from "./PhoneInput";
import { submitLead } from "@/lib/api";

const categoryIcon: Record<string, string> = {
  inverter: "⚡",
  battery: "🔋",
  solar: "☀️",
  station: "🔌",
};

type Step = "cart" | "checkout" | "success";

const inputClass =
  "w-full px-[14px] py-[10px] rounded-[6px] border border-gray-200 bg-white text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors placeholder:text-gray-400";

export default function CartDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { items, remove, update, total, count, clear } = useCart();
  const [step, setStep] = useState<Step>("cart");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  // Reset to cart view whenever drawer re-opens
  useEffect(() => {
    if (isOpen) setStep("cart");
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    // Delay reset so animation finishes
    setTimeout(() => {
      setStep("cart");
      setForm({ name: "", phone: "" });
      setError("");
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitLead({
        type: "order",
        name: form.name,
        phone: form.phone,
        total,
        items: items.map(({ product, quantity }) => ({
          id: product.id,
          name: product.name,
          price: product.price,
          quantity,
        })),
      });
      setStep("success");
      clear();
    } catch {
      setError("Не вдалося оформити замовлення. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[90] bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-[420px] z-[95] bg-white shadow-2xl flex flex-col transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-[24px] py-[20px] border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-[10px]">
            {step === "checkout" && (
              <button
                onClick={() => setStep("cart")}
                className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer mr-[4px]"
                aria-label="Назад до кошика"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[18px] h-[18px]">
                  <path d="M19 12H5M11 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <h2 className="text-[18px] font-bold text-gray-900">
              {step === "cart" && "Кошик"}
              {step === "checkout" && "Оформлення замовлення"}
              {step === "success" && "Замовлення прийнято"}
            </h2>
            {step === "cart" && count > 0 && (
              <span className="bg-amber-100 text-amber-900 text-[11px] font-bold px-[8px] py-[2px] rounded-full">
                {count}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
            aria-label="Закрити кошик"
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
              <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* ── CART STEP ── */}
        {step === "cart" && (
          <>
            <div className="flex-1 overflow-y-auto px-[24px] py-[16px]">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-[16px] text-center">
                  <svg viewBox="0 0 48 48" fill="none" className="w-[56px] h-[56px] text-gray-300">
                    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <div>
                    <p className="text-[15px] font-semibold text-gray-900 mb-[4px]">Кошик порожній</p>
                    <p className="text-[13px] text-gray-400">Додайте товари, щоб продовжити</p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-[8px] text-[13px] font-medium text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                  >
                    Продовжити покупки →
                  </button>
                </div>
              ) : (
                <ul className="space-y-[16px]">
                  {items.map(({ product, quantity }) => (
                    <li key={product.id} className="flex gap-[14px] bg-gray-50 rounded-[8px] p-[14px]">
                      <div className="w-[56px] h-[56px] bg-white rounded-[6px] border border-gray-100 flex items-center justify-center text-[24px] shrink-0">
                        {categoryIcon[product.category] ?? "📦"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-gray-900 leading-snug mb-[2px] line-clamp-2">
                          {product.name}
                        </p>
                        <p className="text-[12px] text-gray-400 mb-[10px]">
                          ${product.price.toLocaleString("en-US")} / шт.
                        </p>
                        <div className="flex items-center gap-[8px]">
                          <button
                            onClick={() => update(product.id, quantity - 1)}
                            className="w-[28px] h-[28px] rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 transition-colors text-[16px] leading-none cursor-pointer"
                          >
                            −
                          </button>
                          <span className="text-[14px] font-medium text-gray-900 w-[20px] text-center">
                            {quantity}
                          </span>
                          <button
                            onClick={() => update(product.id, quantity + 1)}
                            className="w-[28px] h-[28px] rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:border-gray-400 transition-colors text-[16px] leading-none cursor-pointer"
                          >
                            +
                          </button>
                          <button
                            onClick={() => remove(product.id)}
                            className="ml-auto text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                            aria-label="Видалити"
                          >
                            <svg viewBox="0 0 16 16" fill="none" className="w-[14px] h-[14px]">
                              <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 9h8l1-9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="text-[14px] font-bold text-gray-900 shrink-0 pt-[2px]">
                        ${(product.price * quantity).toLocaleString("en-US")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-gray-100 px-[24px] py-[20px] space-y-[12px] shrink-0">
                <div className="flex justify-between text-[15px]">
                  <span className="text-gray-500">Разом</span>
                  <span className="font-bold text-gray-900">${total.toLocaleString("en-US")}</span>
                </div>
                <button
                  onClick={() => setStep("checkout")}
                  className="w-full py-[13px] rounded-[8px] bg-[#FFC107] text-gray-950 text-[15px] font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
                >
                  Оформити замовлення
                </button>
                <button
                  onClick={handleClose}
                  className="w-full py-[11px] rounded-[8px] border border-gray-200 text-gray-700 text-[14px] font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Продовжити покупки
                </button>
              </div>
            )}
          </>
        )}

        {/* ── CHECKOUT STEP ── */}
        {step === "checkout" && (
          <>
            {/* Order summary */}
            <div className="px-[24px] py-[16px] bg-gray-50 border-b border-gray-100 shrink-0">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-[10px]">
                Ваше замовлення
              </p>
              <ul className="space-y-[6px]">
                {items.map(({ product, quantity }) => (
                  <li key={product.id} className="flex justify-between text-[13px]">
                    <span className="text-gray-700 line-clamp-1 flex-1 mr-[8px]">
                      {product.name} × {quantity}
                    </span>
                    <span className="font-semibold text-gray-900 shrink-0">
                      ${(product.price * quantity).toLocaleString("en-US")}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between text-[14px] font-bold text-gray-900 mt-[12px] pt-[10px] border-t border-gray-200">
                <span>Разом</span>
                <span>${total.toLocaleString("en-US")}</span>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="flex-1 flex flex-col px-[24px] py-[24px] gap-[16px] overflow-y-auto"
            >
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
                  Повне ім&apos;я *
                </label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Іван Петренко"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
                  Номер телефону *
                </label>
                <PhoneInput
                  required
                  value={form.phone}
                  onChange={(val) => setForm({ ...form, phone: val })}
                  className={inputClass}
                />
              </div>

              <p className="text-[11px] text-gray-400">
                Наш менеджер зв&apos;яжеться з вами для підтвердження замовлення та узгодження доставки.
              </p>

              {error && (
                <p className="text-[12px] text-red-500">{error}</p>
              )}

              <div className="mt-auto space-y-[10px]">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-[13px] rounded-[8px] bg-[#FFC107] text-gray-950 text-[15px] font-semibold hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Оформлюємо…" : "Підтвердити замовлення"}
                </button>
                <button
                  type="button"
                  onClick={() => setStep("cart")}
                  className="w-full py-[11px] rounded-[8px] border border-gray-200 text-gray-700 text-[14px] font-medium hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  ← Повернутись до кошика
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === "success" && (
          <div className="flex-1 flex flex-col items-center justify-center px-[24px] text-center gap-[16px]">
            <div className="w-[64px] h-[64px] rounded-full bg-green-50 text-green-500 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" className="w-[32px] h-[32px]">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <h3 className="text-[20px] font-bold text-gray-900 mb-[8px]">
                Дякуємо, {form.name.split(" ")[0]}!
              </h3>
              <p className="text-[14px] text-gray-500 leading-relaxed">
                Ваше замовлення прийнято. Менеджер зв&apos;яжеться з вами за номером{" "}
                <span className="font-semibold text-gray-700">{form.phone}</span> найближчим часом.
              </p>
            </div>
            <button
              onClick={handleClose}
              className="mt-[8px] w-full py-[13px] rounded-[8px] bg-[#FFC107] text-gray-950 text-[15px] font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Закрити
            </button>
          </div>
        )}
      </div>
    </>
  );
}
