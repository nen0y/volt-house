export default function Hero() {
  return (
    <section className="pt-[112px] pb-[0px] bg-gray-100">
      <div className="max-w-[1280px] mx-auto px-[24px] pb-[24px]">
        {/* Cinematic banner */}
        <div className="relative rounded-[8px] overflow-hidden h-[500px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700">
          {/* Subtle grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage:
                "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
              backgroundSize: "50px 50px",
            }}
          />

          {/* Right side decorative power system illustration */}
          <div className="absolute right-[5%] top-1/2 -translate-y-1/2 opacity-20">
            <svg viewBox="0 0 300 300" fill="none" className="w-[400px] h-[400px]">
              <rect x="60" y="80" width="180" height="140" rx="12" fill="white" />
              <rect x="80" y="100" width="60" height="100" rx="4" fill="white" opacity="0.3" />
              <rect x="160" y="100" width="60" height="100" rx="4" fill="white" opacity="0.3" />
              <path d="M150 40L120 90h25L130 160l60-80h-25L150 40z" fill="white" />
              <circle cx="150" cy="240" r="30" stroke="white" strokeWidth="3" />
              <path d="M140 240l8 8 16-16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Text overlay bottom-left */}
          <div className="absolute bottom-0 left-0 right-0 p-[40px]">
            <p className="text-gray-400 text-[13px] mb-[8px] font-medium uppercase tracking-wider">Featured</p>
            <h1 className="text-white text-[36px] font-bold leading-tight mb-[6px]">
              VoltMax 5kW Hybrid Inverter
            </h1>
            <p className="text-gray-300 text-[14px] mb-[6px]">
              Keep Your Home Powered Through Any Outage
            </p>
            <p className="text-gray-400 text-[12px] mb-[24px]">From: $1,299 incl. VAT</p>
            <a
              href="#products"
              className="inline-block bg-white text-gray-900 text-[14px] font-medium rounded-full px-[28px] py-[10px] hover:bg-gray-100 transition-colors"
            >
              Buy Now
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
