"use client";

import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#1c1c1c] text-white">
      <div className="max-w-[1280px] mx-auto px-[24px] py-[20px] flex flex-col sm:flex-row items-center justify-between gap-[16px]">
        {/* Logo */}
        <a href="#" className="flex items-center" aria-label="E-Kit — на початок сторінки">
          <Image src="/brand/e-kit-logo-white.svg" alt="E-Kit" width={160} height={56} className="w-[124px] h-auto" />
        </a>

        {/* Nav links */}
        <div className="flex items-center gap-[20px]">
          <a href="#products" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Товари</a>
          <a href="#how-it-works" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Як це працює</a>
          <a href="#reviews" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Відгуки</a>
          <a href="#contact" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Контакти</a>
        </div>

        <p className="text-[11px] text-gray-600">
          &copy; 2026 E-Kit. Всі права захищені.
        </p>
      </div>
    </footer>
  );
}
