"use client";

export default function Footer() {
  return (
    <footer className="bg-[#1c1c1c] text-white">
      <div className="max-w-[1280px] mx-auto px-[24px] py-[20px] flex flex-col sm:flex-row items-center justify-between gap-[16px]">
        {/* Logo */}
        <a href="#" className="flex items-center gap-[8px]">
          <svg viewBox="0 0 32 32" fill="none" className="w-[24px] h-[24px]">
            <rect width="32" height="32" rx="6" fill="#2563eb" />
            <path d="M18 4L9 18h7l-2 10 10-14h-7L18 4z" fill="white" />
          </svg>
          <span className="text-[16px] font-black text-white tracking-tight">
            VOLT<span className="font-light">HOUSE</span>
          </span>
        </a>

        {/* Nav links */}
        <div className="flex items-center gap-[20px]">
          <a href="#products" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Товари</a>
          <a href="#how-it-works" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Як це працює</a>
          <a href="#reviews" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Відгуки</a>
          <a href="#contact" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Контакти</a>
        </div>

        <p className="text-[11px] text-gray-600">
          &copy; 2026 VoltHouse. Всі права захищені.
        </p>
      </div>
    </footer>
  );
}
