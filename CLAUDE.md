# volt-house — Claude Code Guide

## Project Structure

Monorepo з двох частин:
- `back/` — Node.js + Express + Prisma (PostgreSQL)
- `front/` — Next.js 14

### Running locally
```bash
docker compose up -d --build   # піднімає postgres + back + front
# front: http://localhost:3000
# admin: http://localhost:3000/admin
```

### Production deploy (SSH)
```bash
ssh root@<server-ip>
cd /opt/e-kit
git pull
docker compose up -d --build
```

---

## Supplier Price Update Workflow

Коли надходить новий прайс від постачальника — виконується наступна процедура:

### 1. Підготовка даних
- Переглянь прайс (XLS, PDF, зображення)
- Витягни тільки товари **з цінами** (пропускай рядки без ціни)
- Визнач availability:
  - "В наявності" / вільний залишок > 0 → `in_stock`
  - "Очікуємо" / "Передзамовлення" / "В резерві" / замовлено > 0 → `preorder`
  - немає ні залишку ні замовлення → `unavailable`

### 2. Зіставлення з існуючими товарами
```bash
# Отримай список всіх товарів
curl -s http://localhost:3000/api/products | python3 -c "
import json,sys
for p in json.load(sys.stdin):
    print(p['id']+'|'+p['name']+'|'+p['category'])"
```
Зістав товари з прайсу з існуючими по назві/моделі. Якщо товару немає — додай у `NEW_PRODUCTS`.

### 3. Знайди ID постачальника
```bash
docker exec volthouse-back node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.supplier.findMany().then(r => r.forEach(s => console.log(s.id, s.name, s.active))).finally(() => p.\$disconnect());
"
```

### 4. Створи seed скрипт
Скопіюй шаблон і заповни:
```bash
cp back/src/seed-supplier-template.ts back/src/seed-<supplier>.ts
```
Додай скрипт у `back/package.json`:
```json
"seed:<supplier>": "tsx src/seed-<supplier>.ts",
"seed:<supplier>:prod": "node dist/seed-<supplier>.js"
```

### 5. Деплой і запуск
```bash
# На сервері:
cd /opt/e-kit && git pull
docker compose up -d --build back
docker exec volthouse-back node dist/seed-<supplier>.js
```

### Приклади готових скриптів
- `back/src/seed-solarflow.ts` — SOLAR FLOW (прайс від 2026-08-26)
- `back/src/seed-sig.ts` — СІГ Солар Інвест Груп (SIG.xls від 2026-08-26)

---

## Database

- **Production**: PostgreSQL всередині Docker (`e-kit-postgres`)
- **Local `.env`**: може бути SQLite — для продакшн змін завжди використовуй seed скрипти через `docker exec`
- Prisma schema: `back/prisma/schema.prisma`

## Admin API Auth
```
POST /api/auth/login  { email, password }  → { token }
```
Credentials у `back/.env` (ADMIN_EMAIL, ADMIN_PASSWORD).
