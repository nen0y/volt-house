import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AllProductsClient from "@/components/AllProductsClient";
import { products } from "@/lib/data";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Каталог товарів",
  description:
    "Каталог E-Kit: інвертори, акумулятори LiFePO4, сонячні панелі та портативні зарядні станції для резервного живлення дому й бізнесу.",
  alternates: { canonical: "/products" },
  openGraph: {
    url: "/products",
    title: "Каталог товарів — E-Kit",
    description: "Інвертори, акумулятори, сонячні панелі та зарядні станції для резервного живлення.",
  },
};

export default async function AllProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  return (
    <>
      <Navbar />
      <main className="bg-gray-100 min-h-screen pt-[64px]">
        <AllProductsClient products={products} initialCategory={category ?? "all"} />
      </main>
      <Footer />
    </>
  );
}
