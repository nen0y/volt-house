const steps = [
  {
    step: "01",
    title: "Free Energy Audit",
    desc: "Share your monthly electricity usage and roof details. Our engineers design a custom system for your home.",
  },
  {
    step: "02",
    title: "System Design",
    desc: "We match you with the right inverter, battery capacity, and panel count based on your goals.",
  },
  {
    step: "03",
    title: "Order & Delivery",
    desc: "Order online with 0% APR financing. Components ship from US warehouses in 3–5 business days.",
  },
  {
    step: "04",
    title: "Professional Install",
    desc: "NABCEP-certified installers handle mounting, wiring, permits, and utility interconnection.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-[56px]">
      <div className="max-w-[1280px] mx-auto px-[24px]">
        <h2 className="text-[22px] font-bold text-gray-900 mb-[8px]">
          How It Works
        </h2>
        <p className="text-[14px] text-gray-500 mb-[40px]">
          From order to power in as little as 2 weeks.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
          {steps.map((s) => (
            <div key={s.step} className="flex flex-col">
              <div className="w-[48px] h-[48px] rounded-full border-2 border-gray-200 text-gray-400 text-[16px] font-bold flex items-center justify-center mb-[16px]">
                {s.step}
              </div>
              <h3 className="text-[15px] font-semibold text-gray-900 mb-[8px]">
                {s.title}
              </h3>
              <p className="text-[13px] text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
