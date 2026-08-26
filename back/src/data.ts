// Basic catalogue data used by the seeder. Mirrors the storefront's initial data
// so the API serves the exact products/testimonials the frontend expects.

export type ProductCategory = "inverter" | "battery" | "solar" | "station" | "kits";

export interface SeedProduct {
  id: string;
  name: string;
  category: ProductCategory;
  price: number;
  originalPrice?: number;
  power?: string;
  capacity?: string;
  efficiency?: string;
  warranty: string;
  badge?: string;
  features: string[];
  image: string;
}

export interface SeedTestimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  avatar: string;
  product: string;
}

export const products: SeedProduct[] = [];

export const testimonials: SeedTestimonial[] = [
  {
    id: "t1",
    name: "Максим Коваленко",
    location: "Київ",
    rating: 5,
    text: "Встановили гібридний інвертор Deye SUN-8K з акумуляторами SE-G5.1 — вдень будинок живиться від сонця, а під час відключень автоматично переходить на батареї. Дуже задоволені.",
    avatar: "МК",
    product: "Deye SUN-8K + SE-G5.1",
  },
  {
    id: "t2",
    name: "Оксана Мельник",
    location: "Харків",
    rating: 5,
    text: "Минулої зими були постійні відключення — тепер про них майже не згадуємо завдяки системі від E-Kit на базі Deye. Моніторинг через Wi-Fi зручний: бачу все зі свого телефону.",
    avatar: "ОМ",
    product: "Deye SUN-12K",
  },
  {
    id: "t3",
    name: "Дмитро Іванченко",
    location: "Дніпро",
    rating: 5,
    text: "Накопичувач Deye впевнено тримає холодильник і опалення під час тривалих відключень. Встановили швидко, працює надійно.",
    avatar: "ДІ",
    product: "Deye SE-F16",
  },
  {
    id: "t4",
    name: "Олена Шевченко",
    location: "Львів",
    rating: 5,
    text: "Трифазний інвертор Deye SUN-30K чудово підійшов для нашого будинку. Команда монтажників E-Kit — професіонали, усе зробили за день.",
    avatar: "ОШ",
    product: "Deye SUN-30K",
  },
];

// ── Product categories ────────────────────────────────────────────────────────

export interface SeedCategory {
  key: string;
  label: string;
  labelSingular: string;
  description: string;
  icon: string;
  parentKey?: string;
}

export const categories: SeedCategory[] = [
  { key: "inverter", label: "Інвертори",       labelSingular: "Інвертор",        description: "Гібридні та мережеві інвертори", icon: "⚡" },
  { key: "battery",  label: "Акумулятори",     labelSingular: "Акумулятор",      description: "LiFePO4 акумуляторні системи",  icon: "🔋" },
  { key: "solar",    label: "Сонячні панелі",  labelSingular: "Сонячна панель",  description: "Монокристалічні панелі",        icon: "☀️" },
  { key: "station",  label: "Зарядні станції", labelSingular: "Зарядна станція", description: "Портативні зарядні станції",     icon: "🔌" },
  { key: "kits", label: "Комплекти", labelSingular: "Комплект", description: "Готові системи резервного та сонячного живлення", icon: "🏠" },
  { key: "inverter-hybrid", label: "Гібридні інвертори", labelSingular: "Гібридний інвертор", description: "Для мережі, акумуляторів і сонячних панелей", icon: "⚡", parentKey: "inverter" },
  { key: "inverter-grid", label: "Мережеві інвертори", labelSingular: "Мережевий інвертор", description: "Для мережевих сонячних станцій", icon: "🔌", parentKey: "inverter" },
  { key: "battery-lifepo4", label: "LiFePO4 акумулятори", labelSingular: "LiFePO4 акумулятор", description: "Безпечні довговічні акумулятори", icon: "🔋", parentKey: "battery" },
  { key: "solar-mono", label: "Монокристалічні панелі", labelSingular: "Монокристалічна панель", description: "Ефективні панелі для дому та бізнесу", icon: "☀️", parentKey: "solar" },
  { key: "station-portable", label: "Портативні станції", labelSingular: "Портативна станція", description: "Мобільне резервне живлення", icon: "🔌", parentKey: "station" },
];

// ── Power-calculator appliances ───────────────────────────────────────────────

export interface SeedAppliance {
  id: string;
  name: string;
  watts: number;
  icon: string;
  group: "essential" | "kitchen" | "heavy";
}

export const appliances: SeedAppliance[] = [
  { id: "fridge", name: "Холодильник", watts: 150, icon: "🧊", group: "essential" },
  { id: "tv", name: "Телевізор", watts: 100, icon: "📺", group: "essential" },
  { id: "laptop", name: "Ноутбук", watts: 65, icon: "💻", group: "essential" },
  { id: "router", name: "Роутер / інтернет", watts: 15, icon: "📶", group: "essential" },
  { id: "lighting", name: "Освітлення", watts: 100, icon: "💡", group: "essential" },
  { id: "phone", name: "Зарядка телефону", watts: 20, icon: "📱", group: "essential" },
  { id: "microwave", name: "Мікрохвильовка", watts: 1000, icon: "🍲", group: "kitchen" },
  { id: "kettle", name: "Чайник", watts: 2000, icon: "☕", group: "kitchen" },
  { id: "coffee", name: "Кавоварка", watts: 800, icon: "☕", group: "kitchen" },
  { id: "washing", name: "Пральна машинка", watts: 2000, icon: "🫧", group: "heavy" },
  { id: "hairdryer", name: "Фен", watts: 1500, icon: "💨", group: "heavy" },
  { id: "iron", name: "Праска", watts: 2000, icon: "👔", group: "heavy" },
  { id: "vacuum", name: "Пилосос", watts: 1000, icon: "🧹", group: "heavy" },
  { id: "ac", name: "Кондиціонер", watts: 1500, icon: "❄️", group: "heavy" },
  { id: "boiler", name: "Бойлер", watts: 2000, icon: "🚿", group: "heavy" },
  { id: "pump", name: "Водяний насос", watts: 800, icon: "💧", group: "heavy" },
];

