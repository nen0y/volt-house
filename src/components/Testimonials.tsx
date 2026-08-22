import type { Testimonial } from "@/types";

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} viewBox="0 0 16 16" fill="none" className="w-[14px] h-[14px] text-blue-500">
          <path
            d="M8 1l1.85 3.75L14 5.5l-3 2.92.71 4.13L8 10.5l-3.71 1.95.71-4.13L2 5.5l4.15-.75L8 1z"
            fill="currentColor"
          />
        </svg>
      ))}
    </div>
  );
}

export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  return (
    <section id="reviews" className="bg-gray-100 py-[56px]">
      <div className="max-w-[1280px] mx-auto px-[24px]">
        <h2 className="text-[22px] font-bold text-gray-900 mb-[8px]">
          Відгуки клієнтів
        </h2>
        <p className="text-[14px] text-gray-500 mb-[32px]">
          Реальні відгуки клієнтів, які обрали VoltHouse для захисту від відключень.
        </p>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-[12px]">
          {testimonials.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-[6px] border border-gray-100 p-[20px] flex flex-col"
            >
              <Stars count={t.rating} />
              <p className="text-[13px] text-gray-600 leading-relaxed mt-[12px] mb-[16px] flex-1 italic">
                &ldquo;{t.text}&rdquo;
              </p>
              <div className="border-t border-gray-100 pt-[12px] flex items-center gap-[10px]">
                <div className="w-[36px] h-[36px] rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-gray-900">{t.name}</div>
                  <div className="text-[11px] text-gray-400">{t.location}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
