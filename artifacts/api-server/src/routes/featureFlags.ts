import { Router } from "express";
import { db } from "@workspace/db";
import { featureFlags } from "@workspace/db/schema";
import { asc, eq } from "drizzle-orm";

const router = Router();

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

router.get("/admin/feature-flags", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.category));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

router.put("/admin/feature-flags/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [row] = await db.update(featureFlags)
      .set({ enabled: Boolean(req.body.enabled), updatedAt: new Date() })
      .where(eq(featureFlags.id, req.params.id!))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

router.get("/content/feature-flags", async (_req, res) => {
  try {
    const rows = await db.select().from(featureFlags);
    const map: Record<string, boolean> = {};
    for (const row of rows) map[row.flagKey] = row.enabled;
    res.json(map);
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

export default router;