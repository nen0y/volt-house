const featured = [
  {
    name: "VoltMax 5kW Pro",
    subtitle: "Hybrid Inverter with MPPT",
    price: "From: $1,299",
    gradient: "from-slate-900 to-slate-700",
  },
  {
    name: "PowerCell 10kWh",
    subtitle: "LiFePO4 Battery Storage",
    price: "From: $3,499",
    gradient: "from-zinc-900 to-zinc-700",
  },
  {
    name: "SunPower 400W Panel",
    subtitle: "Monocrystalline PERC",
    price: "From: $299",
    gradient: "from-stone-800 to-stone-600",
  },
  {
    name: "PowerCell 20kWh",
    subtitle: "Stackable LiFePO4 System",
    price: "From: $6,499",
    gradient: "from-neutral-900 to-neutral-700",
  },
];

export default function Benefits() {
  return (
    <section id="benefits" className="bg-gray-100 py-[32px]">
      <div className="max-w-[1280px] mx-auto px-[24px]">
        <h2 className="text-[22px] font-bold text-gray-900 mb-[16px]">What&apos;s New</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
          {featured.map((item) => (
            <div
              key={item.name}
              className={`relative rounded-[8px] overflow-hidden h-[280px] bg-gradient-to-br ${item.gradient} cursor-pointer`}
            >
              {/* Subtle grid on card */}
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  backgroundImage:
                    "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              />
              {/* Bottom gradient overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-[20px]">
                <h3 className="text-white text-[17px] font-bold leading-tight mb-[4px]">
                  {item.name}
                </h3>
                <p className="text-gray-300 text-[12px] mb-[4px]">{item.subtitle}</p>
                <div className="flex items-end justify-between mt-[12px]">
                  <p className="text-gray-400 text-[11px]">{item.price}</p>
                  <a
                    href="#products"
                    className="bg-white text-gray-900 text-[12px] font-medium rounded-full px-[16px] py-[6px] hover:bg-gray-100 transition-colors"
                  >
                    Buy Now
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
