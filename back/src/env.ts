import dotenv from "dotenv";

dotenv.config();

// Local development can override this; Docker uses the PostgreSQL service.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://e_kit:e-kit-local-change-me@localhost:5432/e_kit?schema=public";
}

export const env = {
  PORT: parseInt(process.env.PORT || "4000", 10),
  DATABASE_URL: process.env.DATABASE_URL,
  LEGACY_SQLITE_URL: process.env.LEGACY_SQLITE_URL || "file:/app/data/volthouse.db",
  JWT_SECRET: process.env.JWT_SECRET || "dev-secret-change-me",

  // Comma-separated list of allowed origins, or "*" for any
  CORS_ORIGIN: process.env.CORS_ORIGIN || "*",

  // Telegram — leave empty to disable Telegram notifications
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || "",
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || "",

  // Where uploaded product images are stored (served at /uploads)
  UPLOAD_DIR: process.env.UPLOAD_DIR || "uploads",
};
