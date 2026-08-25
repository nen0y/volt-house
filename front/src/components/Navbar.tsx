"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import SearchModal from "./SearchModal";
import CartDrawer from "./CartDrawer";
import PowerCalculatorModal from "./PowerCalculatorModal";
import ConsultationModal from "./ConsultationModal";
import { useCart } from "@/context/CartContext";

const navLinks = [
  { label: "Товари",         href: "/products" },
  { label: "Як це працює",   href: "/#how-it-works" },
  { label: "Відгуки",        href: "/#reviews" },
  { label: "Контакти",       href: "/#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const [consultOpen, setConsultOpen] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    let rafId: number;
    const onScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => setScrolled(window.scrollY > 10));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <>
      <SearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
      <CartDrawer isOpen={cartOpen} onClose={() => setCartOpen(false)} />
      <PowerCalculatorModal isOpen={calcOpen} onClose={() => setCalcOpen(false)} />
      <ConsultationModal isOpen={consultOpen} onClose={() => setConsultOpen(false)} />

      <div className="fixed top-0 inset-x-0 z-50">
        <nav
          className={`bg-white border-b border-gray-200 transition-[box-shadow] duration-200 ${
            scrolled ? "shadow-sm" : ""
          }`}
        >
          <div className="max-w-[1280px] mx-auto px-[24px] h-[64px] flex items-center justify-between gap-[32px]">
            {/* Logo → home */}
            <Link href="/" className="flex items-center shrink-0" aria-label="E-Kit — на головну">
              <Image
                src="/brand/e-kit-logo.svg"
                alt="E-Kit"
                width={160}
                height={56}
                priority
                className="w-[116px] sm:w-[132px] h-auto"
              />
            </Link>

            {/* Desktop nav */}
            <div className="hidden lg:flex items-center gap-[28px] flex-1 justify-center">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  className="text-[14px] text-gray-700 hover:text-gray-900 font-medium transition-colors whitespace-nowrap"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* CTAs */}
            <div className="hidden lg:flex items-center gap-[8px] shrink-0">
              <button
                onClick={() => setConsultOpen(true)}
                className="flex items-center gap-[6px] border border-amber-500 text-gray-900 hover:bg-amber-50 text-[13px] font-semibold px-[14px] py-[8px] rounded-full transition-colors cursor-pointer whitespace-nowrap"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-[13px] h-[13px]">
                  <path d="M3 3.5c0 5 4.5 9.5 9.5 9.5l1-2.2-2.6-1-1 1a7 7 0 01-3.2-3.2l1-1L6.7 3.5H4.5A1.5 1.5 0 003 3.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                Зворотний дзвінок
              </button>
              <button
                onClick={() => setCalcOpen(true)}
                className="flex items-center gap-[6px] bg-[#FFC107] hover:bg-amber-400 text-gray-950 text-[13px] font-semibold px-[16px] py-[8px] rounded-full transition-colors cursor-pointer whitespace-nowrap"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-[13px] h-[13px]">
                  <rect x="2" y="1" width="12" height="14" rx="2" stroke="white" strokeWidth="1.4" />
                  <path d="M5 5h6M5 8h6M5 11h3" stroke="white" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                Підібрати систему
              </button>
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-[20px] shrink-0">
              <button
                className="text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                aria-label="Пошук"
                onClick={() => setSearchOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]">
                  <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
              </button>

              <button
                className="text-gray-700 hover:text-gray-900 transition-colors relative cursor-pointer"
                aria-label="Кошик"
                onClick={() => setCartOpen(true)}
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {count > 0 && (
                  <span className="absolute -top-[6px] -right-[6px] bg-[#FFC107] text-gray-950 text-[9px] font-bold w-[16px] h-[16px] rounded-full flex items-center justify-center">
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>

              <button
                className="lg:hidden text-gray-700 hover:text-gray-900 transition-colors cursor-pointer"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Меню"
              >
                <svg viewBox="0 0 24 24" fill="none" className="w-[22px] h-[22px]">
                  {menuOpen ? (
                    <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  ) : (
                    <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile menu */}
          {menuOpen && (
            <div className="lg:hidden bg-white border-t border-gray-100 px-[24px] py-[16px] flex flex-col gap-[16px]">
              {navLinks.map((l) => (
                <Link
                  key={l.label}
                  href={l.href}
                  onClick={() => setMenuOpen(false)}
                  className="text-[15px] text-gray-700 hover:text-gray-900 font-medium transition-colors"
                >
                  {l.label}
                </Link>
              ))}
              <button
                onClick={() => { setMenuOpen(false); setCalcOpen(true); }}
                className="flex items-center gap-[8px] text-[15px] font-semibold text-blue-600 cursor-pointer text-left"
              >
                ⚡ Підібрати систему
              </button>
              <button
                onClick={() => { setMenuOpen(false); setConsultOpen(true); }}
                className="flex items-center gap-[8px] text-[15px] font-semibold text-blue-600 cursor-pointer text-left"
              >
                📞 Зворотний дзвінок
              </button>
            </div>
          )}
        </nav>
      </div>
    </>
  );
}
