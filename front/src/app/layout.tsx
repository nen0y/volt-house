import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import JsonLd from "@/components/JsonLd";
import Providers from "@/components/Providers";
import {
  SITE_URL,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  organizationSchema,
  websiteSchema,
} from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: SITE_KEYWORDS,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    locale: "uk_UA",
    images: [{ url: "/opengraph-image?brand=e-kit-v2", width: 1200, height: 630, alt: SITE_TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ["/opengraph-image?brand=e-kit-v2"],
  },
  icons: {
    icon: [{ url: "/brand/e-kit-symbol.svg", type: "image/svg+xml" }],
    shortcut: "/brand/e-kit-symbol.svg",
    apple: "/brand/e-kit-symbol.svg",
  },
  formatDetection: { telephone: true, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFC107",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uk" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <JsonLd data={organizationSchema()} />
        <JsonLd data={websiteSchema()} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-slate-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
