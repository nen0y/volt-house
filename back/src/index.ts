import path from "path";
import express from "express";
import cors from "cors";
import { env } from "./env";
import { prisma } from "./prisma";
import { authRouter } from "./routes/auth";
import { productsRouter } from "./routes/products";
import { testimonialsRouter } from "./routes/testimonials";
import { leadsRouter } from "./routes/leads";
import { contentRouter } from "./routes/content";
import { calculatorRouter } from "./routes/calculator";
import { categoriesRouter } from "./routes/categories";
import { homeRouter } from "./routes/home";
import { ensureUploadDir, uploadDir } from "./upload";

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────
const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : corsOrigins,
  })
);

app.use(express.json({ limit: "1mb" }));

// ── Health ──────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, service: "volthouse-backend" }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ── API routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/content", contentRouter);
app.use("/api/calculator", calculatorRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/home-sections", homeRouter);

// ── Uploaded product images ─────────────────────────────────────────────────
ensureUploadDir();
app.use("/uploads", express.static(uploadDir));

// ── Admin panel (static SPA) ────────────────────────────────────────────────
const adminDir = path.join(__dirname, "..", "public", "admin");
app.use("/admin", express.static(adminDir));
app.get("/admin/*", (_req, res) => res.sendFile(path.join(adminDir, "index.html")));
app.get("/", (_req, res) => res.redirect("/admin"));

// ── Error handler ─────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: "Внутрішня помилка сервера" });
});

const server = app.listen(env.PORT, () => {
  console.log(`\n🔌 VoltHouse API running on http://localhost:${env.PORT}`);
  console.log(`   Admin panel:  http://localhost:${env.PORT}/admin`);
  console.log(`   Admin login:  ${env.ADMIN_EMAIL}`);
  console.log(
    `   Leads → Telegram: ${
      env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID
        ? `enabled (chat ${env.TELEGRAM_CHAT_ID})`
        : "disabled (set TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID)"
    }\n`
  );
});

async function shutdown() {
  console.log("\n[server] Shutting down…");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
