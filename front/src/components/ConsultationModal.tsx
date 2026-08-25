"use client";

import { useEffect, useState } from "react";
import PhoneInput from "./PhoneInput";
import { submitLead } from "@/lib/api";

const inputClass =
  "w-full px-[14px] py-[10px] rounded-[6px] border border-gray-200 bg-white text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-colors placeholder:text-gray-400";

export default function ConsultationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

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
      setTimeout(() => {
        setSubmitted(false);
        setError("");
        setForm({ name: "", phone: "" });
      }, 300);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitLead({ type: "callback", name: form.name, phone: form.phone });
      setSubmitted(true);
    } catch {
      setError("Не вдалося надіслати. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-[16px]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-white rounded-[12px] shadow-2xl w-full max-w-[440px]">
        {submitted ? (
          <div className="p-[40px] text-center">
            <div className="w-[56px] h-[56px] rounded-full bg-green-50 text-green-500 flex items-center justify-center mx-auto mb-[16px]">
              <svg viewBox="0 0 24 24" fill="none" className="w-[28px] h-[28px]">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h3 className="text-[20px] font-bold text-gray-900 mb-[8px]">Дякуємо!</h3>
            <p className="text-[14px] text-gray-500 mb-[24px]">
              Наш експерт зв&apos;яжеться з вами за номером{" "}
              <span className="font-semibold text-gray-700">{form.phone}</span> найближчим часом.
            </p>
            <button
              onClick={onClose}
              className="w-full py-[12px] rounded-[8px] bg-[#FFC107] text-gray-950 text-[15px] font-semibold hover:bg-amber-400 transition-colors cursor-pointer"
            >
              Закрити
            </button>
          </div>
        ) : (
          <div className="p-[32px]">
            <div className="flex items-start justify-between mb-[20px]">
              <div>
                <h2 className="text-[20px] font-bold text-gray-900 mb-[4px]">
                  Безкоштовна консультація
                </h2>
                <p className="text-[13px] text-gray-500">
                  Наш експерт зв&apos;яжеться з вами протягом 24 годин
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-700 transition-colors cursor-pointer ml-[16px] mt-[2px] shrink-0"
                aria-label="Закрити"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
                  <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-[16px]"
            >
              <div>
                <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
                  Повне ім&apos;я *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={inputClass}
                  placeholder="Іван Петренко"
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-[13px] rounded-[8px] bg-[#FFC107] text-gray-950 text-[15px] font-semibold hover:bg-amber-400 transition-colors cursor-pointer disabled:opacity-60"
              >
                {submitting ? "Надсилаємо…" : "Замовити дзвінок"}
              </button>
              {error && (
                <p className="text-[12px] text-red-500 text-center">{error}</p>
              )}
              <p className="text-[11px] text-gray-400 text-center">
                Жодного спаму. Ми поважаємо вашу конфіденційність.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
