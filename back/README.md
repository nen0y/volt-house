# VoltHouse — Backend API

REST API + admin panel for the VoltHouse storefront (the Next.js app in `../front`).

Repo layout: the git repository root contains `front/` (Next.js storefront) and `back/` (this API).

- **Stack:** Node.js + Express + TypeScript, Prisma ORM, PostgreSQL, JWT auth
- **Runs in Docker** together with PostgreSQL via `docker compose`
- Serves the product catalogue & testimonials to the frontend
- Receives all **заявки** (orders / consultations / callbacks), stores them, and **sends them to the admin's Telegram group**
- Ships with a built-in **admin panel** and a **seeder**

---

## Quick start (Docker)

```bash
cd back
docker compose up -d --build
```

This starts:

| Service | URL | Notes |
|---|---|---|
| API | http://localhost:4000 | REST endpoints under `/api` |
| Admin panel | http://localhost:4000/admin | login below |

On startup the backend automatically **syncs the schema** (`prisma db push`) and **runs the content seeder**. Existing administrator records in PostgreSQL are never overwritten by the seeder.

### Admin credentials

The administrator is stored in PostgreSQL and the password is stored only as a bcrypt hash. Change the login email or password in **System → Security** in the admin panel. Restarting or re-seeding does not reset credentials.

### Logs / stopping
```bash
docker compose logs -f backend     # follow logs (Telegram delivery shows here)
docker compose down                # stop
docker compose down -v             # stop + wipe database volume
```

---

## Telegram notifications (заявки)

Every submitted lead is pushed to the admin's Telegram group. Enabled once both env vars are set:

```env
TELEGRAM_BOT_TOKEN=8123456789:AAExxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=-1001234567890
```

Setup:
1. Create a bot: message [@BotFather](https://t.me/BotFather) → `/newbot` → copy the token.
2. Add the bot to your group.
3. Get the group chat id: in @BotFather run `/setprivacy` → **Disable** for the bot (or make it a group admin), send any message in the group, then open
   `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `result[].message.chat.id` (negative for groups/supergroups).
4. Put both values in `.env` and restart (`node dist/index.js`, or `docker compose up -d --build`).

The server logs `Leads → Telegram: enabled (chat …)` on startup when configured. Leads are **always** stored in the database and visible in the admin panel, even if Telegram delivery is off or fails.

---

## API reference

### Public
| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products (`?category=inverter|battery|solar`) |
| GET | `/api/products/:id` | Single product |
| GET | `/api/testimonials` | List testimonials |
| POST | `/api/leads` | Submit a lead (see below) |
| GET | `/health` | Health check |

**POST `/api/leads`** body:
```jsonc
{
  "type": "order",           // order | consultation | callback
  "name": "Іван Петренко",
  "phone": "+380...",
  "email": "optional@mail.com",
  "interest": "full-system",  // consultations
  "message": "…",             // consultations
  "items": [                   // orders
    { "id": "inv-5kw", "name": "VoltMax 5kW", "price": 1299, "quantity": 1 }
  ],
  "total": 1299
}
```

### Admin (require `Authorization: Bearer <token>`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → `{ token }` |
| GET | `/api/auth/me` | Current admin |
| GET | `/api/leads` | List leads (`?type=&status=`) |
| GET | `/api/leads/stats` | Counts by type/status |
| PATCH | `/api/leads/:id` | `{ status: new|in_progress|done }` |
| DELETE | `/api/leads/:id` | Delete lead |
| POST | `/api/products` | Create/upsert product |
| PUT | `/api/products/:id` | Update product |
| DELETE | `/api/products/:id` | Delete product |
| POST | `/api/products/:id/images` | Upload one or more images (multipart `images`) |
| DELETE | `/api/products/:id/images` | Remove one image (body `{ url }`) |
| POST / PUT / DELETE | `/api/home-sections[/:id]` | Manage editable homepage sections |
| POST | `/api/testimonials` | Create/upsert testimonial |
| DELETE | `/api/testimonials/:id` | Delete testimonial |
| PUT / POST | `/api/content/:key` | Edit a content block (heading/subheading/body/productIds) |
| PUT | `/api/calculator` | Update calculator recommendation rules |
| POST | `/api/calculator/appliances` | Create/upsert a calculator appliance |
| DELETE | `/api/calculator/appliances/:id` | Delete an appliance |
| POST | `/api/categories` | Create/upsert a category |
| PUT | `/api/categories/:key` | Edit a category (label/icon/description/order/enabled) |
| DELETE | `/api/categories/:key` | Delete a category |

Public read endpoints also include `GET /api/content` (all editable text blocks), `GET /api/calculator` (`{ appliances, recommendation }`), `GET /api/categories` (enabled categories; `?all=1` for admin), and `GET /api/home-sections` (editable homepage blocks; `?all=1` for admin).

**Homepage builder** — the `Головна` admin tab manages the homepage as an ordered list of sections. Each section is a product grid (hand-picked products *or* a whole category) or a call-to-action band with lead buttons; every product section can show a "catalog" button that links to its category. Reorder with ↑/↓, hide/show, add/remove.

**Product images** — upload one or more images per product in the admin (Товари → edit → Фото товару). Files are stored under `UPLOAD_DIR` and served at `/uploads/...`. If a product has no uploaded image, the storefront falls back to the built-in category illustration.

**Power calculator** auto-picks the cheapest suitable products from the **whole catalogue** by reading each product's power (`power`, W) and capacity (`capacity`, Wh/kWh) — it is not tied to fixed product ids. Add an inverter/battery/station and the calculator considers it automatically. The admin `recommendation` rules are just: `autonomyHours`, `powerReservePct`, and which categories act as inverters / batteries / all-in-one stations. It suggests either a single all-in-one station (if one covers the load) or an inverter + battery (battery ×quantity when one unit isn't enough).

Categories are **editable in the admin** (Категорії tab): label, singular label, description, emoji icon, order, visibility — and you can add/remove categories. Default set: `inverter | battery | solar | station` (station = portable power stations, e.g. EcoFlow-type). A product's `category` is any category key.

---

## Connecting the frontend

The Next.js app reads `NEXT_PUBLIC_API_URL`. A `.env.local` is already created in `../front`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

Run the frontend:
```bash
cd ../front
npm install
npm run dev        # http://localhost:3000
```

Products, testimonials and all forms now flow through the backend. If the API is down, the storefront falls back to its local bundled data so it never breaks.

---

## Running the backend without Docker (optional)

SQLite needs no separate DB server, so you can just run the Node server on the host:

```bash
npm install
npm run prisma:generate
npm run prisma:push          # creates prisma/volthouse.db
npm run seed
npm run dev                  # http://localhost:4000
```

---

## Seeder

```bash
npm run seed          # local (tsx)
# inside Docker it runs automatically on startup
```

The seeder is **idempotent** (upserts by id), so it is safe to run repeatedly. It loads:
- 8 products (inverters, batteries, solar panels, portable power stations)
- 4 categories (editable)
- 4 testimonials
- 16 power-calculator appliances + recommendation rules
- 4 content blocks (hero, how_it_works, promo, contact)
- 7 homepage sections (Новинки, per-category blocks incl. stations, a CTA band, Рекомендовані рішення)

Content blocks and categories are only **created if missing** on re-seed, so your admin edits are preserved. Calculator rules are normalised to the current shape on re-seed (edits kept when already in the new shape).

Edit `src/data.ts` to change the seeded catalogue.
