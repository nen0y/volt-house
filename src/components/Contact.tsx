"use client";

import { useState } from "react";

export default function Contact() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    interest: "full-system",
    message: "",
  });

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
            We&apos;ll be in touch!
          </h3>
          <p className="text-[14px] text-gray-500">
            Thanks, {form.name.split(" ")[0]}! An energy expert will contact you within 24 hours.
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
        <h2 className="text-[22px] font-bold text-gray-900 mb-[4px]">
          Get a Free Quote
        </h2>
        <p className="text-[14px] text-gray-500 mb-[32px]">
          No pressure. Our experts will design a system tailored to your home and budget.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} className="space-y-[16px]">
          <div className="grid sm:grid-cols-2 gap-[16px]">
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputClass}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
                placeholder="(555) 000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className={inputClass}
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
              I&apos;m interested in
            </label>
            <select
              value={form.interest}
              onChange={(e) => setForm({ ...form, interest: e.target.value })}
              className={inputClass}
            >
              <option value="full-system">Complete Solar + Battery System</option>
              <option value="battery-only">Battery Backup Only</option>
              <option value="solar-only">Solar Panels Only</option>
              <option value="inverter">Inverter Upgrade</option>
              <option value="consultation">Just a Consultation</option>
            </select>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-gray-700 mb-[6px] uppercase tracking-wide">
              Message
            </label>
            <textarea
              rows={3}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className={`${inputClass} resize-none`}
              placeholder="Tell us about your home and energy needs..."
            />
          </div>

          <button
            type="submit"
            className="w-full py-[12px] rounded-[6px] bg-blue-600 text-white text-[15px] font-semibold hover:bg-blue-700 transition-colors"
          >
            Get My Free Quote
          </button>

          <p className="text-[11px] text-gray-400 text-center">
            No spam ever. We respect your privacy.
          </p>
        </form>
      </div>
    </section>
  );
}
