// Basic catalogue data used by the seeder. Mirrors the storefront's initial data
// so the API serves the exact products/testimonials the frontend expects.

export type ProductCategory = "inverter" | "battery" | "solar" | "station";

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

export const products: SeedProduct[] = [
  {
    id: "inv-5kw",
    name: "VoltMax 5kW Hybrid Inverter",
    category: "inverter",
    price: 1299,
    originalPrice: 1599,
    power: "5000W",
    efficiency: "97.6%",
    warranty: "5 years",
    badge: "Хіт продажів",
    features: [
      "MPPT сонячний контролер заряду",
      "Чиста синусоїда на виході",
      "Додаток для моніторингу через Wi-Fi",
      "Мережевий та автономний режими",
      "РК сенсорний дисплей",
    ],
    image: "/products/inverter-5kw.svg",
  },
  {
    id: "inv-10kw",
    name: "VoltMax 10kW Pro Inverter",
    category: "inverter",
    price: 2199,
    power: "10000W",
    efficiency: "98.2%",
    warranty: "5 years",
    features: [
      "Подвійне відстеження MPPT",
      "Трифазний вихід",
      "Віддалені оновлення прошивки",
      "Автозапуск генератора",
      "Захист IP65 від погодних умов",
    ],
    image: "/products/inverter-10kw.svg",
  },
  {
    id: "bat-10kwh",
    name: "PowerCell 10kWh LiFePO4",
    category: "battery",
    price: 3499,
    originalPrice: 3999,
    capacity: "10kWh",
    efficiency: "96%",
    warranty: "10 years",
    badge: "Найпопулярніший",
    features: [
      "6000+ циклів заряду",
      "Вбудована BMS",
      "Модульне нарощування до 60 кВт·год",
      "Управління температурою",
      "99% глибина розряду",
    ],
    image: "/products/battery-10kwh.svg",
  },
  {
    id: "bat-20kwh",
    name: "PowerCell 20kWh LiFePO4",
    category: "battery",
    price: 6499,
    capacity: "20kWh",
    efficiency: "96%",
    warranty: "10 years",
    features: [
      "6000+ циклів заряду",
      "Вбудована BMS",
      "Модульне розширення",
      "Розумне балансування навантаження",
      "Пожежобезпечна хімія",
    ],
    image: "/products/battery-20kwh.svg",
  },
  {
    id: "sol-400w",
    name: "SunPower 400W Mono Panel",
    category: "solar",
    price: 299,
    efficiency: "22.3%",
    power: "400W",
    warranty: "25 years",
    badge: "Найвищий рейтинг",
    features: [
      "Монокристалічні PERC клітини",
      "Антивідблискове покриття",
      "Навантаження вітру 2400 Па",
      "Технологія напівзрізаних клітин",
      "З'єднувальна коробка IP68",
    ],
    image: "/products/solar-400w.svg",
  },
  {
    id: "sol-550w",
    name: "SunPower 550W Bifacial Panel",
    category: "solar",
    price: 399,
    efficiency: "23.1%",
    power: "550W",
    warranty: "25 years",
    features: [
      "Двостороннє подвійне скло",
      "Гарантія продуктивності 25 років",
      "Технологія Anti-PID",
      "Стійкість до сольового туману",
      "Надзвичайно низька деградація",
    ],
    image: "/products/solar-550w.svg",
  },
  {
    id: "sta-1kwh",
    name: "PowerStation Delta 1kWh",
    category: "station",
    price: 999,
    originalPrice: 1199,
    capacity: "1024Wh",
    power: "1800W",
    warranty: "3 years",
    badge: "Новинка",
    features: [
      "Швидка зарядка 0–80% за 50 хв",
      "13 портів живлення",
      "Розширення ємності до 3 кВт·год",
      "Додаток для моніторингу через Wi-Fi",
      "Компактна та портативна",
    ],
    image: "/products/station-1kwh.svg",
  },
  {
    id: "sta-2kwh",
    name: "PowerStation Delta 2 Pro",
    category: "station",
    price: 1799,
    capacity: "2048Wh",
    power: "2400W",
    warranty: "5 years",
    features: [
      "LiFePO4 — 6500+ циклів заряду",
      "Сонячна зарядка до 1000 Вт",
      "X-Boost до 3000 Вт",
      "Безперебійне живлення (UPS < 20 мс)",
      "Розширення ємності до 6 кВт·год",
    ],
    image: "/products/station-2kwh.svg",
  },
];

export const testimonials: SeedTestimonial[] = [
  {
    id: "t1",
    name: "Максим Коваленко",
    location: "Київ",
    rating: 5,
    text: "Після встановлення інвертора VoltMax 5kW з двома акумуляторами PowerCell наш будинок вдень повністю живиться від сонця. Рахунок за електроенергію зменшився на 90%. Найкраща інвестиція, яку ми зробили.",
    avatar: "МК",
    product: "VoltMax 5kW + PowerCell 20kWh",
  },
  {
    id: "t2",
    name: "Оксана Мельник",
    location: "Харків",
    rating: 5,
    text: "Минулої зими у нас були постійні відключення електроенергії — тепер про це забули після встановлення системи від E-Kit. Додаток для моніторингу через Wi-Fi чудовий — бачу все зі свого телефону.",
    avatar: "ОМ",
    product: "VoltMax 10kW Pro",
  },
  {
    id: "t3",
    name: "Дмитро Іванченко",
    location: "Дніпро",
    rating: 5,
    text: "Відключення вже нас не лякають. 20 кВт·год накопичувача тримали холодильник, опалення та медичне обладнання протягом 48 годин поспіль. Неймовірна система.",
    avatar: "ДІ",
    product: "PowerCell 20kWh + SunPower 550W",
  },
  {
    id: "t4",
    name: "Олена Шевченко",
    location: "Львів",
    rating: 5,
    text: "Двосторонні панелі SunPower перевищують заявлену потужність на нашому даху. Команда монтажників була дуже професійною та завершила роботу за один день. Дуже рекомендую.",
    avatar: "ОШ",
    product: "SunPower 550W Bifacial (×12)",
  },
];

// ── Product categories ────────────────────────────────────────────────────────

export interface SeedCategory {
  key: string;
  label: string;
  labelSingular: string;
  description: string;
  icon: string;
}

export const categories: SeedCategory[] = [
  { key: "inverter", label: "Інвертори",       labelSingular: "Інвертор",        description: "Гібридні та мережеві інвертори", icon: "⚡" },
  { key: "battery",  label: "Акумулятори",     labelSingular: "Акумулятор",      description: "LiFePO4 акумуляторні системи",  icon: "🔋" },
  { key: "solar",    label: "Сонячні панелі",  labelSingular: "Сонячна панель",  description: "Монокристалічні панелі",        icon: "☀️" },
  { key: "station",  label: "Зарядні станції", labelSingular: "Зарядна станція", description: "Портативні зарядні станції",     icon: "🔌" },
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
    productIds: ["inv-5kw", "bat-10kwh", "sol-400w", "bat-20kwh"],
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
    productIds: ["inv-5kw", "bat-10kwh", "sta-2kwh", "sol-550w"],
    ctaLabel: "Переглянути каталог",
    ctaHref: "/products",
  },
];

export const contentBlocks: SeedContentBlock[] = [
  {
    key: "hero",
    heading: "VoltMax 5kW Гібридний Інвертор",
    subheading: "Забезпечте свій дім електроенергією під час будь-якого відключення",
    body: "Хіт продажів",
    productIds: ["inv-5kw"],
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
    productIds: ["inv-5kw", "bat-10kwh", "sta-2kwh", "sol-550w"],
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
