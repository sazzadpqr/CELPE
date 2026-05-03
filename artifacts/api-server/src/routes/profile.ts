import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, adminAdsConfig } from "@workspace/db/schema";
import { eq, sql, ne } from "drizzle-orm";

const router = Router();

router.get("/profile/check-username", async (req, res) => {
  const { username, deviceToken } = req.query as { username?: string; deviceToken?: string };
  if (!username) { res.status(400).json({ error: "username required" }); return; }
  const handle = String(username).trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (handle.length < 3) { res.json({ available: false, reason: "too_short" }); return; }
  try {
    const [row] = await db.select({ id: profiles.id, deviceToken: profiles.deviceToken }).from(profiles).where(eq(profiles.username, handle));
    if (!row) { res.json({ available: true, handle }); return; }
    if (deviceToken && row.deviceToken === deviceToken) { res.json({ available: true, handle, own: true }); return; }
    res.json({ available: false, reason: "taken" });
  } catch (err) {
    req.log.error(err, "check-username error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/profile/:deviceToken", async (req, res) => {
  const { deviceToken } = req.params as { deviceToken: string };
  try {
    const [row] = await db
      .select({
        aiCredits: profiles.aiCredits,
        isPremium: profiles.isPremium,
        username: profiles.username,
        avatarEmoji: profiles.avatarEmoji,
        displayName: profiles.displayName,
        email: profiles.email,
        level: profiles.level,
        streakDays: profiles.streakDays,
        dailyGoalMinutes: profiles.dailyGoalMinutes,
        targetDate: profiles.targetDate,
      })
      .from(profiles)
      .where(eq(profiles.deviceToken, deviceToken));
    if (!row) { res.status(404).json({ error: "Profile not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err, "profile fetch error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/profile/:deviceToken", async (req, res) => {
  const { deviceToken } = req.params as { deviceToken: string };
  const body = req.body as {
    username?: string;
    avatarEmoji?: string;
    displayName?: string;
    level?: string;
    targetDate?: string | null;
    dailyGoalMinutes?: number;
  };

  try {
    if (body.username !== undefined && body.username !== null && body.username !== "") {
      const handle = body.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (handle.length < 3) {
        res.status(400).json({ error: "Username must be at least 3 characters" });
        return;
      }
      const [conflict] = await db
        .select({ id: profiles.id })
        .from(profiles)
        .where(eq(profiles.username, handle));
      if (conflict) {
        const [self] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.deviceToken, deviceToken));
        if (!self || self.id !== conflict.id) {
          res.status(409).json({ error: "Username already taken" });
          return;
        }
      }
      body.username = handle;
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (body.username !== undefined) updateData["username"] = body.username || null;
    if (body.avatarEmoji !== undefined) updateData["avatarEmoji"] = body.avatarEmoji;
    if (body.displayName !== undefined) updateData["displayName"] = body.displayName;
    if (body.level !== undefined) updateData["level"] = body.level;
    if (body.targetDate !== undefined) updateData["targetDate"] = body.targetDate;
    if (body.dailyGoalMinutes !== undefined) updateData["dailyGoalMinutes"] = body.dailyGoalMinutes;

    const [updated] = await db
      .update(profiles)
      .set(updateData as Parameters<typeof db.update>[0] extends infer T ? any : never)
      .where(eq(profiles.deviceToken, deviceToken))
      .returning({
        username: profiles.username,
        avatarEmoji: profiles.avatarEmoji,
        displayName: profiles.displayName,
        email: profiles.email,
        level: profiles.level,
        isPremium: profiles.isPremium,
        aiCredits: profiles.aiCredits,
        streakDays: profiles.streakDays,
        dailyGoalMinutes: profiles.dailyGoalMinutes,
        targetDate: profiles.targetDate,
      });

    if (!updated) {
      const [created] = await db
        .insert(profiles)
        .values({ deviceToken, ...updateData as any })
        .returning({
          username: profiles.username,
          avatarEmoji: profiles.avatarEmoji,
          displayName: profiles.displayName,
          email: profiles.email,
          level: profiles.level,
          isPremium: profiles.isPremium,
          aiCredits: profiles.aiCredits,
          streakDays: profiles.streakDays,
          dailyGoalMinutes: profiles.dailyGoalMinutes,
          targetDate: profiles.targetDate,
        });
      res.json(created);
      return;
    }

    res.json(updated);
  } catch (err) {
    req.log.error(err, "profile update error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/profile/:deviceToken/rewarded-ad", async (req, res) => {
  const { deviceToken } = req.params as { deviceToken: string };
  try {
    const [adsRow] = await db
      .select({
        adsEnabled: adminAdsConfig.adsEnabled,
        rewardedAdsEnabled: adminAdsConfig.rewardedAdsEnabled,
        rewardedAdCreditAmount: adminAdsConfig.rewardedAdCreditAmount,
        rewardedAdMaxPerDay: adminAdsConfig.rewardedAdMaxPerDay,
      })
      .from(adminAdsConfig)
      .where(eq(adminAdsConfig.id, "singleton"));

    const cfg = adsRow ?? {
      adsEnabled: false,
      rewardedAdsEnabled: false,
      rewardedAdCreditAmount: 1,
      rewardedAdMaxPerDay: 3,
    };

    if (!cfg.adsEnabled || !cfg.rewardedAdsEnabled) {
      res.status(403).json({ error: "Rewarded ads not enabled" });
      return;
    }

    const creditAmount = cfg.rewardedAdCreditAmount ?? 1;

    const [existing] = await db
      .select({ aiCredits: profiles.aiCredits })
      .from(profiles)
      .where(eq(profiles.deviceToken, deviceToken));

    let newCredits: number;
    if (!existing) {
      const [created] = await db
        .insert(profiles)
        .values({ deviceToken, aiCredits: creditAmount })
        .onConflictDoUpdate({
          target: profiles.deviceToken,
          set: {
            aiCredits: sql`${profiles.aiCredits} + ${creditAmount}`,
            updatedAt: new Date(),
          },
        })
        .returning({ aiCredits: profiles.aiCredits });
      newCredits = created?.aiCredits ?? creditAmount;
    } else {
      const [updated] = await db
        .update(profiles)
        .set({
          aiCredits: sql`${profiles.aiCredits} + ${creditAmount}`,
          updatedAt: new Date(),
        })
        .where(eq(profiles.deviceToken, deviceToken))
        .returning({ aiCredits: profiles.aiCredits });
      newCredits = updated?.aiCredits ?? existing.aiCredits + creditAmount;
    }

    req.log.info({ deviceToken, creditAmount, newCredits }, "rewarded ad credit awarded");
    res.json({ credited: creditAmount, aiCredits: newCredits, maxPerDay: cfg.rewardedAdMaxPerDay });
  } catch (err) {
    req.log.error(err, "rewarded ad error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
