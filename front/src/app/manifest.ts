import type { MetadataRoute } from "next";
import { SITE_NAME, SITE_DESCRIPTION } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — Системи резервного живлення`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#FFC107",
    lang: "uk",
    categories: ["shopping", "business"],
    icons: [{ src: "/brand/e-kit-symbol.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
