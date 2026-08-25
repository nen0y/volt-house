FROM node:20-alpine

WORKDIR /app

# System deps for Prisma engines on alpine
RUN apk add --no-cache openssl

# Install dependencies (cached layer)
COPY package*.json ./
COPY prisma ./prisma
RUN npm install

# Build
COPY . .
RUN npx prisma generate && npx prisma generate --schema prisma/sqlite-legacy.prisma && npm run build

# Uploaded media and the read-only legacy SQLite backup stay in this volume.
RUN mkdir -p /app/data

EXPOSE 4000

RUN chmod +x ./entrypoint.sh
CMD ["./entrypoint.sh"]
