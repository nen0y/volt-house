import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";
import { prisma } from "../prisma";

export interface AuthedRequest extends Request {
  admin?: { id: string; email: string; name: string; role: string };
}

export function signToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };
    const user = await prisma.adminUser.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, name: true, role: true, active: true },
    });
    if (!user || !user.active) return res.status(401).json({ error: "Обліковий запис вимкнено" });
    const managerAllowed = req.originalUrl.startsWith("/api/leads") ||
      req.originalUrl.startsWith("/api/auth") ||
      req.originalUrl.startsWith("/api/crm/installers") ||
      req.originalUrl.startsWith("/api/crm/price-matrix") ||
      req.originalUrl.startsWith("/api/crm/prices");
    if (user.role === "manager" && !managerAllowed) {
      return res.status(403).json({ error: "У вас немає доступу до цього розділу" });
    }
    req.admin = { id: user.id, email: user.email, name: user.name, role: user.role };
    next();
  } catch {
    return res.status(401).json({ error: "Недійсний або прострочений токен" });
  }
}

export function requireSuperAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.admin?.role !== "admin") return res.status(403).json({ error: "Доступно лише адміністратору" });
  next();
}
