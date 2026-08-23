import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../prisma";
import { signToken, requireAdmin, AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
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
