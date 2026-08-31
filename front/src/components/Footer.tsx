"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { fetchTestimonials } from "@/lib/api";

const footerLinks = [
  { label: "Товари", href: "/products" },
  { label: "Категорії", href: "/#categories" },
  { label: "Як це працює", href: "/#how-it-works" },
  { label: "Відгуки", href: "/#reviews" },
  { label: "Контакти", href: "/#contact" },
];

const policyLinks = [
  { label: "Доставка й оплата", href: "/delivery-payment" },
  { label: "Повернення", href: "/returns" },
  { label: "Конфіденційність", href: "/privacy" },
  { label: "Умови", href: "/terms" },
];

export default function Footer() {
  // Hide the "Відгуки" link when there are no reviews (the section is hidden too).
  const { data: reviews } = useQuery({ queryKey: ["testimonials"], queryFn: fetchTestimonials });
  const links =
    reviews && reviews.length > 0 ? footerLinks : footerLinks.filter((l) => l.href !== "#reviews");

  return (
    <footer className="bg-[#1c1c1c] text-white">
      <div className="max-w-[1280px] mx-auto px-[24px] py-[24px] flex flex-col items-center gap-[16px]">
        {/* Logo */}
        <a href="#" className="flex items-center" aria-label="E-Kit — на початок сторінки">
          <Image src="/brand/e-kit-logo-white.svg" alt="E-Kit" width={160} height={56} className="w-[124px] h-auto" />
        </a>

        {/* Nav links */}
        <div className="flex flex-wrap items-center justify-center gap-x-[20px] gap-y-[8px]">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-[18px] gap-y-[8px] border-t border-white/10 pt-[14px]">
          {policyLinks.map((link) => (
            <a key={link.href} href={link.href} className="text-[12px] text-gray-400 transition-colors hover:text-white">
              {link.label}
            </a>
          ))}
        </div>

        <p className="max-w-[760px] text-center text-[11px] leading-relaxed text-gray-400">
          Усі ціни на сайті є орієнтовними. Фактична вартість може відрізнятися залежно від партії постачання, курсу валют і наявності товару. Остаточну ціну підтверджує менеджер під час оформлення замовлення.
        </p>

        <p className="text-[11px] text-gray-600">
          &copy; 2026 E-Kit. Всі права захищені.
        </p>
      </div>
    </footer>
  );
}
