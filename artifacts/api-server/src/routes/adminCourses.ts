import { Router } from "express";
import { db } from "@workspace/db";
import { courses, lessons } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
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

// ─── COURSES ──────────────────────────────────────────────────────────────────

router.get("/admin/courses", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const allCourses = await db.select().from(courses).orderBy(asc(courses.order));
    const allLessons = await db.select().from(lessons).orderBy(asc(lessons.order));
    res.json(allCourses.map(c => ({ ...c, lessons: allLessons.filter(l => l.courseId === c.id) })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/courses", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(courses).values({
      title: b.title ?? "Novo Curso",
      subtitle: b.subtitle ?? "",
      description: b.description ?? "",
      level: b.level ?? "B1",
      category: b.category ?? "",
      thumbnailUrl: b.thumbnailUrl ?? null,
      totalLessons: 0,
      estimatedHours: b.estimatedHours ?? 0,
      active: b.active ?? false,
      isPremium: b.isPremium ?? false,
      order: b.order ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/courses/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(courses)
      .set({
        title: b.title, subtitle: b.subtitle, description: b.description, level: b.level,
        category: b.category, thumbnailUrl: b.thumbnailUrl,
        estimatedHours: b.estimatedHours, active: b.active, isPremium: b.isPremium, order: b.order,
      })
      .where(eq(courses.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/courses/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(courses).where(eq(courses.id, req.params.id!)).returning({ id: courses.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── LESSONS ──────────────────────────────────────────────────────────────────

router.post("/admin/courses/:id/lessons", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(lessons).values({
      courseId: req.params.id!,
      title: b.title ?? "Nova Aula",
      content: b.content ?? "",
      type: b.type ?? "text",
      mediaUrl: b.mediaUrl ?? null,
      durationMinutes: b.durationMinutes ?? 10,
      order: b.order ?? 0,
      active: b.active ?? true,
    }).returning();
    await db.update(courses)
      .set({ totalLessons: (await db.select().from(lessons).where(eq(lessons.courseId, req.params.id!))).length })
      .where(eq(courses.id, req.params.id!));
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/courses/:id/lessons/:lessonId", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(lessons)
      .set({ title: b.title, content: b.content, type: b.type, mediaUrl: b.mediaUrl, durationMinutes: b.durationMinutes, order: b.order, active: b.active })
      .where(eq(lessons.id, req.params.lessonId!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/courses/:id/lessons/:lessonId", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(lessons).where(eq(lessons.id, req.params.lessonId!)).returning({ id: lessons.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    await db.update(courses)
      .set({ totalLessons: (await db.select().from(lessons).where(eq(lessons.courseId, req.params.id!))).length })
      .where(eq(courses.id, req.params.id!));
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/courses", async (_req, res) => {
  try {
    const allCourses = await db.select().from(courses).where(eq(courses.active, true)).orderBy(asc(courses.order));
    res.json(allCourses);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/courses/:id", async (req, res) => {
  try {
    const [course] = await db.select().from(courses).where(eq(courses.id, req.params.id!));
    if (!course) { res.status(404).json({ error: "Not found" }); return; }
    const courseLessons = await db.select().from(lessons).where(eq(lessons.courseId, req.params.id!)).orderBy(asc(lessons.order));
    res.json({ ...course, lessons: courseLessons });
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
