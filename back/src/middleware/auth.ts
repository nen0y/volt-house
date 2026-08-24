import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

export interface AuthedRequest extends Request {
  admin?: { id: string; email: string };
}

export function signToken(payload: { id: string; email: string }): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Не авторизовано" });

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as { id: string; email: string };
    req.admin = { id: decoded.id, email: decoded.email };
    next();
  } catch {
    return res.status(401).json({ error: "Недійсний або прострочений токен" });
  }
}
