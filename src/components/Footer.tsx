"use client";

const footerLinks = {
  "Product Categories": [
    "Home Systems",
    "Commercial Systems",
    "Solar Panels",
    "Accessories",
  ],
  "Help & Support": [
    "Payment Methods",
    "Shipping & Delivery",
    "Return Policy",
    "0% APR Financing",
  ],
  Installation: [
    "Home Installation",
    "Commercial Installation",
    "DIY Guide",
  ],
  "Buying Guides": [
    "Which Inverter to Buy",
    "Battery Sizing Guide",
    "Solar Panel Calculator",
  ],
};

export default function Footer() {
  return (
    <footer className="bg-[#1c1c1c] text-white">
      {/* Perks bar */}
      <div className="border-b border-gray-700 py-[28px]">
        <div className="max-w-[1280px] mx-auto px-[24px] flex flex-wrap justify-center gap-[48px]">
          {[
            {
              label: "Free Shipping for USA",
              icon: (
                <svg viewBox="0 0 32 32" fill="none" className="w-[32px] h-[32px] text-gray-300">
                  <path d="M2 22h2m24 0h2M4 22V12l6-8h14l6 8v10M4 22h24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="10" cy="25" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="22" cy="25" r="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M14 4v10H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ),
            },
            {
              label: "We accept credit cards and bank transfers",
              icon: (
                <svg viewBox="0 0 32 32" fill="none" className="w-[32px] h-[32px] text-gray-300">
                  <rect x="3" y="7" width="26" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M3 13h26" stroke="currentColor" strokeWidth="1.5" />
                  <rect x="7" y="18" width="8" height="3" rx="1" fill="currentColor" opacity="0.5" />
                </svg>
              ),
            },
          ].map((perk) => (
            <div key={perk.label} className="flex flex-col items-center gap-[8px] text-center">
              {perk.icon}
              <span className="text-[12px] text-gray-400 max-w-[140px] leading-tight">
                {perk.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Link columns */}
      <div className="max-w-[1280px] mx-auto px-[24px] py-[48px] grid grid-cols-2 md:grid-cols-4 gap-[32px]">
        {Object.entries(footerLinks).map(([group, items]) => (
          <div key={group}>
            <h5 className="text-[12px] font-semibold text-gray-300 uppercase tracking-wider mb-[16px]">
              {group}
            </h5>
            <ul className="space-y-[10px]">
              {items.map((item) => (
                <li key={item}>
                  <a href="#" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-700">
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

          <div className="flex items-center gap-[20px]">
            <a href="#" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Who We Are</a>
            <a href="#contact" className="text-[13px] text-gray-500 hover:text-gray-300 transition-colors">Contact Us</a>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-[16px]">
            {["IG", "in", "YT"].map((s) => (
              <a key={s} href="#" className="text-[12px] text-gray-500 hover:text-gray-300 transition-colors font-medium">
                {s}
              </a>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-800">
          <div className="max-w-[1280px] mx-auto px-[24px] py-[14px] flex flex-col sm:flex-row items-center justify-between gap-[8px]">
            <p className="text-[11px] text-gray-600">
              Copyright &copy; 2026 VoltHouse. All Rights Reserved.
            </p>
            <div className="flex gap-[16px]">
              <a href="#" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">Privacy Policy</a>
              <span className="text-gray-700">·</span>
              <a href="#" className="text-[11px] text-gray-600 hover:text-gray-400 transition-colors">Terms of Use</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
