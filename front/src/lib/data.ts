import type { Product, Testimonial } from "@/types";

// Offline fallback catalogue — used only when the API is unreachable so the
// storefront still renders something. The live Deye catalogue comes from the
// backend; these are a small representative subset (no images, category
// illustrations are shown instead).
export const products: Product[] = [
  {
    id: "deye-deye-sun-8k-sg-lp1-1-faza",
    name: "Deye SUN-8K SG..LP1 (1 фаза)",
    category: "inverter",
    price: 1236,
    power: "8 кВт",
    warranty: "1 рік",
    badge: "Хіт продажів",
    features: [
      "Гібридний інвертор, 1 фаза",
      "Номінальна потужність: 8 кВт",
      "MPPT: 2 трекери",
      "Акумулятор: низьковольтний, 48 В",
      "on-grid / off-grid, підтримка генератора",
    ],
    image: "/placeholder.jpg",
  },
  {
    id: "deye-deye-sun-12k-sg05lp3-3-faz",
    name: "Deye SUN-12K SG05LP3 (3 фази)",
    category: "inverter",
    price: 1186,
    power: "12 кВт",
    warranty: "1 рік",
    features: [
      "Гібридний інвертор, 3 фази",
      "Номінальна потужність: 12 кВт",
      "MPPT: 2 трекери",
      "Акумулятор: низьковольтний, 48 В",
      "100% несиметричне навантаження по фазах",
    ],
    image: "/placeholder.jpg",
  },
  {
    id: "deye-deye-sun-30-kw-merezhev",
    name: "Deye SUN-30 kW мережевий",
    category: "inverter",
    price: 1134,
    power: "30 кВт",
    warranty: "1 рік",
    features: [
      "Мережевий (grid-tie) інвертор, 3 фази",
      "Номінальна потужність: 30 кВт",
      "MPPT: 3 трекери",
      "Макс. ККД: до 98,6%",
      "Без акумулятора — прямий продаж енергії в мережу",
    ],
    image: "/placeholder.jpg",
  },
  {
    id: "deye-deye-se-g5-1-pro-b",
    name: "Deye SE-G5.1-PRO-B",
    category: "battery",
    price: 900,
    capacity: "5.12 кВт·год",
    warranty: "1 рік",
    badge: "Найпопулярніший",
    features: [
      "Акумулятор LiFePO₄, низьковольтний",
      "Ємність: 5,12 кВт·год (100 Ач)",
      "Номінальна напруга: 51,2 В",
      "Ресурс: понад 6000 циклів",
      "Масштабування: до 16 модулів паралельно",
    ],
    image: "/placeholder.jpg",
  },
  {
    id: "deye-deye-se-f16",
    name: "Deye SE-F16",
    category: "battery",
    price: 2041,
    capacity: "16 кВт·год",
    warranty: "1 рік",
    features: [
      "Акумулятор LiFePO₄, низьковольтний (вежа)",
      "Ємність: 16 кВт·год",
      "Ресурс: понад 6000 циклів",
      "Комунікація: RS485 / CAN, вбудована BMS",
    ],
    image: "/placeholder.jpg",
  },
  {
    id: "deye-ai-w5-1-8k-sg01lp1-eu-deye-ess-8-kw-1",
    name: "Deye ESS AI-W5.1-8K (8 кВт, 1 фаза)",
    category: "station",
    price: 3600,
    power: "8 кВт",
    warranty: "1 рік",
    badge: "Новинка",
    features: [
      "Система «все-в-одному» (інвертор + акумулятор)",
      "Потужність інвертора: 8 кВт",
      "Акумулятор: LiFePO₄, масштабований (до 30 кВт·год)",
      "on-grid / off-grid",
      "Монтаж: підлоговий, стековий",
    ],
    image: "/placeholder.jpg",
  },
];

// No placeholder reviews — the storefront hides the reviews section when the
// list is empty. Real reviews are served by the API (add them via
// POST /api/testimonials).
export const testimonials: Testimonial[] = [];
