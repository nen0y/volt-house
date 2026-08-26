import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { products as localProducts } from "@/lib/data";
import { getProductServer, getProductsServer } from "@/lib/server-api";
import { abs, productSchema, breadcrumbSchema, SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo";
import Navbar from "@/components/Navbar";
import ProductDetail from "@/components/ProductDetail";
import Footer from "@/components/Footer";
import JsonLd from "@/components/JsonLd";

// Prerender the seed products; any others render on demand (dynamicParams default).
export function generateStaticParams() {
  return localProducts.map((p) => ({ id: p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductServer(id);
  if (!product) return { title: "Товар не знайдено" };

  const description =
    (product.features?.slice(0, 3).join(". ") || SITE_DESCRIPTION) +
    ` Ціна від $${product.price.toLocaleString("en-US")}.`;
  const image =
    product.images && product.images.length
      ? product.images[0].startsWith("http")
        ? product.images[0]
        : abs(product.images[0])
      : abs("/opengraph-image");

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.id}` },
    openGraph: {
      type: "website",
      url: `/products/${product.id}`,
      title: `${product.name} — ${SITE_NAME}`,
      description,
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductServer(id);
  if (!product) notFound();

  const all = await getProductsServer();
  const related = all
    .filter((p) => (p.categoryKeys ?? [p.category]).some((key) => (product.categoryKeys ?? [product.category]).includes(key)) && p.id !== product.id)
    .slice(0, 3);

  return (
    <>
      <JsonLd data={productSchema(product)} />
      <JsonLd
        data={breadcrumbSchema([
          { name: "Головна", path: "/" },
          { name: "Товари", path: "/products" },
          { name: product.name, path: `/products/${product.id}` },
        ])}
      />
      <Navbar />
      <main className="bg-gray-100 min-h-screen pt-[64px]">
        <ProductDetail product={product} related={related} />
      </main>
      <Footer />
    </>
  );
}
