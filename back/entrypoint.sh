#!/bin/sh
set -e

echo "▶ Syncing PostgreSQL schema…"
npx prisma db push --skip-generate

if [ -f /app/data/volthouse.db ]; then
  echo "▶ Preparing legacy SQLite schema for a lossless import…"
  npx prisma db push --schema prisma/sqlite-legacy.prisma --skip-generate
fi

echo "▶ Importing legacy SQLite data when required…"
node dist/migrate-sqlite-to-postgres.js

echo "▶ Seeding database…"
node dist/seed.js

echo "▶ Starting API server…"
exec node dist/index.js
