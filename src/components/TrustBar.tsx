const categories = [
  {
    label: "Гібридні інвертори",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <rect x="4" y="12" width="40" height="28" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <path d="M18 28l6-8 4 6 4-5" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="14" y="8" width="20" height="4" rx="2" fill="#94a3b8" />
        <circle cx="36" cy="18" r="3" fill="#22c55e" />
      </svg>
    ),
  },
  {
    label: "Акумулятори LiFePO4",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <rect x="4" y="10" width="36" height="28" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="40" y="18" width="4" height="12" rx="2" fill="#94a3b8" />
        <rect x="8" y="15" width="22" height="18" rx="3" fill="#22c55e" opacity="0.6" />
        <path d="M21 20v8M17 24h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: "Сонячні панелі",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <rect x="4" y="10" width="40" height="28" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <line x1="24" y1="10" x2="24" y2="38" stroke="#94a3b8" strokeWidth="1" />
        <line x1="4" y1="24" x2="44" y2="24" stroke="#94a3b8" strokeWidth="1" />
        <rect x="6" y="12" width="8" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
        <rect x="16" y="12" width="8" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
        <rect x="26" y="12" width="8" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
        <rect x="36" y="12" width="6" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
        <rect x="6" y="26" width="8" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
        <rect x="16" y="26" width="8" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
        <rect x="26" y="26" width="8" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
        <rect x="36" y="26" width="6" height="10" rx="1" fill="#fbbf24" opacity="0.7" />
      </svg>
    ),
  },
  {
    label: "MPPT Контролери",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <rect x="6" y="8" width="36" height="32" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <circle cx="24" cy="24" r="10" stroke="#2563eb" strokeWidth="2" />
        <path d="M24 14v4M24 30v4M14 24h4M30 24h4" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" fill="#2563eb" />
      </svg>
    ),
  },
  {
    label: "Автономні системи",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <path d="M24 4L6 18v26h12V30h12v14h12V18L24 4z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M20 8l-4 8h4l-3 8 8-10h-4l4-6h-5z" fill="#2563eb" opacity="0.7" />
      </svg>
    ),
  },
  {
    label: "Мережеві інвертори",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <rect x="8" y="10" width="32" height="28" rx="4" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <path d="M16 24h16M28 18l6 6-6 6" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    label: "Моніторинг",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <rect x="6" y="8" width="36" height="26" rx="3" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <rect x="18" y="34" width="12" height="4" fill="#94a3b8" />
        <rect x="14" y="38" width="20" height="2" rx="1" fill="#94a3b8" />
        <polyline points="12,28 18,20 24,24 30,16 36,20" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
  },
  {
    label: "Аксесуари",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-[40px] h-[40px]">
        <circle cx="24" cy="24" r="16" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
        <path d="M24 16v16M16 24h16" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        <circle cx="24" cy="24" r="4" fill="#2563eb" />
      </svg>
    ),
  },
];

export default function TrustBar() {
  return (
    <section className="bg-white border-y border-gray-200">
      <div className="max-w-[1280px] mx-auto px-[24px] py-[16px]">
        <div className="flex items-center gap-[0px] overflow-x-auto scrollbar-none">
          {categories.map((c) => (
            <a
              key={c.label}
              href="#products"
              className="flex flex-col items-center gap-[8px] px-[20px] py-[8px] min-w-[100px] hover:bg-gray-50 rounded-[6px] transition-colors cursor-pointer shrink-0"
            >
              {c.icon}
              <span className="text-[11px] text-gray-600 font-medium text-center leading-tight whitespace-nowrap">
                {c.label}
              </span>
            </a>
          ))}
          {/* Scroll arrow hint */}
          <div className="shrink-0 ml-[8px] w-[32px] h-[32px] rounded-full border border-gray-300 flex items-center justify-center text-gray-500">
            <svg viewBox="0 0 24 24" fill="none" className="w-[14px] h-[14px]">
              <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
