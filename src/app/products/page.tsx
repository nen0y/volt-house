import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AllProductsClient from "@/components/AllProductsClient";
import { products } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Всі товари — VoltHouse",
  description: "Інвертори, акумулятори та сонячні панелі для резервного живлення.",
};

export default function AllProductsPage() {
  return (
    <Providers>
      <Navbar />
      <main className="bg-gray-100 min-h-screen pt-[64px]">
        <AllProductsClient products={products} />
      </main>
      <Footer />
    </Providers>
  );
}
