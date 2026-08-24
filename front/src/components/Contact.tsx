"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import PhoneInput from "./PhoneInput";
import { submitLead, fetchContent } from "@/lib/api";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    interest: "full-system",
    message: "",
  });

  const { data: content } = useQuery({ queryKey: ["content"], queryFn: fetchContent });
  const block = content?.["contact"];
  const heading = block?.heading || "Отримати безкоштовну консультацію";
  const subheading =
    block?.subheading || "Без зобов'язань. Наші експерти розроблять систему під ваш дім та бюджет.";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitLead({
        type: "consultation",
        name: form.name,
        phone: form.phone,
        interest: form.interest,
        message: form.message || undefined,
      });
      setSubmitted(true);
    } catch {
      setError("Не вдалося надіслати заявку. Спробуйте ще раз.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="contact" className="bg-white py-[56px]">
        <div className="max-w-[560px] mx-auto px-[24px] text-center">
          <div className="w-[56px] h-[56px] rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-[16px]">
            <svg viewBox="0 0 24 24" fill="none" className="w-[28px] h-[28px]">
              <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="text-[22px] font-bold text-gray-900 mb-[8px]">
            Ми зв&apos;яжемося з вами!
          </h3>
          <p className="text-[14px] text-gray-500">
            Дякуємо, {form.name.split(" ")[0]}! Наш енергетичний експерт зв&apos;яжеться з вами протягом 24 годин.
          </p>
        </div>
      </section>
    );
  }

  const inputClass =
    "w-full px-[14px] py-[10px] rounded-[6px] border border-gray-200 bg-white text-[14px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors placeholder:text-gray-400";

  return (
    <section id="contact" className="bg-white py-[56px]">
      <div className="max-w-[640px] mx-auto px-[24px]">
        <h2 className="text-[22px] font-bold text-gray-900 mb-[4px]">{heading}</h2>
        <p className="text-[14px] text-gray-500 mb-[32px]">{subheading}</p>

        <form onSubmit={handleSubmit} className="space-y-[16px]">
          <div className="grid sm:grid-cols-2 gap-[16px]">
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
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
                Телефон
              </label>
              <PhoneInput
                value={form.phone}
                onChange={(val) => setForm({ ...form, phone: val })}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
              Мене цікавить
            </label>
            <select
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              className={inputClass}
            >
              <option value="full-system">Повна сонячна + акумуляторна система</option>
              <option value="battery-only">Тільки резервний акумулятор</option>
              <option value="solar-only">Тільки сонячні панелі</option>
              <option value="inverter">Оновлення інвертора</option>
              <option value="consultation">Просто консультація</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
              Повідомлення
            </label>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="Розкажіть про ваш дім та потреби в електроенергії..."
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-[12px] rounded-[6px] bg-blue-600 text-white text-[15px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {submitting ? "Надсилаємо…" : "Отримати безкоштовну консультацію"}
          </button>

          {error && (
            <p className="text-[12px] text-red-500 text-center">{error}</p>
          )}

          <p className="text-[11px] text-gray-400 text-center">
            Жодного спаму. Ми поважаємо вашу конфіденційність.
          </p>
        </form>
      </div>
    </section>
  );
}
