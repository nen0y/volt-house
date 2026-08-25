// Built-in categories ship by default, but categories are editable in the admin,
// so a product's category is just a string key.
export type ProductCategory = "inverter" | "battery" | "solar" | "station" | "kits";

export interface Category {
  key: string;
  label: string;
  labelSingular: string;
  description: string;
  icon: string;
  sortOrder: number;
  enabled: boolean;
  parentKey?: string | null;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  power?: string;
  capacity?: string;
  efficiency?: string;
  warranty: string;
  badge?: string;
  features: string[];
  image: string;
  images?: string[]; // uploaded image URLs ("/uploads/..."); empty → category SVG fallback
}

export type HomeSectionMode = "products" | "category" | "cta";

export interface HomeSection {
  id: string;
  title: string;
  subtitle: string;
  mode: HomeSectionMode;
  category: string;
  productIds: string[];
  ctaLabel: string;
  ctaHref: string;
  enabled: boolean;
  sortOrder: number;
}

export interface Testimonial {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  avatar: string;
  product: string;
}

export interface ContentBlock {
  key: string;
  heading: string;
  subheading: string;
  body: string;
  productIds: string[];
  enabled: boolean;
  sortOrder: number;
}

export type ContentMap = Record<string, ContentBlock>;

export interface CalcAppliance {
  id: string;
  name: string;
  watts: number;
  icon: string;
  group: "essential" | "kitchen" | "heavy";
}

export interface CalcRecommendation {
  autonomyHours: number;
  powerReservePct: number;
  inverterCategory: string;
  batteryCategory: string;
  stationCategory: string;
}

export interface CalculatorData {
  appliances: CalcAppliance[];
  recommendation: CalcRecommendation;
}

// Fallback category metadata (used until /api/categories responds, or if it is down)
export const CATEGORY_LABELS: Record<string, string> = {
  inverter: "Інвертори",
  battery: "Акумулятори",
  solar: "Сонячні панелі",
  station: "Зарядні станції",
  kits: "Комплекти",
  "inverter-hybrid": "Гібридні інвертори",
  "inverter-grid": "Мережеві інвертори",
  "battery-lifepo4": "LiFePO4 акумулятори",
  "solar-mono": "Монокристалічні панелі",
  "station-portable": "Портативні станції",
};

export const CATEGORY_LABEL_SINGULAR: Record<string, string> = {
  inverter: "Інвертор",
  battery: "Акумулятор",
  solar: "Сонячна панель",
  station: "Зарядна станція",
  kits: "Комплект",
  "inverter-hybrid": "Гібридний інвертор",
  "inverter-grid": "Мережевий інвертор",
  "battery-lifepo4": "LiFePO4 акумулятор",
  "solar-mono": "Монокристалічна панель",
  "station-portable": "Портативна станція",
};

export const FALLBACK_CATEGORIES: Category[] = [
  { key: "inverter", label: "Інвертори",       labelSingular: "Інвертор",        description: "Гібридні та мережеві інвертори", icon: "⚡",  sortOrder: 0, enabled: true },
  { key: "battery",  label: "Акумулятори",     labelSingular: "Акумулятор",      description: "LiFePO4 акумуляторні системи",  icon: "🔋", sortOrder: 1, enabled: true },
  { key: "solar",    label: "Сонячні панелі",  labelSingular: "Сонячна панель",  description: "Монокристалічні панелі",        icon: "☀️", sortOrder: 2, enabled: true },
  { key: "station",  label: "Зарядні станції", labelSingular: "Зарядна станція", description: "Портативні зарядні станції",     icon: "🔌", sortOrder: 3, enabled: true },
  { key: "kits", label: "Комплекти", labelSingular: "Комплект", description: "Готові системи резервного та сонячного живлення", icon: "🏠", sortOrder: 4, enabled: true },
  { key: "inverter-hybrid", label: "Гібридні інвертори", labelSingular: "Гібридний інвертор", description: "Для мережі, акумуляторів і сонячних панелей", icon: "⚡", sortOrder: 5, enabled: true, parentKey: "inverter" },
  { key: "inverter-grid", label: "Мережеві інвертори", labelSingular: "Мережевий інвертор", description: "Для мережевих сонячних станцій", icon: "🔌", sortOrder: 6, enabled: true, parentKey: "inverter" },
  { key: "battery-lifepo4", label: "LiFePO4 акумулятори", labelSingular: "LiFePO4 акумулятор", description: "Безпечні довговічні акумулятори", icon: "🔋", sortOrder: 7, enabled: true, parentKey: "battery" },
  { key: "solar-mono", label: "Монокристалічні панелі", labelSingular: "Монокристалічна панель", description: "Ефективні панелі для дому та бізнесу", icon: "☀️", sortOrder: 8, enabled: true, parentKey: "solar" },
  { key: "station-portable", label: "Портативні станції", labelSingular: "Портативна станція", description: "Мобільне резервне живлення", icon: "🔌", sortOrder: 9, enabled: true, parentKey: "station" },
];
