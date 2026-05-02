import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, attempts, subscriptions } from "@workspace/db/schema";
import { eq, desc, ilike, or, sql } from "drizzle-orm";
import { getStoredPasswordHash } from "../lib/adminStore.js";

const router = Router();

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const token = authHeader.slice(7);
  const storedHash = getStoredPasswordHash();
  const password = storedHash ?? (process.env["SESSION_SECRET"] ?? "admin");
  if (token !== Buffer.from(password).toString("base64")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

router.get("/admin/users", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const search = (req.query.search as string) ?? "";
    const premium = req.query.premium as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) ?? "1", 10));
    const limit = 20;
    const offset = (page - 1) * limit;

    let query = db.select({
      id: profiles.id,
      deviceToken: profiles.deviceToken,
      displayName: profiles.displayName,
      email: profiles.email,
      level: profiles.level,
      isPremium: profiles.isPremium,
      premiumPlan: profiles.premiumPlan,
      aiCredits: profiles.aiCredits,
      streakDays: profiles.streakDays,
      xpTotal: profiles.xpTotal,
      diagnosticDone: profiles.diagnosticDone,
      createdAt: profiles.createdAt,
      updatedAt: profiles.updatedAt,
    }).from(profiles).$dynamic();

    if (search) {
      query = query.where(or(
        ilike(profiles.displayName, `%${search}%`),
        ilike(profiles.email, `%${search}%`),
        ilike(profiles.deviceToken, `%${search}%`),
      ));
    }
    if (premium === "true") query = query.where(eq(profiles.isPremium, true));
    if (premium === "false") query = query.where(eq(profiles.isPremium, false));

    const rows = await query.orderBy(desc(profiles.createdAt)).limit(limit).offset(offset);

    const [total] = await db.select({ count: sql<number>`count(*)` }).from(profiles);

    const attemptsCount = await db.select({
      deviceToken: attempts.deviceToken,
      count: sql<number>`count(*)`,
    }).from(attempts).groupBy(attempts.deviceToken);

    const attemptsMap: Record<string, number> = {};
    for (const a of attemptsCount) attemptsMap[a.deviceToken] = Number(a.count);

    res.json({
      users: rows.map(u => ({ ...u, attemptsCount: attemptsMap[u.deviceToken] ?? 0 })),
      total: Number(total?.count ?? 0),
      page,
      pages: Math.ceil(Number(total?.count ?? 0) / limit),
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.put("/admin/users/:deviceToken/toggle-premium", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const { isPremium, premiumPlan } = req.body as { isPremium: boolean; premiumPlan?: string };
    const [row] = await db.update(profiles)
      .set({ isPremium, premiumPlan: isPremium ? (premiumPlan ?? "admin_manual") : null, updatedAt: new Date() })
      .where(eq(profiles.deviceToken, req.params.deviceToken!))
      .returning({ id: profiles.id, isPremium: profiles.isPremium, premiumPlan: profiles.premiumPlan });
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/users/:deviceToken/credits", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const { aiCredits } = req.body as { aiCredits: number };
    const [row] = await db.update(profiles)
      .set({ aiCredits: Math.max(0, aiCredits), updatedAt: new Date() })
      .where(eq(profiles.deviceToken, req.params.deviceToken!))
      .returning({ id: profiles.id, aiCredits: profiles.aiCredits });
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/admin/users/:deviceToken/attempts", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(attempts)
      .where(eq(attempts.deviceToken, req.params.deviceToken!))
      .orderBy(desc(attempts.createdAt)).limit(20);
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/admin/stats/overview", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(profiles);
    const [premiumUsers] = await db.select({ count: sql<number>`count(*)` }).from(profiles).where(eq(profiles.isPremium, true));
    const [totalAttempts] = await db.select({ count: sql<number>`count(*)` }).from(attempts);
    res.json({
      totalUsers: Number(totalUsers?.count ?? 0),
      premiumUsers: Number(premiumUsers?.count ?? 0),
      freeUsers: Number(totalUsers?.count ?? 0) - Number(premiumUsers?.count ?? 0),
      totalAttempts: Number(totalAttempts?.count ?? 0),
    });
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
