import { Router } from "express";
import { db } from "@workspace/db";
import { profiles, adminAdsConfig } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

router.get("/profile/:deviceToken", async (req, res) => {
  const { deviceToken } = req.params as { deviceToken: string };
  try {
    const [row] = await db
      .select({ aiCredits: profiles.aiCredits, isPremium: profiles.isPremium })
      .from(profiles)
      .where(eq(profiles.deviceToken, deviceToken));
    if (!row) { res.status(404).json({ error: "Profile not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err, "profile fetch error");
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
