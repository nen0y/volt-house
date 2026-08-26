import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken, requireAdmin, AuthedRequest } from "../middleware/auth";
import { authLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });

  const { email, password } = parsed.data;
  const user = await prisma.adminUser.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return res.status(401).json({ error: "Невірний email або пароль" });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Невірний email або пароль" });

  const token = signToken({ id: user.id, email: user.email });
  res.json({ token, admin: { id: user.id, email: user.email } });
});

authRouter.get("/me", requireAdmin, (req: AuthedRequest, res) => {
  res.json({ admin: req.admin });
});

const profileSchema = z
  .object({
    email: z.string().email().optional(),
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128).optional(),
  })
  .refine((data) => data.email !== undefined || data.newPassword !== undefined, {
    message: "Вкажіть новий email або пароль",
  });

// Credentials live only in PostgreSQL. Passwords are never stored or returned in plain text.
authRouter.put("/profile", requireAdmin, async (req: AuthedRequest, res) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Перевірте email і пароль (мінімум 8 символів)" });

  const user = await prisma.adminUser.findUnique({ where: { id: req.admin!.id } });
  if (!user) return res.status(404).json({ error: "Адміністратора не знайдено" });
  const passwordMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!passwordMatches) return res.status(400).json({ error: "Поточний пароль неправильний" });

  const email = parsed.data.email?.trim().toLowerCase() || user.email;
  const passwordHash = parsed.data.newPassword
    ? await bcrypt.hash(parsed.data.newPassword, 12)
    : user.passwordHash;
  try {
    const updated = await prisma.adminUser.update({
      where: { id: user.id },
      data: { email, passwordHash },
    });
    const token = signToken({ id: updated.id, email: updated.email });
    res.json({ token, admin: { id: updated.id, email: updated.email } });
  } catch (error: any) {
    if (error?.code === "P2002") return res.status(409).json({ error: "Цей email уже використовується" });
    throw error;
  }
});
