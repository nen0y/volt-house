import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAdmin } from "../middleware/auth";

export const settingsRouter = Router();

async function getSeo() {
  const row = await prisma.setting.findUnique({ where: { key: "seo" } });
  let indexable = true; // open to indexing by default
  if (row) {
    try {
      const v = JSON.parse(row.value);
      if (typeof v.indexable === "boolean") indexable = v.indexable;
    } catch {
      /* ignore */
    }
  }
  return { indexable };
}

// GET /api/settings/seo (public) — is the site open to search-engine indexing?
settingsRouter.get("/seo", async (_req, res) => {
  res.json(await getSeo());
});

const seoSchema = z.object({ indexable: z.boolean() });

// PUT /api/settings/seo (admin) — toggle indexing on/off
settingsRouter.put("/seo", requireAdmin, async (req, res) => {
  const parsed = seoSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Некоректні дані" });
  const value = JSON.stringify({ indexable: parsed.data.indexable });
  await prisma.setting.upsert({
    where: { key: "seo" },
    create: { key: "seo", value },
    update: { value },
  });
  res.json({ indexable: parsed.data.indexable });
});