// ── Calculator recommendation rules (editable via admin) ──────────────────────

// The calculator auto-picks the best-fit products from the catalogue by reading
// each product's power/capacity — it is not tied to specific product ids.
export interface CalculatorConfig {
  autonomyHours: number; // hours of backup at full load → sizes the battery
  powerReservePct: number; // safety margin on the inverter (e.g. 20%)
  inverterCategory: string; // category to draw power sources from
  batteryCategory: string; // category to draw storage from
  stationCategory: string; // all-in-one category (portable stations); "" to disable
}

export const calculatorConfig: CalculatorConfig = {
  autonomyHours: 4,
  powerReservePct: 20,
  inverterCategory: "inverter",
  batteryCategory: "battery",
  stationCategory: "station",
};

// ── Editable content blocks ───────────────────────────────────────────────────

export interface SeedContentBlock {
  key: string;
  heading?: string;
  subheading?: string;
  body?: string;
  productIds: string[];
  sortOrder: number;
}

// ── Editable homepage sections (page-builder) ─────────────────────────────────

export interface SeedHomeSection {
  title: string;
  subtitle: string;
  mode: "products" | "category" | "cta";
  category: string;
  productIds: string[];
  ctaLabel: string;
  ctaHref: string;
}

export const homeSections: SeedHomeSection[] = [
  {
    title: "Новинки",
    subtitle: "",
    mode: "products",
    category: "",
    productIds: ["deye-ms-gs215-2h3-deye-100-kw-380-400-va", "deye-s-stema-nakop-chennya-deye-bess-bos-b-240", "deye-deye-bos-b-pro-a3", "deye-komplekt-deye-bos-b-pro-sti-ka-bms-a"],
    ctaLabel: "Переглянути каталог",
    ctaHref: "/products",
  },
  {
    title: "Інвертори",
    subtitle: "Гібридні та мережеві інвертори для дому й бізнесу",
    mode: "category",
    category: "inverter",
    productIds: [],
    ctaLabel: "Усі інвертори",
    ctaHref: "",
  },
  {
    title: "Акумулятори",
    subtitle: "LiFePO4 сховища енергії",
    mode: "category",
    category: "battery",
    productIds: [],
    ctaLabel: "Усі акумулятори",
    ctaHref: "",
  },
  {
    title: "Зарядні станції",
    subtitle: "Портативні станції живлення для дому та поїздок",
    mode: "category",
    category: "station",
    productIds: [],
    ctaLabel: "Усі станції",
    ctaHref: "",
  },
  {
    title: "Сонячні панелі",
    subtitle: "Монокристалічні та двосторонні панелі",
    mode: "category",
    category: "solar",
    productIds: [],
    ctaLabel: "Усі панелі",
    ctaHref: "",
  },
  {
    title: "Не впевнені, що обрати?",
    subtitle: "Залиште заявку — наш експерт підбере систему під ваш дім і бюджет та передзвонить протягом 24 годин.",
    mode: "cta",
    category: "",
    productIds: [],
    ctaLabel: "Замовити дзвінок",
    ctaHref: "",
  },
  {
    title: "Рекомендовані рішення",
    subtitle: "Готові комплекти для дому, бізнесу та поїздок",
    mode: "products",
    category: "",
    productIds: ["deye-ms-gs215-2h3-deye-100-kw-380-400-va", "deye-s-stema-nakop-chennya-deye-bess-bos-b-240", "deye-deye-bos-b-pro-a3", "deye-komplekt-deye-bos-b-pro-sti-ka-bms-a"],
    ctaLabel: "Переглянути каталог",
    ctaHref: "/products",
  },
];

export const contentBlocks: SeedContentBlock[] = [
  {
    key: "hero",
    heading: "Deye SUN-8K — гібридний інвертор",
    subheading: "Забезпечте свій дім електроенергією під час будь-якого відключення",
    body: "Хіт продажів",
    productIds: ["deye-deye-sun-8k-sg-lp1-1-faza"],
    sortOrder: 0,
  },
  {
    key: "how_it_works",
    heading: "Як це працює",
    subheading: "Від замовлення до підключення — швидко та без зайвих турбот.",
    body: "",
    productIds: [],
    sortOrder: 1,
  },
  {
    key: "promo",
    heading: "Рекомендовані рішення",
    subheading: "Готові комплекти для дому, бізнесу та поїздок",
    body: "",
    productIds: [
      "deye-deye-sun-8k-sg-lp1-1-faza",
      "deye-deye-se-g5-1-pro-b",
      "deye-ai-w5-1-8k-sg01lp1-eu-deye-ess-8-kw-1",
      "deye-deye-sun-12k-sg05lp3-3-faz",
    ],
    sortOrder: 2,
  },
  {
    key: "contact",
    heading: "Отримати безкоштовну консультацію",
    subheading: "Без зобов'язань. Наші експерти розроблять систему під ваш дім та бюджет.",
    body: "",
    productIds: [],
    sortOrder: 3,
  },
];
