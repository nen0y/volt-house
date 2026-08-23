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
RUN npx prisma generate && npm run build

# SQLite data directory (mounted as a volume in docker-compose)
RUN mkdir -p /app/data

EXPOSE 4000

RUN chmod +x ./entrypoint.sh
CMD ["./entrypoint.sh"]
