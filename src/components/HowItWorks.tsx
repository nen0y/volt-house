const steps = [
  {
    step: "01",
    title: "Безкоштовний енергоаудит",
    desc: "Поділіться вашим місячним споживанням електроенергії та даними про дах. Наші інженери розроблять індивідуальну систему для вашого дому.",
  },
  {
    step: "02",
    title: "Проектування системи",
    desc: "Ми підберемо оптимальний інвертор, ємність акумулятора та кількість панелей відповідно до ваших потреб.",
  },
  {
    step: "03",
    title: "Замовлення та доставка",
    desc: "Замовляйте онлайн з можливістю розстрочки. Компоненти відправляються зі складів в Україні протягом 3–5 робочих днів.",
  },
  {
    step: "04",
    title: "Професійний монтаж",
    desc: "Сертифіковані монтажники займаються встановленням, підключенням та узгодженням з постачальником електроенергії.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-[56px]">
      <div className="max-w-[1280px] mx-auto px-[24px]">
        <h2 className="text-[22px] font-bold text-gray-900 mb-[8px]">
          Як це працює
        </h2>
        <p className="text-[14px] text-gray-500 mb-[40px]">
          Від замовлення до підключення — всього за 2 тижні.
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
