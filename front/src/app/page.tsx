import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import CategoriesBlock from "@/components/CategoriesBlock";
import HomeSections from "@/components/HomeSections";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import Providers from "@/components/Providers";
import { testimonials } from "@/lib/data";

const Contact = dynamic(() => import("@/components/Contact"));
const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  return (
    <Providers>
      <Navbar />
      <main className="bg-gray-100">
        <Hero />
        <CategoriesBlock />
        <HomeSections />
        <HowItWorks />
        <Testimonials testimonials={testimonials} />
        <Contact />
      </main>
      <Footer />
    </Providers>
  );
}
