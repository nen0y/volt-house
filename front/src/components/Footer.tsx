"use client";

import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { fetchTestimonials } from "@/lib/api";

const footerLinks = [
  { label: "Товари", href: "#products" },
  { label: "Категорії", href: "#categories" },
  { label: "Як це працює", href: "#how-it-works" },
  { label: "Відгуки", href: "#reviews" },
  { label: "Контакти", href: "#contact" },
];

export default function Footer() {
  // Hide the "Відгуки" link when there are no reviews (the section is hidden too).
  const { data: reviews } = useQuery({ queryKey: ["testimonials"], queryFn: fetchTestimonials });
  const links =
    reviews && reviews.length > 0 ? footerLinks : footerLinks.filter((l) => l.href !== "#reviews");

  return (
    <footer className="bg-[#1c1c1c] text-white">
      <div className="max-w-[1280px] mx-auto px-[24px] py-[20px] flex flex-col sm:flex-row items-center justify-between gap-[16px]">
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

        <p className="text-[11px] text-gray-600">
          &copy; 2026 E-Kit. Всі права захищені.
        </p>
      </div>
    </footer>
  );
}
