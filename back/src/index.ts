import path from "path";
import express from "express";
import cors from "cors";
import helmet from "helmet";
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
import { settingsRouter } from "./routes/settings";
import { crmRouter } from "./routes/crm";
import { brandsRouter } from "./routes/brands";
import { ensureUploadDir, uploadDir } from "./upload";
import { startNightlyRetailPriceSync } from "./retail-price-sync";

const app = express();

// Behind the Next.js proxy (and optionally a reverse proxy) — trust the first hop
// so rate-limiting and req.ip use the real client address from X-Forwarded-For.
app.set("trust proxy", 1);
app.disable("x-powered-by");

// ── Security headers (helmet) ────────────────────────────────────────────────
// CSP tuned for the admin panel (inline styles) + uploaded images; HSTS is left
// to the TLS-terminating reverse proxy in production.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'self'"],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" },
    hsts: false,
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────
const corsOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim());
app.use(
  cors({
    origin: env.CORS_ORIGIN === "*" ? true : corsOrigins,
  })
);

app.use(express.json({ limit: "1mb" }));

// ── Health ──────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => res.json({ ok: true, service: "e-kit-backend" }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// ── API routes ────────────────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/products", productsRouter);
app.use("/api/testimonials", testimonialsRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/content", contentRouter);
app.use("/api/calculator", calculatorRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/brands", brandsRouter);
app.use("/api/home-sections", homeRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/crm", crmRouter);

// ── Uploaded product images ─────────────────────────────────────────────────
ensureUploadDir();
app.use(
  "/uploads",
  express.static(uploadDir, {
    setHeaders: (res) => {
      // Never let the browser sniff/execute an upload as a document (defence-in-depth).
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Disposition", "inline");
    },
  })
);

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

const WEAK_SECRETS = ["dev-secret-change-me", "volthouse-local-dev-secret", "change-this-secret-in-production"];
if (WEAK_SECRETS.includes(env.JWT_SECRET) || env.JWT_SECRET.length < 24) {
  console.warn(
    "\n⚠️  JWT_SECRET is weak/default — set a strong random value (e.g. `openssl rand -hex 32`) before going to production.\n"
  );
}

const server = app.listen(env.PORT, () => {
  console.log(`\n🔌 E-Kit API running on http://localhost:${env.PORT}`);
  console.log(`   Admin panel:  http://localhost:${env.PORT}/admin`);
  console.log(
    `   Leads → Telegram: ${
      env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID
        ? `enabled (chat ${env.TELEGRAM_CHAT_ID})`
        : "disabled (set TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID)"
    }\n`
  );
});
startNightlyRetailPriceSync();

async function shutdown() {
  console.log("\n[server] Shutting down…");
  server.close();
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
