export interface SupplierResetRow {
  name: string;
  supplierTypes?: string[];
  rating?: string;
  brands?: string[];
  website?: string;
  resourceUrl?: string;
  locations?: string[];
  contactName?: string;
  phone?: string;
  email?: string;
  currencies?: string[];
  countries?: string[];
  lastContactAt?: string;
  equipmentCategories?: string[];
  notes?: string;
}

// Transcribed from the legacy Notion supplier database screenshots supplied on
// 2026-08-26. Public websites were added only where the company match was clear.
// Every imported supplier is intentionally created as inactive by reset-suppliers.
export const replacementSuppliers: SupplierResetRow[] = [
  {
    name: "СУЧАСНА ЕНЕРГІЯ",
    supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "A",
    brands: ["DEYE", "Tongwei", "LONGi", "JA Solar", "Huawei", "Solis"],
    website: "https://se.net.ua/", locations: ["Київ", "Запоріжжя"],
    contactName: "Олександр", phone: "0993347300", currencies: ["USD"], countries: ["Україна"],
    lastContactAt: "2026-02-09", equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Дуже крупний імпортер; переважно возить панелі; можна брати контейнерами; надійний постачальник; гарантія і сервіс; ціни часто змінюються.",
  },
  {
    name: "SUNFIX", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "A",
    brands: ["Solis", "SolaX", "Trina", "LONGi"], website: "https://sunfix.com.ua/",
    resourceUrl: "https://sunfix.com.ua/", locations: ["Глеваха", "Івано-Франківськ", "Хмельницький"],
    contactName: "Марина", phone: "0672238793", currencies: ["USD"], countries: ["Україна"],
    lastContactAt: "2026-02-05", equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "SolaX — товар, який вони ексклюзивно імпортують; хороше обладнання; топ сервіс і гарантія; склад у Хмельницькому; бронювання гарантоване; панелі беремо рідко, бо доставка трохи дорога.",
  },
  {
    name: "SOLAR BIZ", supplierTypes: ["Імпортер", "Дистриб’ютор", "Оптовий продавець"], rating: "A",
    brands: ["DEYE", "AXIOMA", "Tongwei", "DAS", "LONGi", "ASTROENERGY", "JA Solar", "RISEN"],
    website: "https://solar.biz.ua/", locations: ["Київ", "Запліт"], contactName: "Наталя", phone: "0983775327",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-05",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Часто беремо панелі та інвертори/АКБ; гарантоване бронювання; бронювання без оплати на 2 дні; швидка відповідь; можливе бронювання обладнання в дорозі під 10%; зазвичай найнижчі ціни; працюють також у роздріб; використовують орендовані склади, тому можливі затримки через збільшений ланцюг уточнень.",
  },
  {
    name: "ГЕНЕРАЦІЯ", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "B",
    brands: ["DEYE", "LONGi", "RISEN"], locations: ["Київ"], contactName: "В’ячеслав", phone: "0675262026",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"], notes: "Нормальні типи; працюють над репутацією.",
  },
  {
    name: "SOLAR FLOW", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "B",
    brands: ["DEYE", "Tongwei", "LONGi", "Trina"], locations: ["Київ"], contactName: "Максим", phone: "0683404339",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["Інвертори", "АКБ", "ФЕМ"], notes: "Двократний номінал на мусорку; але нормальні ціни та наявність інколи.",
  },
  {
    name: "ХЕЛІУС", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "B",
    brands: ["DEYE", "LONGi", "DAS"], locations: ["Київ"], contactName: "Олег", phone: "0672232313",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"], notes: "Гарантоване бронювання; не підводять; хороші ціни; немає обладнання — усе розгрібають.",
  },
  {
    name: "NAMATO", supplierTypes: ["Виробник", "Імпортер"], rating: "B",
    brands: ["DEYE", "LONGi"], locations: ["Київ", "Львів"], contactName: "Михайло", phone: "0968195340",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"], notes: "Виготовляють кріплення; також імпортують обладнання; дорого.",
  },
  {
    name: "ПРАВИЛЬНЕ ЕЛЕКТРОЖИВЛЕННЯ", supplierTypes: ["Імпортер", "Дистриб’ютор", "Оптовий продавець"], rating: "B",
    brands: ["DEYE", "Tongwei", "LONGi", "JA Solar", "RISEN", "Trina", "Solis"],
    resourceUrl: "https://www.truba.ua/ua/f/prel/", locations: ["Київ", "Львів"], contactName: "Олег", phone: "Telegram",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Спочатку роздріб, потім опт; часто беремо АКБ та інвертори; бронювання не гарантоване; можуть віддати товар іншому клієнту навіть після оплати; довго відповідають; інколи перепадає з поставок, що звільняються; працюють через кінцевий обмінник.",
  },
  {
    name: "RISE UP", supplierTypes: ["Дилер", "Оптовий продавець", "Імпортер"], rating: "B",
    brands: ["DEYE", "AXIOMA", "Tongwei", "DAS", "LONGi", "ASTROENERGY", "JA Solar", "RISEN", "INTERENERGY", "Trina", "FOX", "Huawei", "LogicPower", "STROMHERTZ", "SolaX", "Solis", "SOLPLANET", "Jinko"],
    resourceUrl: "Google Sheets (посилання зі старої бази неактуальне)", locations: ["Київ", "Хмельницький"], contactName: "Саша", phone: "0937838096",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Спочатку роздріб/опт, згодом відкрили відділ оптової торгівлі; почали продавати нам, часто підбивають; орієнтуються на вигідніші для них продажі; менеджер нормальний, конкретний і відповідальний; інколи відмовляють як ненадійному клієнту.",
  },
  {
    name: "SOLARVERSE", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "B",
    brands: ["DEYE", "Tongwei", "LONGi", "Trina", "Solis"], website: "https://solarverse.com.ua/",
    locations: ["Вишневе"], contactName: "Володимир", phone: "0671751890", currencies: ["USD"], countries: ["Україна"],
    lastContactAt: "2026-02-03", equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Довго працюємо; менеджер Коля став менеджером Володі; ненадійний номінант на мусорі; може підставити; контора нормальна, може гарантувати бронювання, але іноді через менеджера можна пробитися з наявністю; ручний прайс у Google Sheets, табличка не дуже добре виглядає; ціни часто нормальні, на фоні неможна.",
  },
  {
    name: "ALTEK", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "B",
    brands: ["SOLPLANET", "Jinko", "STROMHERTZ"], website: "https://altek.ua/", resourceUrl: "Excel-файл",
    locations: ["Київ", "Дніпро"], contactName: "Валерій", phone: "0633409288", currencies: ["UAH", "USD"], countries: ["Україна"],
    lastContactAt: "2026-02-05", equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Один із перших наших постачальників; дуже рідко зараз купуємо через неактуальність брендів; планують завезти новий бренд, який приблизно на 70–100 доларів дорожчий за DEYE; можуть відвантажити в борг; можуть розрахувати клієнта на складі.",
  },
  {
    name: "СІГ (Солар Інвест Груп)", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "B",
    brands: ["DEYE", "RISEN", "Trina", "INTERENERGY", "Huawei", "FOX", "Jinko"], website: "https://sig.energy/",
    locations: ["Київ", "Кривий Ріг", "Львів"], contactName: "Максим", phone: "0672602531",
    currencies: ["USD", "EUR", "UAH"], countries: ["Україна"], lastContactAt: "2026-02-05",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Працюємо здебільшого по ФЕМ та кріпленню; гарантоване бронювання; бронювання без оплати на 2 дні; свої склади; інколи можлива оплата завтра; можна розрахуватися на ФОП нормальним курсом.",
  },
  {
    name: "ISOLAR", supplierTypes: ["Дилер", "Дистриб’ютор", "Оптовий продавець", "Імпортер"], rating: "C",
    brands: ["FOX", "Jinko"], website: "https://isolar.com.ua/", resourceUrl: "Google Таблиці",
    locations: ["Київ", "Хмельницький"], contactName: "Ростислав", phone: "Telegram", currencies: ["USD"], countries: ["Україна"],
    lastContactAt: "2026-02-09", equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"], notes: "Брати ФЕМ лише коли дуже цікава пропозиція; інколи можна на ФОП.",
  },
  {
    name: "SKS", supplierTypes: ["Оптовий продавець", "Імпортер", "Дилер"], rating: "C",
    brands: ["DEYE", "RISEN", "Trina", "LONGi"], locations: ["Київ"], contactName: "Віталій", phone: "0970870797",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["Інвертори", "АКБ", "ФЕМ"], notes: "Працювали дуже рідко; більше продавець у роздріб, ніж опт.",
  },
  {
    name: "ЮГТОРГ", supplierTypes: ["Дистриб’ютор", "Імпортер", "Оптовий продавець"], rating: "C",
    brands: ["Різні бюджетні бренди"], resourceUrl: "B2B/прайс 626", locations: ["Одеса"], contactName: "Антон", phone: "0670071300",
    currencies: ["USD"], countries: ["Україна"], lastContactAt: "2026-02-09",
    equipmentCategories: ["Інвертори", "АКБ"], notes: "Завозять багато товару; рідко беремо, переважно в них весь прайс дорожчий приблизно на 12 В; гарантоване бронювання; швидко працюють; товар переважно невідомих брендів.",
  },
  {
    name: "LOGIC POWER", supplierTypes: ["Оптовий продавець", "Імпортер", "Виробник"], rating: "C",
    brands: ["JA Solar", "LogicPower", "Різні бюджетні бренди"], website: "https://logicpower.ua/", resourceUrl: "B2B/прайс 626",
    locations: ["Київ"], contactName: "Дмитро", phone: "0674858895", currencies: ["UAH"], countries: ["Україна"],
    lastContactAt: "2026-02-09", equipmentCategories: ["Інвертори", "АКБ", "ФЕМ"],
    notes: "Дуже рідко; наявність часто дізнаємося, зазвичай по маленьких замовленнях на лоджик павер; дорогі ціни, немає в наявності.",
  },
  {
    name: "АТМОСФЕРА", supplierTypes: ["Дистриб’ютор", "Імпортер"], rating: "C",
    brands: ["JA Solar"], website: "https://atmosfera.ua/", resourceUrl: "B2B/прайс 626",
    locations: ["Київ", "Хмельницький", "Львів"], contactName: "Віталій", phone: "0672396161", currencies: ["UAH"], countries: ["Україна"],
    lastContactAt: "2025-12-24", equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Колись були монополістами; велика компанія, але дорогі ціни; втратила долю ринку через ріст конкуренції; у Хмельницькому дуже активне представництво; прайс є, але часто просто дають доступ до B2B-порталу.",
  },
  {
    name: "ЮРА РАЙ", supplierTypes: ["Дистриб’ютор", "Імпортер", "Оптовий продавець"],
    brands: ["DEYE", "LONGi"], resourceUrl: "Excel-прайс", locations: ["Київ"], contactName: "Юра", phone: "0937283454",
    currencies: ["USD", "UAH"], countries: ["Україна"], lastContactAt: "2026-02-05",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Колишній менеджер Альтека; зараз працює з якимось невідомим нам складом; дуже гарні відносини робочі були, але через нового посередника складом ще не брали; ціни звичайні.",
  },
  {
    name: "ССЖ", supplierTypes: ["Дилер", "Дистриб’ютор", "Імпортер", "Оптовий продавець"],
    brands: ["DEYE", "Tongwei", "LONGi", "RISEN", "Trina", "INTERENERGY", "Huawei", "FOX", "Jinko", "Solis"],
    resourceUrl: "Прайс-розсилка", locations: ["Київ"], contactName: "Ігор", phone: "0635211103",
    currencies: ["USD", "UAH"], countries: ["Україна"], lastContactAt: "2026-02-06",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Перекинуті такі самі як Райзен; немає гарантій бронювання; рідко працюємо; якщо щось завозять, чого немає в інших, то беремо; шукають товар серед приблизно 20 постачальників, часто у тих самих, яких знаємо ми; інколи вигідність незрозуміла; можуть відвантажити в борг; можлива оплата на ФОП.",
  },
  {
    name: "WISE ENERGY", supplierTypes: ["Оптовий продавець", "Імпортер"], rating: "C",
    brands: ["DEYE", "Jinko", "SUNPRO"], locations: ["Київ", "Хмельницький"], contactName: "Максим", phone: "0963229176",
    currencies: ["USD", "UAH"], countries: ["Польща", "Україна"], lastContactAt: "2026-02-05",
    equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "Працюють нещодавно; хаотична структура, ніхто нічого не знає і ніхто ні за що не відповідає; бронювання не гарантоване; можуть продавати в роздріб; ненадійна гарантійна та сервісна підтримка; перевага в наявності товару; ціна зазвичай висока; можуть відвантажити в борг.",
  },
  {
    name: "ERGY", supplierTypes: ["Дилер"], website: "https://ergy.com.ua/", locations: ["Хмельницький"],
    phone: "+380938496372", countries: ["Україна"], equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
  },
  {
    name: "BRANDSOLAR", supplierTypes: ["Дилер", "Оптовий продавець"], website: "https://brandsolar.com.ua/",
    phone: "+380687042584", countries: ["Україна"], equipmentCategories: ["ФЕМ", "Інвертори", "АКБ"],
    notes: "У старій базі назва була записана з помилкою як bramdsolar.com.ua.",
  },
];
