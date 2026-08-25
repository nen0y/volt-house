import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { SITE_TITLE, SITE_DESCRIPTION } from "@/lib/seo";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CategoriesBlock from "@/components/CategoriesBlock";
import HomeSections from "@/components/HomeSections";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import { testimonials } from "@/lib/data";

const Contact = dynamic(() => import("@/components/Contact"));
const Footer = dynamic(() => import("@/components/Footer"));

export const metadata: Metadata = {
  title: { absolute: SITE_TITLE },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraph-image?brand=e-kit-v2", width: 1200, height: 630, alt: SITE_TITLE }],
  },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-gray-100">
        <Hero />
        <CategoriesBlock />
        <HomeSections />
        <div className="max-w-[1280px] mx-auto px-[24px]">
          <div className="border-t border-gray-300" />
        </div>
        <HowItWorks />
        <Testimonials testimonials={testimonials} />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
