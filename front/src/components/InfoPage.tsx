import Link from "next/link";
import Navbar from "./Navbar";
import Footer from "./Footer";

export type InfoSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
};

export default function InfoPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: InfoSection[];
}) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-100 pt-[64px]">
        <div className="mx-auto max-w-[920px] px-[24px] py-[40px] sm:py-[56px]">
          <nav className="mb-[24px] flex items-center gap-[8px] text-[13px] text-gray-400">
            <Link href="/" className="transition-colors hover:text-gray-700">Головна</Link>
            <span>/</span>
            <span className="text-gray-700">{title}</span>
          </nav>

          <article className="rounded-[16px] border border-gray-200 bg-white px-[22px] py-[28px] shadow-sm sm:px-[48px] sm:py-[44px]">
            <p className="mb-[10px] text-[12px] font-semibold uppercase tracking-[0.12em] text-amber-700">
              Інформація для покупців
            </p>
            <h1 className="mb-[16px] text-[30px] font-bold leading-tight text-gray-950 sm:text-[36px]">{title}</h1>
            <p className="mb-[36px] text-[15px] leading-7 text-gray-600">{intro}</p>

            <div className="space-y-[32px]">
              {sections.map((section) => (
                <section key={section.title}>
                  <h2 className="mb-[12px] text-[20px] font-bold text-gray-900">{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mb-[10px] text-[14px] leading-7 text-gray-600 last:mb-0">{paragraph}</p>
                  ))}
                  {section.items && (
                    <ul className="space-y-[9px] text-[14px] leading-6 text-gray-600">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-[10px]">
                          <span className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-amber-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            <div className="mt-[40px] rounded-[12px] border border-amber-200 bg-amber-50 px-[18px] py-[16px] text-[14px] leading-6 text-gray-700">
              Потрібне уточнення? Залиште повідомлення через{" "}
              <Link href="/#contact" className="font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950">
                контактну форму
              </Link>
              , і менеджер зв&apos;яжеться з вами.
            </div>

            <p className="mt-[24px] text-[12px] text-gray-400">Останнє оновлення: 28 серпня 2026 року</p>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}
