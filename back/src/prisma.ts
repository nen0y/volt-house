import "./env"; // ensure dotenv runs before the client reads DATABASE_URL
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient({
  log: ["warn", "error"],
});
