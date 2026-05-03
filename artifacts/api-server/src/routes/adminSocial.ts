import { Router } from "express";
import { db } from "@workspace/db";
import {
  communityPosts, userCertificates, liveEvents,
} from "@workspace/db/schema";
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

// ─── LIVE EVENTS (Admin) ─────────────────────────────────────────────────────

router.get("/admin/live-events", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(liveEvents).orderBy(asc(liveEvents.scheduledAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/live-events", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(liveEvents).values({
      title: b.title ?? "Novo Evento",
      description: b.description ?? "",
      host: b.host ?? "",
      scheduledAt: new Date(b.scheduledAt),
      durationMinutes: b.durationMinutes ?? 60,
      meetingUrl: b.meetingUrl ?? "",
      topic: b.topic ?? "geral",
      maxParticipants: b.maxParticipants ?? 0,
      isPremiumOnly: b.isPremiumOnly ?? false,
      active: b.active ?? true,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/live-events/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(liveEvents).set({
      title: b.title, description: b.description, host: b.host,
      scheduledAt: b.scheduledAt ? new Date(b.scheduledAt) : undefined,
      durationMinutes: b.durationMinutes, meetingUrl: b.meetingUrl,
      topic: b.topic, maxParticipants: b.maxParticipants,
      isPremiumOnly: b.isPremiumOnly, active: b.active,
    }).where(eq(liveEvents.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/live-events/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(liveEvents).where(eq(liveEvents.id, req.params.id!)).returning({ id: liveEvents.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── COMMUNITY MODERATION (Admin) ─────────────────────────────────────────────

router.get("/admin/community-posts", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(communityPosts).orderBy(desc(communityPosts.createdAt)).limit(200);
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/community-posts/:id/pin", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [row] = await db.update(communityPosts)
      .set({ isPinned: req.body.isPinned })
      .where(eq(communityPosts.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/community-posts/:id/hide", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [row] = await db.update(communityPosts)
      .set({ isHidden: req.body.isHidden })
      .where(eq(communityPosts.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/community-posts/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(communityPosts).where(eq(communityPosts.id, req.params.id!)).returning({ id: communityPosts.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── CERTIFICATES (Admin) ─────────────────────────────────────────────────────

router.get("/admin/certificates", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(userCertificates).orderBy(desc(userCertificates.issuedAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/certificates", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    if (!b.deviceToken || !b.title) { res.status(400).json({ error: "deviceToken e title obrigatórios" }); return; }
    const [row] = await db.insert(userCertificates).values({
      deviceToken: b.deviceToken,
      title: b.title,
      description: b.description ?? "",
      pathId: b.pathId ?? null,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/certificates/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(userCertificates).where(eq(userCertificates.id, req.params.id!)).returning({ id: userCertificates.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
