import { Router } from "express";
import { db } from "@workspace/db";
import {
  oralTasks, pronunciationCategories, pronunciationWords,
  listeningResources, listeningTips, conversationScenarios,
} from "@workspace/db/schema";
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

// ─── ORAL TASKS ───────────────────────────────────────────────────────────────

router.get("/admin/oral-tasks", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try { res.json(await db.select().from(oralTasks).orderBy(asc(oralTasks.order))); }
  catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/oral-tasks", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(oralTasks).values({
      title: b.title ?? "Nova Tarefa",
      description: b.description ?? "",
      instructions: b.instructions ?? [],
      durationSeconds: b.durationSeconds ?? 300,
      icon: b.icon ?? "mic",
      color: b.color ?? "#185FA5",
      order: b.order ?? 0,
      active: b.active ?? true,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/oral-tasks/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(oralTasks).set({
      title: b.title, description: b.description, instructions: b.instructions,
      durationSeconds: b.durationSeconds, icon: b.icon, color: b.color,
      order: b.order, active: b.active,
    }).where(eq(oralTasks.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/oral-tasks/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(oralTasks).where(eq(oralTasks.id, req.params.id!)).returning({ id: oralTasks.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/oral-tasks", async (_req, res) => {
  try { res.json(await db.select().from(oralTasks).where(eq(oralTasks.active, true)).orderBy(asc(oralTasks.order))); }
  catch { res.status(500).json({ error: "Database error" }); }
});

// ─── PRONUNCIATION ────────────────────────────────────────────────────────────

router.get("/admin/pronunciation/categories", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const cats = await db.select().from(pronunciationCategories).orderBy(asc(pronunciationCategories.order));
    const words = await db.select().from(pronunciationWords).orderBy(asc(pronunciationWords.order));
    res.json(cats.map(c => ({ ...c, words: words.filter(w => w.categoryId === c.id) })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/pronunciation/categories", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(pronunciationCategories).values({
      title: b.title ?? "Nova Categoria",
      icon: b.icon ?? "volume-2",
      color: b.color ?? "#185FA5",
      order: b.order ?? 0,
      active: b.active ?? true,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/pronunciation/categories/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(pronunciationCategories).set({
      title: b.title, icon: b.icon, color: b.color, order: b.order, active: b.active,
    }).where(eq(pronunciationCategories.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/pronunciation/categories/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(pronunciationCategories).where(eq(pronunciationCategories.id, req.params.id!)).returning({ id: pronunciationCategories.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/pronunciation/categories/:id/words", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(pronunciationWords).values({
      categoryId: req.params.id!,
      word: b.word ?? "",
      ipa: b.ipa ?? "",
      tip: b.tip ?? "",
      example: b.example ?? "",
      order: b.order ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/pronunciation/words/:wordId", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(pronunciationWords).set({
      word: b.word, ipa: b.ipa, tip: b.tip, example: b.example, order: b.order,
    }).where(eq(pronunciationWords.id, req.params.wordId!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/pronunciation/words/:wordId", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(pronunciationWords).where(eq(pronunciationWords.id, req.params.wordId!)).returning({ id: pronunciationWords.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/pronunciation", async (_req, res) => {
  try {
    const cats = await db.select().from(pronunciationCategories).where(eq(pronunciationCategories.active, true)).orderBy(asc(pronunciationCategories.order));
    const words = await db.select().from(pronunciationWords).orderBy(asc(pronunciationWords.order));
    res.json(cats.map(c => ({ ...c, words: words.filter(w => w.categoryId === c.id) })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── LISTENING ────────────────────────────────────────────────────────────────

router.get("/admin/listening", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const resources = await db.select().from(listeningResources).orderBy(asc(listeningResources.order));
    const tips = await db.select().from(listeningTips).orderBy(asc(listeningTips.order));
    res.json({ resources, tips });
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/listening/resources", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(listeningResources).values({
      title: b.title ?? "Novo Recurso",
      source: b.source ?? "",
      description: b.description ?? "",
      url: b.url ?? "",
      icon: b.icon ?? "headphones",
      color: b.color ?? "#185FA5",
      type: b.type ?? "podcast",
      order: b.order ?? 0,
      active: b.active ?? true,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/listening/resources/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(listeningResources).set({
      title: b.title, source: b.source, description: b.description, url: b.url,
      icon: b.icon, color: b.color, type: b.type, order: b.order, active: b.active,
    }).where(eq(listeningResources.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/listening/resources/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(listeningResources).where(eq(listeningResources.id, req.params.id!)).returning({ id: listeningResources.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/listening/tips", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [row] = await db.insert(listeningTips).values({
      text: req.body.text ?? "",
      order: req.body.order ?? 0,
      active: req.body.active ?? true,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/listening/tips/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [row] = await db.update(listeningTips).set({
      text: req.body.text, order: req.body.order, active: req.body.active,
    }).where(eq(listeningTips.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/listening/tips/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(listeningTips).where(eq(listeningTips.id, req.params.id!)).returning({ id: listeningTips.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/listening", async (_req, res) => {
  try {
    const resources = await db.select().from(listeningResources).where(eq(listeningResources.active, true)).orderBy(asc(listeningResources.order));
    const tips = await db.select().from(listeningTips).where(eq(listeningTips.active, true)).orderBy(asc(listeningTips.order));
    res.json({ resources, tips });
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── CONVERSATION SCENARIOS ───────────────────────────────────────────────────

router.get("/admin/conversation/scenarios", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try { res.json(await db.select().from(conversationScenarios).orderBy(asc(conversationScenarios.order))); }
  catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/conversation/scenarios", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(conversationScenarios).values({
      label: b.label ?? "Novo Cenário",
      icon: b.icon ?? "message-circle",
      color: b.color ?? "#185FA5",
      systemPrompt: b.systemPrompt ?? "",
      order: b.order ?? 0,
      active: b.active ?? true,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/conversation/scenarios/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(conversationScenarios).set({
      label: b.label, icon: b.icon, color: b.color,
      systemPrompt: b.systemPrompt, order: b.order, active: b.active,
    }).where(eq(conversationScenarios.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/conversation/scenarios/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(conversationScenarios).where(eq(conversationScenarios.id, req.params.id!)).returning({ id: conversationScenarios.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/conversation/scenarios", async (_req, res) => {
  try { res.json(await db.select().from(conversationScenarios).where(eq(conversationScenarios.active, true)).orderBy(asc(conversationScenarios.order))); }
  catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
