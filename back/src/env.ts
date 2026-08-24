import dotenv from "dotenv";

dotenv.config();

// Default local SQLite location if none provided (resolved relative to prisma/).
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:./volthouse.db";
}

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",

  // Admin account used to log into /admin
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "omelyazuk@gmail.com",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "VoltHouse2024",

  // Comma-separated list of allowed origins, or "*" for any
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // Telegram — leave empty to disable Telegram notifications
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

  // Where uploaded product images are stored (served at /uploads)
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
};
