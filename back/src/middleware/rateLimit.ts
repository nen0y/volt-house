import rateLimit from "express-rate-limit";

// Brute-force protection for admin login.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Забагато спроб входу. Спробуйте за кілька хвилин." },
});

// Spam protection for the public lead form.
export const leadsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Забагато заявок з вашої адреси. Спробуйте пізніше." },
});
