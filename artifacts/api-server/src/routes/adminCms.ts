import { Router } from "express";
import { db } from "@workspace/db";
import {
  studyCategories, studyMaterials, featureFlags, appBanners,
  learningPaths, learningPathSteps,
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

// ─── STUDY CATEGORIES ────────────────────────────────────────────────────────

const CATEGORY_SEED = [
  { title: "Gramática", description: "Regras e exercícios de gramática portuguesa", icon: "book", color: "#185FA5", order: 1, active: true },
  { title: "Vocabulário", description: "Listas de palavras e expressões essenciais", icon: "type", color: "#7C3AED", order: 2, active: true },
  { title: "Escuta", description: "Exercícios de compreensão oral", icon: "headphones", color: "#059669", order: 3, active: true },
  { title: "Escrita", description: "Modelos e estratégias de redação", icon: "edit", color: "#D97706", order: 4, active: true },
  { title: "Leitura", description: "Textos e compreensão leitora", icon: "file-text", color: "#DC2626", order: 5, active: true },
  { title: "Celpe-Bras", description: "Materiais específicos para o exame", icon: "award", color: "#0891B2", order: 6, active: true },
];

async function seedCategories() {
  const existing = await db.select({ id: studyCategories.id }).from(studyCategories).limit(1);
  if (existing.length === 0) await db.insert(studyCategories).values(CATEGORY_SEED);
}

router.get("/admin/study-categories", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    await seedCategories();
    const rows = await db.select().from(studyCategories).orderBy(asc(studyCategories.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/study-categories", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(studyCategories).values({
      title: b.title ?? "Nova Categoria", description: b.description ?? "",
      icon: b.icon ?? "book", color: b.color ?? "#185FA5",
      order: b.order ?? 0, active: b.active ?? true,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/study-categories/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(studyCategories)
      .set({ title: b.title, description: b.description, icon: b.icon, color: b.color, order: b.order, active: b.active, updatedAt: new Date() })
      .where(eq(studyCategories.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/study-categories/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(studyCategories).where(eq(studyCategories.id, req.params.id!)).returning({ id: studyCategories.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── STUDY MATERIALS ─────────────────────────────────────────────────────────

router.get("/admin/study-materials", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(studyMaterials).orderBy(asc(studyMaterials.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/study-materials", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(studyMaterials).values({
      categoryId: b.categoryId ?? null, title: b.title ?? "Novo Material",
      description: b.description ?? "", content: b.content ?? "",
      level: b.level ?? "B1", materialType: b.materialType ?? "article",
      externalUrl: b.externalUrl ?? "", audioUrl: b.audioUrl ?? "",
      videoUrl: b.videoUrl ?? "", thumbnailUrl: b.thumbnailUrl ?? "",
      isPremium: b.isPremium ?? false, status: b.status ?? "draft",
      order: b.order ?? 0, estimatedMinutes: b.estimatedMinutes ?? 10,
      tags: b.tags ?? [],
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/study-materials/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(studyMaterials)
      .set({
        categoryId: b.categoryId, title: b.title, description: b.description,
        content: b.content, level: b.level, materialType: b.materialType,
        externalUrl: b.externalUrl, audioUrl: b.audioUrl, videoUrl: b.videoUrl,
        thumbnailUrl: b.thumbnailUrl, isPremium: b.isPremium, status: b.status,
        order: b.order, estimatedMinutes: b.estimatedMinutes, tags: b.tags,
        updatedAt: new Date(),
      })
      .where(eq(studyMaterials.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/study-materials/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(studyMaterials).where(eq(studyMaterials.id, req.params.id!)).returning({ id: studyMaterials.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── FEATURE FLAGS ────────────────────────────────────────────────────────────

const FLAGS_SEED = [
  { flagKey: "hearts_enabled", title: "Sistema de Corações", description: "Ativa corações/energia ao errar exercícios", enabled: true, category: "learning" },
  { flagKey: "gamification_enabled", title: "Gamificação (XP/Streak)", description: "Ativa sistema de XP e streak de estudos", enabled: true, category: "learning" },
  { flagKey: "resource_collections_enabled", title: "Coleções de Recursos", description: "Ativa coleções/playlists de recursos externos", enabled: true, category: "content" },
  { flagKey: "external_course_links_enabled", title: "Cursos e Links Externos", description: "Mostra seção de recursos e cursos externos", enabled: true, category: "content" },
  { flagKey: "placement_test_v2_enabled", title: "Nivelamento v2", description: "Usa nova versão do teste de nivelamento", enabled: false, category: "features" },
  { flagKey: "leaderboards_enabled", title: "Ranking (Leaderboard)", description: "Ativa ranking público de usuários", enabled: true, category: "social" },
  { flagKey: "content_import_enabled", title: "Importação de Conteúdo", description: "Ativa ferramentas de importação de conteúdo em massa", enabled: true, category: "admin" },
  { flagKey: "mobile_app_mode_enabled", title: "Modo App Mobile", description: "Ativa recursos exclusivos do app mobile", enabled: false, category: "future" },
  { flagKey: "offline_mode_enabled", title: "Modo Offline", description: "Permite uso parcial sem conexão", enabled: false, category: "future" },
  { flagKey: "manual_teacher_feedback_enabled", title: "Feedback Manual de Professor", description: "Professor pode revisar e comentar redações", enabled: false, category: "future" },
  { flagKey: "teacher_marketplace_enabled", title: "Marketplace de Professores", description: "Ativa busca e agendamento com professores", enabled: false, category: "future" },
  { flagKey: "live_lessons_enabled", title: "Aulas Ao Vivo", description: "Ativa módulo de aulas ao vivo", enabled: false, category: "future" },
  { flagKey: "community_enabled", title: "Comunidade", description: "Ativa fórum e comunidade de usuários", enabled: false, category: "future" },
  { flagKey: "certificates_enabled", title: "Certificados de Conclusão", description: "Emite certificados de conclusão de trilhas", enabled: false, category: "future" },
];

async function seedFlags() {
  const existing = await db.select({ id: featureFlags.id }).from(featureFlags).limit(1);
  if (existing.length === 0) await db.insert(featureFlags).values(FLAGS_SEED);
}

router.get("/admin/feature-flags", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    await seedFlags();
    const rows = await db.select().from(featureFlags).orderBy(asc(featureFlags.category));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/feature-flags/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [row] = await db.update(featureFlags)
      .set({ enabled: req.body.enabled, updatedAt: new Date() })
      .where(eq(featureFlags.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/feature-flags", async (_req, res) => {
  try {
    await seedFlags();
    const rows = await db.select().from(featureFlags);
    const map: Record<string, boolean> = {};
    for (const r of rows) map[r.flagKey] = r.enabled;
    res.json(map);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── APP BANNERS ──────────────────────────────────────────────────────────────

router.get("/admin/banners", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(appBanners).orderBy(asc(appBanners.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/banners", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(appBanners).values({
      title: b.title ?? "Novo Banner", body: b.body ?? "",
      type: b.type ?? "info", ctaLabel: b.ctaLabel ?? "",
      ctaUrl: b.ctaUrl ?? "", audience: b.audience ?? "all",
      active: b.active ?? false, order: b.order ?? 0,
      startsAt: b.startsAt ? new Date(b.startsAt) : undefined,
      endsAt: b.endsAt ? new Date(b.endsAt) : undefined,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/banners/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(appBanners)
      .set({
        title: b.title, body: b.body, type: b.type, ctaLabel: b.ctaLabel,
        ctaUrl: b.ctaUrl, audience: b.audience, active: b.active, order: b.order,
        startsAt: b.startsAt ? new Date(b.startsAt) : undefined,
        endsAt: b.endsAt ? new Date(b.endsAt) : undefined,
        updatedAt: new Date(),
      })
      .where(eq(appBanners.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/banners/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(appBanners).where(eq(appBanners.id, req.params.id!)).returning({ id: appBanners.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/banners", async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db.select().from(appBanners).where(eq(appBanners.active, true)).orderBy(asc(appBanners.order));
    const active = rows.filter(r =>
      (!r.startsAt || r.startsAt <= now) && (!r.endsAt || r.endsAt >= now)
    );
    res.json(active);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── LEARNING PATHS ───────────────────────────────────────────────────────────

const PATHS_SEED = [
  { title: "Comece do Zero", description: "Para iniciantes absolutos em português", level: "A0", targetLevel: "A2", durationWeeks: 12, isPremium: false, status: "published", order: 1 },
  { title: "Preparação B1", description: "Consolide o nível intermediário e alcance o B1", level: "A2", targetLevel: "B1", durationWeeks: 8, isPremium: false, status: "published", order: 2 },
  { title: "Rumo ao B2", description: "Prepare-se para o nível avançado do Celpe-Bras", level: "B1", targetLevel: "B2", durationWeeks: 10, isPremium: true, status: "published", order: 3 },
  { title: "Revisão Final Antes da Prova", description: "Revisão intensiva para quem já está no B2", level: "B2", targetLevel: "C1", durationWeeks: 4, isPremium: true, status: "published", order: 4 },
];

async function seedPaths() {
  const existing = await db.select({ id: learningPaths.id }).from(learningPaths).limit(1);
  if (existing.length === 0) await db.insert(learningPaths).values(PATHS_SEED);
}

router.get("/admin/learning-paths", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    await seedPaths();
    const paths = await db.select().from(learningPaths).orderBy(asc(learningPaths.order));
    const steps = await db.select().from(learningPathSteps).orderBy(asc(learningPathSteps.order));
    res.json(paths.map(p => ({ ...p, steps: steps.filter(s => s.pathId === p.id) })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/learning-paths", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(learningPaths).values({
      title: b.title ?? "Nova Trilha", description: b.description ?? "",
      level: b.level ?? "B1", targetLevel: b.targetLevel ?? "B2",
      durationWeeks: b.durationWeeks ?? 8, isPremium: b.isPremium ?? false,
      status: b.status ?? "draft", order: b.order ?? 0, thumbnailUrl: b.thumbnailUrl ?? "",
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/learning-paths/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(learningPaths)
      .set({ title: b.title, description: b.description, level: b.level, targetLevel: b.targetLevel, durationWeeks: b.durationWeeks, isPremium: b.isPremium, status: b.status, order: b.order, thumbnailUrl: b.thumbnailUrl, updatedAt: new Date() })
      .where(eq(learningPaths.id, req.params.id!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/learning-paths/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(learningPaths).where(eq(learningPaths.id, req.params.id!)).returning({ id: learningPaths.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/learning-paths/:id/steps", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.insert(learningPathSteps).values({
      pathId: req.params.id!, title: b.title ?? "Novo Passo",
      description: b.description ?? "", stepType: b.stepType ?? "material",
      linkedId: b.linkedId ?? null, externalUrl: b.externalUrl ?? "",
      order: b.order ?? 0, isOptional: b.isOptional ?? false,
      estimatedMinutes: b.estimatedMinutes ?? 20,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/learning-paths/:id/steps/:stepId", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const b = req.body;
    const [row] = await db.update(learningPathSteps)
      .set({ title: b.title, description: b.description, stepType: b.stepType, linkedId: b.linkedId, externalUrl: b.externalUrl, order: b.order, isOptional: b.isOptional, estimatedMinutes: b.estimatedMinutes })
      .where(eq(learningPathSteps.id, req.params.stepId!)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/learning-paths/:id/steps/:stepId", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const r = await db.delete(learningPathSteps).where(eq(learningPathSteps.id, req.params.stepId!)).returning({ id: learningPathSteps.id });
    if (r.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/learning-paths", async (_req, res) => {
  try {
    await seedPaths();
    const paths = await db.select().from(learningPaths).where(eq(learningPaths.status, "published")).orderBy(asc(learningPaths.order));
    const steps = await db.select().from(learningPathSteps).orderBy(asc(learningPathSteps.order));
    res.json(paths.map(p => ({ ...p, steps: steps.filter(s => s.pathId === p.id) })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/study-categories", async (_req, res) => {
  try {
    await seedCategories();
    const rows = await db.select().from(studyCategories).where(eq(studyCategories.active, true)).orderBy(asc(studyCategories.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/study-materials", async (_req, res) => {
  try {
    const rows = await db.select().from(studyMaterials).where(eq(studyMaterials.status, "published")).orderBy(asc(studyMaterials.order));
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

export default router;
