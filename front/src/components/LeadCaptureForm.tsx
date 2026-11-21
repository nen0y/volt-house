"use client";

import { useState } from "react";
import PhoneInput from "./PhoneInput";
import { submitLead } from "@/lib/api";

type LeadCaptureFormProps = {
  source: string;
  title?: string;
  description?: string;
  buttonLabel?: string;
  dark?: boolean;
};

export default function LeadCaptureForm({
  source,
  title = "Отримати безкоштовний підбір",
  description = "Залиште номер — уточнимо потребу й запропонуємо сумісне рішення.",
  buttonLabel = "Підібрати систему",
  dark = false,
}: LeadCaptureFormProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const inputClass = `w-full rounded-[10px] border px-[15px] py-[13px] text-[16px] outline-none transition focus:ring-2 focus:ring-amber-400 ${
    dark
      ? "border-white/15 bg-white/10 text-white placeholder:text-slate-400 focus:border-amber-400"
      : "border-gray-200 bg-white text-gray-950 placeholder:text-gray-400 focus:border-amber-400"
  }`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitLead({
        type: "consultation",
        name: name.trim() || "Клієнт із сайту",
        phone,
        interest: source,
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
      <div className={`rounded-[16px] p-[28px] text-center ${dark ? "bg-white/10 text-white" : "border border-green-200 bg-green-50 text-gray-950"}`} role="status">
        <div className="mx-auto mb-[14px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-green-500 text-white">
          <svg viewBox="0 0 24 24" fill="none" className="h-[26px] w-[26px]" aria-hidden="true">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 className="text-[21px] font-bold">Заявку отримали</h3>
        <p className={`mt-[8px] text-[15px] leading-relaxed ${dark ? "text-slate-300" : "text-gray-600"}`}>
          Зателефонуємо на <span className="font-semibold">{phone}</span> і допоможемо з вибором.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-[13px]">
      <div className="mb-[18px]">
        <h2 className={`text-[22px] font-bold ${dark ? "text-white" : "text-gray-950"}`}>{title}</h2>
        <p className={`mt-[6px] text-[15px] leading-relaxed ${dark ? "text-slate-300" : "text-gray-600"}`}>{description}</p>
      </div>

      <label className="sr-only" htmlFor={`${source}-name`}>Як до вас звертатися</label>
      <input
        id={`${source}-name`}
        type="text"
        autoComplete="name"
        value={name}
        onChange={(event) => setName(event.target.value)}
        className={inputClass}
        placeholder="Ваше ім’я (необов’язково)"
      />

      <label className="sr-only" htmlFor={`${source}-phone`}>Номер телефону</label>
      <PhoneInput
        id={`${source}-phone`}
        required
        value={phone}
        onChange={setPhone}
        className={inputClass}
      />

      <button
        type="submit"
        disabled={submitting}
        className="min-h-[50px] w-full rounded-[10px] bg-[#FFC107] px-[20px] text-[16px] font-bold text-gray-950 shadow-[0_10px_24px_rgba(255,193,7,0.18)] transition hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
      >
        {submitting ? "Надсилаємо…" : buttonLabel}
      </button>

      {error && <p className="text-center text-[14px] text-red-500" role="alert">{error}</p>}
      <p className={`text-center text-[13px] ${dark ? "text-slate-400" : "text-gray-500"}`}>
        Безкоштовно · без спаму · ні до чого не зобов’язує
      </p>
    </form>
  );
}
