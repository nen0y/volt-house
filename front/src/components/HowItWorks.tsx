"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchContent } from "@/lib/api";

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
    desc: "Оформлюйте замовлення онлайн. Компоненти відправляються зі складів в Україні протягом 3–5 робочих днів.",
  },
  {
    step: "04",
    title: "Встановлення за потреби",
    desc: "За бажанням наші сертифіковані монтажники виконають встановлення та підключення. Це необов'язкова послуга — обладнання готове й до самостійного монтажу.",
  },
];

export default function HowItWorks() {
  const { data: content } = useQuery({ queryKey: ["content"], queryFn: fetchContent });
  const block = content?.["how_it_works"];
  const heading = block?.heading || "Як це працює";
  const subheading = block?.subheading || "Від замовлення до підключення — швидко та без зайвих турбот.";

  return (
    <section id="how-it-works" className="bg-white py-[56px]">
      <div className="max-w-[1280px] mx-auto px-[24px]">
        <h2 className="text-[22px] font-bold text-gray-900 mb-[8px]">{heading}</h2>
        <p className="text-[14px] text-gray-500 mb-[40px]">{subheading}</p>

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
