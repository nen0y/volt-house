import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import Benefits from "@/components/Benefits";
import Products from "@/components/Products";
import HowItWorks from "@/components/HowItWorks";
import Testimonials from "@/components/Testimonials";
import Providers from "@/components/Providers";
import { products, testimonials } from "@/lib/data";

const Contact = dynamic(() => import("@/components/Contact"));
const Footer = dynamic(() => import("@/components/Footer"));

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="bg-gray-100">
        <Hero />
        <TrustBar />
        <Benefits />
        <Providers>
          <Products initialData={products} />
        </Providers>
        <HowItWorks />
        <Testimonials testimonials={testimonials} />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
