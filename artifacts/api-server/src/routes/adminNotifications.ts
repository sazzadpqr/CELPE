import { Router } from "express";
import { db } from "@workspace/db";
import { notificationCampaigns, userNotifications, profiles } from "@workspace/db/schema";
import { eq, desc, asc } from "drizzle-orm";
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

router.get("/admin/notification-campaigns", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(notificationCampaigns).orderBy(desc(notificationCampaigns.createdAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/notification-campaigns", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(notificationCampaigns).values({
      title: b.title ?? "Nova Campanha",
      body: b.body ?? "",
      type: b.type ?? "general",
      targetType: b.targetType ?? "all",
      targetLevel: b.targetLevel ?? null,
      targetQuery: b.targetQuery ?? {},
      deepLink: b.deepLink ?? "",
      externalUrl: b.externalUrl ?? "",
      sendInApp: b.sendInApp ?? true,
      sendPush: b.sendPush ?? false,
      status: "draft",
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : undefined,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/notification-campaigns/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(notificationCampaigns)
      .set({
        title: b.title, body: b.body, type: b.type, targetType: b.targetType,
        targetLevel: b.targetLevel, targetQuery: b.targetQuery,
        deepLink: b.deepLink, externalUrl: b.externalUrl,
        sendInApp: b.sendInApp, sendPush: b.sendPush,
        scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(notificationCampaigns.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/notification-campaigns/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(notificationCampaigns).where(eq(notificationCampaigns.id, req.params.id!)).returning({ id: notificationCampaigns.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/notification-campaigns/:id/send", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [campaign] = await db.select().from(notificationCampaigns).where(eq(notificationCampaigns.id, req.params.id!));
    if (!campaign) { res.status(404).json({ error: "Campaign not found" }); return; }
    if (campaign.status === "sent") { res.status(400).json({ error: "Campaign already sent" }); return; }

    let allProfiles = await db.select({ deviceToken: profiles.deviceToken, level: profiles.level, isPremium: profiles.isPremium }).from(profiles);

    if (campaign.targetType === "premium") allProfiles = allProfiles.filter(p => p.isPremium);
    if (campaign.targetType === "free") allProfiles = allProfiles.filter(p => !p.isPremium);
    if (campaign.targetType === "level" && campaign.targetLevel) allProfiles = allProfiles.filter(p => p.level === campaign.targetLevel);

    let inAppCreated = 0;
    if (campaign.sendInApp && allProfiles.length > 0) {
      const notifs = allProfiles.map(p => ({
        deviceToken: p.deviceToken,
        campaignId: campaign.id,
        title: campaign.title,
        body: campaign.body,
        type: campaign.type,
        deepLink: campaign.deepLink,
      }));
      const batchSize = 100;
      for (let i = 0; i < notifs.length; i += batchSize) {
        await db.insert(userNotifications).values(notifs.slice(i, i + batchSize));
        inAppCreated += notifs.slice(i, i + batchSize).length;
      }
    }

    await db.update(notificationCampaigns)
      .set({ status: "sent", sentAt: new Date(), targetedCount: allProfiles.length, inAppCreatedCount: inAppCreated, updatedAt: new Date() })
      .where(eq(notificationCampaigns.id, req.params.id!));

    res.json({ ok: true, targeted: allProfiles.length, inAppCreated, pushSent: 0 });
  } catch (err) {
    res.status(500).json({ error: "Send failed" });
  }
});

// ─── USER-FACING NOTIFICATIONS ────────────────────────────────────────────────

router.get("/notifications", async (req, res) => {
  const token = req.headers["x-device-token"] as string;
  if (!token) { res.status(400).json({ error: "Device token required" }); return; }
  try {
    const rows = await db.select().from(userNotifications)
      .where(eq(userNotifications.deviceToken, token))
      .orderBy(desc(userNotifications.createdAt)).limit(50);
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/notifications/:id/read", async (req, res) => {
  const token = req.headers["x-device-token"] as string;
  if (!token) { res.status(400).json({ error: "Device token required" }); return; }
  try {
    const [row] = await db.update(userNotifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(userNotifications.id, req.params.id!))
      .returning({ id: userNotifications.id });
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/notifications/read-all", async (req, res) => {
  const token = req.headers["x-device-token"] as string;
  if (!token) { res.status(400).json({ error: "Device token required" }); return; }
  try {
    await db.update(userNotifications)
      .set({ read: true, readAt: new Date() })
      .where(eq(userNotifications.deviceToken, token));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
