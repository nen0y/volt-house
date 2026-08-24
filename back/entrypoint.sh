#!/bin/sh
set -e

echo "▶ Syncing database schema (prisma db push)…"
npx prisma db push --skip-generate --accept-data-loss

echo "▶ Seeding database…"
node dist/seed.js

echo "▶ Starting API server…"
exec node dist/index.js
