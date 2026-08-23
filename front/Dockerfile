FROM node:20-alpine

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm install

# Build the production app
COPY . .

# The browser uses relative URLs; the Next server proxies /api & /uploads to the
# backend at BACKEND_URL (baked into the rewrite manifest at build time).
ARG BACKEND_URL=http://back:4000
ENV BACKEND_URL=$BACKEND_URL
# Canonical public URL for SEO (canonical/OG/sitemap). Set to your domain in prod.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:3000
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_URL=""
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["npx", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
