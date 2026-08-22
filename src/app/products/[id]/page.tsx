import { notFound } from "next/navigation";
import { products } from "@/lib/data";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import ProductDetail from "@/components/ProductDetail";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export function generateStaticParams() {
  return products.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) return {};
  return {
    title: `${product.name} — VoltHouse`,
    description: product.features.slice(0, 2).join(", "),
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = products.find((p) => p.id === id);
  if (!product) notFound();

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  return (
    <Providers>
      <Navbar />
      <main className="bg-gray-100 min-h-screen pt-[64px]">
        <ProductDetail product={product} related={related} />
      </main>
      <Footer />
    </Providers>
  );
}
