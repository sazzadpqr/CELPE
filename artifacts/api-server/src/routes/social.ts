import { Router } from "express";
import { db } from "@workspace/db";
import {
  communityPosts, communityPostLikes, userCertificates, liveEvents, profiles,
} from "@workspace/db/schema";
import { eq, desc, asc, and, gt } from "drizzle-orm";

const router = Router();

// ─── LEADERBOARD ─────────────────────────────────────────────────────────────

router.get("/content/leaderboard", async (req, res) => {
  try {
    const sortBy = (req.query["sort"] as string) === "streak" ? "streak" : "xp";
    const rows = await db.select({
      id: profiles.id,
      username: profiles.username,
      displayName: profiles.displayName,
      avatarEmoji: profiles.avatarEmoji,
      level: profiles.level,
      xpTotal: profiles.xpTotal,
      streakDays: profiles.streakDays,
    }).from(profiles)
      .orderBy(sortBy === "streak" ? desc(profiles.streakDays) : desc(profiles.xpTotal))
      .limit(20);

    const result = rows.map((r, i) => ({
      rank: i + 1,
      username: r.username || `user_${r.id.slice(0, 6)}`,
      displayName: r.displayName || r.username || "Estudante",
      avatarEmoji: r.avatarEmoji,
      level: r.level,
      xpTotal: r.xpTotal,
      streakDays: r.streakDays,
    }));
    res.json(result);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── COMMUNITY ───────────────────────────────────────────────────────────────

router.get("/content/community-posts", async (req, res) => {
  try {
    const topic = req.query["topic"] as string | undefined;
    const deviceToken = req.headers["x-device-token"] as string | undefined;

    const rows = await db.select().from(communityPosts)
      .where(
        topic && topic !== "todos"
          ? and(eq(communityPosts.isHidden, false), eq(communityPosts.topic, topic))
          : eq(communityPosts.isHidden, false)
      )
      .orderBy(desc(communityPosts.isPinned), desc(communityPosts.createdAt))
      .limit(50);

    let likedIds: Set<string> = new Set();
    if (deviceToken) {
      const likes = await db.select({ postId: communityPostLikes.postId })
        .from(communityPostLikes)
        .where(eq(communityPostLikes.deviceToken, deviceToken));
      likedIds = new Set(likes.map((l) => l.postId));
    }

    res.json(rows.map((p) => ({ ...p, liked: likedIds.has(p.id) })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/content/community-posts", async (req, res) => {
  try {
    const { deviceToken, authorName, authorEmoji, content, topic } = req.body as {
      deviceToken: string; authorName?: string; authorEmoji?: string;
      content: string; topic?: string;
    };
    if (!deviceToken || !content?.trim()) {
      res.status(400).json({ error: "deviceToken e content são obrigatórios" }); return;
    }
    if (content.length > 500) {
      res.status(400).json({ error: "Mensagem muito longa (máx 500 caracteres)" }); return;
    }

    const profile = await db.select({ username: profiles.username, displayName: profiles.displayName, avatarEmoji: profiles.avatarEmoji })
      .from(profiles).where(eq(profiles.deviceToken, deviceToken)).limit(1);
    const p = profile[0];

    const [post] = await db.insert(communityPosts).values({
      deviceToken,
      authorName: authorName || p?.displayName || p?.username || "Estudante",
      authorEmoji: authorEmoji || p?.avatarEmoji || "🎓",
      content: content.trim(),
      topic: topic || "geral",
    }).returning();
    res.status(201).json(post);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/content/community-posts/:id/like", async (req, res) => {
  try {
    const { deviceToken } = req.body as { deviceToken: string };
    const postId = req.params.id!;
    if (!deviceToken) { res.status(400).json({ error: "deviceToken obrigatório" }); return; }

    const existing = await db.select().from(communityPostLikes)
      .where(and(eq(communityPostLikes.postId, postId), eq(communityPostLikes.deviceToken, deviceToken)))
      .limit(1);

    if (existing.length > 0) {
      await db.delete(communityPostLikes)
        .where(and(eq(communityPostLikes.postId, postId), eq(communityPostLikes.deviceToken, deviceToken)));
      await db.update(communityPosts).set({ likesCount: Math.max(0, (await db.select({ c: communityPosts.likesCount }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1))[0]?.c ?? 1) - 1 }).where(eq(communityPosts.id, postId));
      res.json({ liked: false });
    } else {
      await db.insert(communityPostLikes).values({ postId, deviceToken });
      const cur = await db.select({ c: communityPosts.likesCount }).from(communityPosts).where(eq(communityPosts.id, postId)).limit(1);
      await db.update(communityPosts).set({ likesCount: (cur[0]?.c ?? 0) + 1 }).where(eq(communityPosts.id, postId));
      res.json({ liked: true });
    }
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── CERTIFICATES ─────────────────────────────────────────────────────────────

router.get("/content/certificates/:deviceToken", async (req, res) => {
  try {
    const rows = await db.select().from(userCertificates)
      .where(eq(userCertificates.deviceToken, req.params.deviceToken!))
      .orderBy(desc(userCertificates.issuedAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── LIVE EVENTS ─────────────────────────────────────────────────────────────

router.get("/content/live-events", async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db.select().from(liveEvents)
      .where(eq(liveEvents.active, true))
      .orderBy(asc(liveEvents.scheduledAt));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
