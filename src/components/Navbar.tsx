"use client";

import { useState, useEffect } from "react";

const navLinks = [
  { label: "Home Systems", href: "#products" },
  { label: "Commercial", href: "#products" },
  { label: "Solar Panels", href: "#products" },
  { label: "Installation", href: "#how-it-works" },
  { label: "About Us", href: "#benefits" },
  { label: "Contact Us", href: "#contact" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
    <div className="fixed top-0 inset-x-0 z-50">
      {/* Announcement bar */}
      <div className="bg-gray-700 text-white text-[12px] px-[24px] py-[7px] flex items-center justify-between">
        <div className="flex items-center gap-[20px]">
          <span>📞 +1 800 123 4567</span>
          <span>✉ hello@volthouse.com</span>
        </div>
        <span>🌍 USA (English / USD)</span>
      </div>

      {/* Main navbar */}
      <nav
        className={`bg-white border-b border-gray-200 transition-[box-shadow] duration-200 ${
          scrolled ? "shadow-sm" : ""
        }`}
      >
        <div className="max-w-[1280px] mx-auto px-[24px] h-[64px] flex items-center justify-between gap-[32px]">
          {/* Logo */}
          <a href="#" className="flex items-center gap-[8px] shrink-0">
            <svg viewBox="0 0 32 32" fill="none" className="w-[28px] h-[28px]">
              <rect width="32" height="32" rx="6" fill="#2563eb" />
              <path
                d="M18 4L9 18h7l-2 10 10-14h-7L18 4z"
                fill="white"
              />
            </svg>
            <span className="text-[18px] font-black text-gray-900 tracking-tight leading-none">
              VOLT<span className="font-light">HOUSE</span>
            </span>
          </a>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-[28px] flex-1 justify-center">
            {navLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                className="text-[14px] text-gray-700 hover:text-gray-900 font-medium transition-colors whitespace-nowrap"
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-[20px] shrink-0">
            <button className="text-gray-700 hover:text-gray-900 transition-colors" aria-label="Search">
              <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]">
                <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
                <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <button className="text-gray-700 hover:text-gray-900 transition-colors relative" aria-label="Cart">
              <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M16 10a4 4 0 01-8 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="text-gray-700 hover:text-gray-900 transition-colors" aria-label="Account">
              <svg viewBox="0 0 24 24" fill="none" className="w-[20px] h-[20px]">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
            <button
              className="lg:hidden text-gray-700 hover:text-gray-900 transition-colors"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
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
              <a
                key={l.label}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="text-[15px] text-gray-700 hover:text-gray-900 font-medium transition-colors"
              >
                {l.label}
              </a>
            ))}
          </div>
        )}
      </nav>
    </div>
  );
}
