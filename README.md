# VoltHouse — інтернет-магазин (фронт + бек + база)

Монорепозиторій:

- **`front/`** — Next.js вітрина (магазин)
- **`back/`** — REST API + адмін-панель + база **SQLite**

## 🚀 Запуск однією командою (Docker)

```bash
docker compose up -d --build
```

Піднімається все одразу:

| Що | Адреса |
|---|---|
| Магазин | http://localhost:3000 |
| Адмін-панель | http://localhost:3000/admin |
| API | через фронт `/api` |

Фронт сам проксіює `/api`, `/uploads` і `/admin` на бекенд — тож назовні дивиться **лише один порт 3000** (бекенд `back` живе всередині docker-мережі, без публічного порту; без CORS). База даних і завантажені фото зберігаються у Docker-волюмі `backdata` і переживають перезапуски.

> Треба звертатись до бекенду напряму для дебагу? Тимчасово додай `ports: ["4000:4000"]` у сервіс `back` у `docker-compose.yml`.

**Логін в адмінку:** `omelyazuk@gmail.com` / пароль із `back/.env` (`ADMIN_PASSWORD`).

### Керування

```bash
docker compose logs -f          # логи (тут видно доставку в Telegram)
docker compose down             # зупинити
docker compose down -v          # зупинити + видалити базу і фото
```

## ☁️ Деплой на хостинг

1. На сервері: `git clone`, потім `docker compose up -d --build`.
2. Публічно відкрий порт **3000** (це вітрина + `/admin` + `/api`). Порт 4000 можна не відкривати назовні (або відкрити лише для прямого доступу до адмінки).
3. Налаштування беруться з `back/.env` — задай там `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (скопіюй із `back/.env.example`). На хостингах їх також можна задати змінними середовища.
4. **Домен для SEO:** впиши свій домен у файл **`.env`** (у корені, поряд із `docker-compose.yml`):
   ```env
   SITE_URL=https://твій-домен
   ```
   і перезбери: `docker compose up -d --build`. (Порожній `SITE_URL` → `http://localhost:3000`.)
5. Для власного домену постав фронт за reverse-proxy (nginx / Caddy / Traefik), що веде на порт 3000.

### Дев-сервер (щоб не проіндексувався)

Залив на дев/стейджинг і не хочеш, щоб Google його бачив? В **адмінці** (вгорі) є галочка **«🔒 Закрито від індексації»** — увімкни її. Тоді на весь сайт віддається `X-Robots-Tag: noindex` і `robots.txt` стає `Disallow: /`. Перемикається миттєво, без перезбірки. Для бойового домену — просто вимкни її.

## 🔎 SEO

Вбудовано «під ключ»:

- **Метадані** — title-шаблони, description, keywords, canonical на кожній сторінці.
- **OpenGraph + Twitter cards** — з авто-згенерованим брендованим OG-зображенням (`/opengraph-image`).
- **Структуровані дані JSON-LD** — `Organization` + `WebSite` на всіх сторінках; `Product` (з ціною/наявністю), `Offer`, `BreadcrumbList` на сторінках товару.
- **`robots.txt`** (`/robots.txt`) + **`sitemap.xml`** (`/sitemap.xml`, з усіма товарами) + **web-manifest**.
- Сторінки товарів **рендеряться на сервері з живими даними** (ISR, оновлення щохвилини) — тож ціни/фото в пошуку актуальні.
- Канонічний домен береться з `SITE_URL` (root `.env`, build-arg). Локально — `http://localhost:3000`.
- **Перемикач індексації** в адмінці — закриває сайт від пошукових систем (для дев-серверів), керується в рантаймі.

> Дані (SQLite + фото) лежать у волюмі `backdata`. Для бекапу — збережи цей волюм.

## 🔒 Безпека

Вже вбудовано:

- **Бекенд не публічний** — доступний лише в docker-мережі, назовні дивиться тільки фронт (порт 3000).
- **Security-headers** — `helmet` + CSP на беку, `X-Frame-Options`/`nosniff`/`Referrer-Policy` на фронті; вимкнено `X-Powered-By`.
- **Rate-limiting** — захист логіна адміна від брутфорсу (20 спроб / 15 хв) та публічних заявок від спаму (30 / год з IP).
- **Завантаження фото** — лише для адміна, без SVG (щоб уникнути XSS), із `X-Content-Type-Options: nosniff`.
- **Сильний `JWT_SECRET`** згенеровано у `back/.env`.

Що зробити перед продакшеном:

1. **HTTPS** — постав Caddy перед фронтом (див. [`Caddyfile.example`](Caddyfile.example)): авто-сертифікат Let's Encrypt, і прибери публічний порт 3000 (назовні лишається лише Caddy 80/443).
2. **Секрети** — свій `JWT_SECRET` (`openssl rand -hex 32`), надійний `ADMIN_PASSWORD`, свій `TELEGRAM_*` — усе в `back/.env` (він у `.gitignore`, не комітиться).
3. За кількома проксі — за потреби підкрути `app.set("trust proxy", …)` у `back/src/index.ts` для точного IP у rate-limit.

## 🛠 Локальна розробка без Docker

```bash
# Термінал 1 — бекенд
cd back && npm install && npm run dev      # http://localhost:4000

# Термінал 2 — фронтенд
cd front && npm install && npm run dev     # http://localhost:3000
```

Фронт проксіює `/api` та `/uploads` на `http://localhost:4000` (див. `front/next.config.ts` → `BACKEND_URL`). Деталі бекенду — у [`back/README.md`](back/README.md).
