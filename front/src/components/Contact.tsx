"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchContent } from "@/lib/api";
import LeadCaptureForm from "./LeadCaptureForm";

export default function Contact() {
  const { data: content } = useQuery({ queryKey: ["content"], queryFn: fetchContent });
  const block = content?.["contact"];
  const heading = block?.heading || "Отримати безкоштовну консультацію";
  const subheading =
    block?.subheading || "Без зобов'язань. Наші експерти розроблять систему під ваш дім та бюджет.";

  return (
    <section id="contact" className="bg-white py-[64px] pb-[100px] lg:pb-[64px]">
      <div className="mx-auto max-w-[760px] px-[20px] sm:px-[24px]">
        <div className="rounded-[20px] border border-gray-200 bg-gray-50 p-[24px] shadow-sm sm:p-[36px]">
          <LeadCaptureForm source="contact" title={heading} description={subheading} buttonLabel="Отримати консультацію" />
        </div>
      </div>
    </section>
  );
}
