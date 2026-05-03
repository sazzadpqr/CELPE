import { Router } from "express";
import crypto from "crypto";
import { db } from "@workspace/db";
import { adminAiConfig } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import {
  getStats,
  getRequestLogs,
  getPrompts,
  savePrompts,
  getGrammarTopics,
  saveGrammarTopics,
  getStoredPasswordHash,
  savePasswordHash,
  getSecurityEvents,
  recordSecurityEvent,
  getQuizCategories,
  saveQuizCategories,
  getQuizQuestions,
  saveQuizQuestions,
  getQuizLessons,
  saveQuizLessons,
  getExams,
  saveExams,
  getWotdEntries,
  saveWotdEntries,
  type PracticePrompt,
  type GrammarTopic,
  type QuizCategory,
  type QuizQuestion,
  type QuizLesson,
  type LessonExample,
  type LessonMistake,
  type ExamEdition,
  type ExamTask,
  type WotdEntry,
} from "../lib/adminStore.js";

const AI_CONFIG_DEFAULTS = {
  systemPromptFeedback: "",
  systemPromptGeneration: "",
  modelFeedback: "gpt-4o",
  modelGeneration: "gpt-4o-mini",
  maxTokensFeedback: 1024,
  maxTokensGeneration: 512,
};

async function getAiConfig() {
  try {
    const [row] = await db.select().from(adminAiConfig).where(eq(adminAiConfig.id, "singleton"));
    if (row) return row;
    const [inserted] = await db.insert(adminAiConfig).values({ id: "singleton", ...AI_CONFIG_DEFAULTS }).returning();
    return inserted ?? { id: "singleton", ...AI_CONFIG_DEFAULTS, updatedAt: new Date() };
  } catch {
    return { id: "singleton", ...AI_CONFIG_DEFAULTS, updatedAt: new Date() };
  }
}

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

function verifyPassword(password: string): boolean {
  const storedHash = getStoredPasswordHash();
  if (storedHash) {
    return hashPassword(password) === storedHash;
  }
  const envPassword = process.env["SESSION_SECRET"] ?? "admin";
  return password === envPassword;
}

function makeToken(password: string): string {
  return Buffer.from(password).toString("base64");
}

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const token = authHeader.slice(7);
  const storedHash = getStoredPasswordHash();
  if (storedHash) {
    const expectedToken = Buffer.from(storedHash).toString("base64");
    if (token !== expectedToken) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
  } else {
    const envPassword = process.env["SESSION_SECRET"] ?? "admin";
    const expectedToken = Buffer.from(envPassword).toString("base64");
    if (token !== expectedToken) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
  }
  return true;
}

// ─── POST /admin/auth ─────────────────────────────────────────────────────────
router.post("/admin/auth", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || !verifyPassword(password)) {
    res.status(401).json({ ok: false, token: "" });
    return;
  }
  const storedHash = getStoredPasswordHash();
  const tokenSource = storedHash ?? (process.env["SESSION_SECRET"] ?? "admin");
  res.json({ ok: true, token: makeToken(tokenSource) });
});

// ─── POST /admin/auth/rotate ──────────────────────────────────────────────────
router.post("/admin/auth/rotate", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "currentPassword and newPassword are required" });
    return;
  }
  if (!verifyPassword(currentPassword)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  const newHash = hashPassword(newPassword);
  savePasswordHash(newHash);
  recordSecurityEvent("password_rotated", "Admin password was changed successfully.");
  res.json({ ok: true, token: makeToken(newHash) });
});

// ─── GET /admin/security-events ───────────────────────────────────────────────
router.get("/admin/security-events", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getSecurityEvents());
});

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
router.get("/admin/stats", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getStats());
});

// ─── GET /admin/logs ──────────────────────────────────────────────────────────
router.get("/admin/logs", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getRequestLogs());
});

// ─── GET /admin/prompts ───────────────────────────────────────────────────────
router.get("/admin/prompts", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getPrompts());
});

// ─── POST /admin/prompts ──────────────────────────────────────────────────────
router.post("/admin/prompts", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as {
    taskType: string;
    genre: string;
    source: string;
    prompt: string;
    active: boolean;
  };
  const prompts = getPrompts();
  const newPrompt: PracticePrompt = {
    id: crypto.randomUUID(),
    taskType: body.taskType ?? "",
    genre: body.genre ?? "",
    source: body.source ?? "",
    prompt: body.prompt ?? "",
    active: body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  prompts.push(newPrompt);
  savePrompts(prompts);
  res.status(201).json(newPrompt);
});

// ─── PUT /admin/prompts/:id ───────────────────────────────────────────────────
router.put("/admin/prompts/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const body = req.body as {
    taskType: string;
    genre: string;
    source: string;
    prompt: string;
    active: boolean;
  };
  const prompts = getPrompts();
  const index = prompts.findIndex((p) => p.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updated: PracticePrompt = {
    ...prompts[index]!,
    taskType: body.taskType ?? prompts[index]!.taskType,
    genre: body.genre ?? prompts[index]!.genre,
    source: body.source ?? prompts[index]!.source,
    prompt: body.prompt ?? prompts[index]!.prompt,
    active: body.active ?? prompts[index]!.active,
  };
  prompts[index] = updated;
  savePrompts(prompts);
  res.json(updated);
});

// ─── DELETE /admin/prompts/:id ────────────────────────────────────────────────
router.delete("/admin/prompts/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const prompts = getPrompts();
  const filtered = prompts.filter((p) => p.id !== id);
  if (filtered.length === prompts.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  savePrompts(filtered);
  res.status(204).send();
});

// ─── GET /admin/grammar ───────────────────────────────────────────────────────
router.get("/admin/grammar", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getGrammarTopics());
});

// ─── POST /admin/grammar ──────────────────────────────────────────────────────
router.post("/admin/grammar", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as {
    title: string;
    category: string;
    explanation: string;
    examples: string[];
    tips: string[];
    active: boolean;
  };
  const topics = getGrammarTopics();
  const newTopic: GrammarTopic = {
    id: crypto.randomUUID(),
    title: body.title ?? "",
    category: body.category ?? "",
    explanation: body.explanation ?? "",
    examples: Array.isArray(body.examples) ? body.examples : [],
    tips: Array.isArray(body.tips) ? body.tips : [],
    active: body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  topics.push(newTopic);
  saveGrammarTopics(topics);
  res.status(201).json(newTopic);
});

// ─── PUT /admin/grammar/:id ───────────────────────────────────────────────────
router.put("/admin/grammar/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const body = req.body as {
    title: string;
    category: string;
    explanation: string;
    examples: string[];
    tips: string[];
    active: boolean;
  };
  const topics = getGrammarTopics();
  const index = topics.findIndex((t) => t.id === id);
  if (index === -1) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const updated: GrammarTopic = {
    ...topics[index]!,
    title: body.title ?? topics[index]!.title,
    category: body.category ?? topics[index]!.category,
    explanation: body.explanation ?? topics[index]!.explanation,
    examples: Array.isArray(body.examples) ? body.examples : topics[index]!.examples,
    tips: Array.isArray(body.tips) ? body.tips : topics[index]!.tips,
    active: body.active ?? topics[index]!.active,
  };
  topics[index] = updated;
  saveGrammarTopics(topics);
  res.json(updated);
});

// ─── DELETE /admin/grammar/:id ────────────────────────────────────────────────
router.delete("/admin/grammar/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const topics = getGrammarTopics();
  const filtered = topics.filter((t) => t.id !== id);
  if (filtered.length === topics.length) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  saveGrammarTopics(filtered);
  res.status(204).send();
});

// ─── GET /admin/config ────────────────────────────────────────────────────────
router.get("/admin/config", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const cfg = await getAiConfig();
  res.json({
    feedbackSystemPrompt: cfg.systemPromptFeedback,
    promptGenerationSystemPrompt: cfg.systemPromptGeneration,
    modelFeedback: cfg.modelFeedback,
    modelGeneration: cfg.modelGeneration,
    maxTokensFeedback: cfg.maxTokensFeedback,
    maxTokensGeneration: cfg.maxTokensGeneration,
  });
});

// ─── PUT /admin/config ────────────────────────────────────────────────────────
router.put("/admin/config", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as {
    feedbackSystemPrompt?: string;
    promptGenerationSystemPrompt?: string;
    modelFeedback?: string;
    modelGeneration?: string;
    maxTokensFeedback?: number;
    maxTokensGeneration?: number;
  };
  try {
    const current = await getAiConfig();
    const [row] = await db
      .insert(adminAiConfig)
      .values({
        id: "singleton",
        systemPromptFeedback: body.feedbackSystemPrompt ?? current.systemPromptFeedback,
        systemPromptGeneration: body.promptGenerationSystemPrompt ?? current.systemPromptGeneration,
        modelFeedback: body.modelFeedback ?? current.modelFeedback,
        modelGeneration: body.modelGeneration ?? current.modelGeneration,
        maxTokensFeedback: body.maxTokensFeedback ?? current.maxTokensFeedback,
        maxTokensGeneration: body.maxTokensGeneration ?? current.maxTokensGeneration,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: adminAiConfig.id,
        set: {
          systemPromptFeedback: body.feedbackSystemPrompt ?? current.systemPromptFeedback,
          systemPromptGeneration: body.promptGenerationSystemPrompt ?? current.systemPromptGeneration,
          modelFeedback: body.modelFeedback ?? current.modelFeedback,
          modelGeneration: body.modelGeneration ?? current.modelGeneration,
          maxTokensFeedback: body.maxTokensFeedback ?? current.maxTokensFeedback,
          maxTokensGeneration: body.maxTokensGeneration ?? current.maxTokensGeneration,
          updatedAt: new Date(),
        },
      })
      .returning();
    res.json({
      feedbackSystemPrompt: row!.systemPromptFeedback,
      promptGenerationSystemPrompt: row!.systemPromptGeneration,
      modelFeedback: row!.modelFeedback,
      modelGeneration: row!.modelGeneration,
      maxTokensFeedback: row!.maxTokensFeedback,
      maxTokensGeneration: row!.maxTokensGeneration,
    });
  } catch {
    res.status(500).json({ error: "Failed to save config" });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/quiz/categories", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getQuizCategories());
});

router.post("/admin/quiz/categories", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as Omit<QuizCategory, "id" | "createdAt">;
  const cats = getQuizCategories();
  const newCat: QuizCategory = {
    id: crypto.randomUUID(),
    title: body.title ?? "",
    description: body.description ?? "",
    color: body.color ?? "#185FA5",
    icon: body.icon ?? "book",
    active: body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  cats.push(newCat);
  saveQuizCategories(cats);
  res.status(201).json(newCat);
});

router.put("/admin/quiz/categories/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const body = req.body as Partial<QuizCategory>;
  const cats = getQuizCategories();
  const idx = cats.findIndex((c) => c.id === id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  cats[idx] = { ...cats[idx]!, ...body, id, createdAt: cats[idx]!.createdAt };
  saveQuizCategories(cats);
  res.json(cats[idx]);
});

router.delete("/admin/quiz/categories/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const cats = getQuizCategories();
  const filtered = cats.filter((c) => c.id !== id);
  if (filtered.length === cats.length) { res.status(404).json({ error: "Not found" }); return; }
  saveQuizCategories(filtered);
  // Also remove associated questions
  const qs = getQuizQuestions().filter((q) => q.categoryId !== id);
  saveQuizQuestions(qs);
  res.status(204).send();
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/quiz/questions", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { categoryId } = req.query as { categoryId?: string };
  const qs = getQuizQuestions();
  res.json(categoryId ? qs.filter((q) => q.categoryId === categoryId) : qs);
});

router.post("/admin/quiz/questions", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as Omit<QuizQuestion, "id" | "createdAt">;
  const qs = getQuizQuestions();
  const newQ: QuizQuestion = {
    id: crypto.randomUUID(),
    categoryId: body.categoryId ?? "",
    question: body.question ?? "",
    options: Array.isArray(body.options) ? body.options : ["", "", "", ""],
    correct: typeof body.correct === "number" ? body.correct : 0,
    explanation: body.explanation ?? "",
    order: body.order ?? qs.filter((q) => q.categoryId === body.categoryId).length + 1,
    createdAt: new Date().toISOString(),
  };
  qs.push(newQ);
  saveQuizQuestions(qs);
  res.status(201).json(newQ);
});

router.put("/admin/quiz/questions/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const body = req.body as Partial<QuizQuestion>;
  const qs = getQuizQuestions();
  const idx = qs.findIndex((q) => q.id === id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  qs[idx] = { ...qs[idx]!, ...body, id, createdAt: qs[idx]!.createdAt };
  saveQuizQuestions(qs);
  res.json(qs[idx]);
});

router.delete("/admin/quiz/questions/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const qs = getQuizQuestions();
  const filtered = qs.filter((q) => q.id !== id);
  if (filtered.length === qs.length) { res.status(404).json({ error: "Not found" }); return; }
  saveQuizQuestions(filtered);
  res.status(204).send();
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ LESSON CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/quiz/categories/:id/lesson", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const lessons = getQuizLessons();
  const lesson = lessons.find((l) => l.categoryId === id);
  if (!lesson) { res.status(404).json({ error: "No lesson for this category" }); return; }
  res.json(lesson);
});

router.put("/admin/quiz/categories/:id/lesson", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const body = req.body as { rule?: string; examples?: LessonExample[]; mistake?: LessonMistake; tip?: string };
  const lessons = getQuizLessons();
  const idx = lessons.findIndex((l) => l.categoryId === id);
  const existing = idx !== -1 ? lessons[idx]! : { categoryId: id, rule: "", examples: [], mistake: { wrong: "", right: "", reason: "" }, tip: "", updatedAt: "" };
  const updated: QuizLesson = {
    categoryId: id,
    rule: body.rule ?? existing.rule,
    examples: Array.isArray(body.examples) ? body.examples : existing.examples,
    mistake: body.mistake ?? existing.mistake,
    tip: body.tip ?? existing.tip,
    updatedAt: new Date().toISOString(),
  };
  if (idx === -1) { lessons.push(updated); } else { lessons[idx] = updated; }
  saveQuizLessons(lessons);
  res.json(updated);
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXAM EDITIONS
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/exams", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getExams());
});

router.post("/admin/exams", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as Omit<ExamEdition, "id" | "createdAt">;
  const exams = getExams();
  const newExam: ExamEdition = {
    id: crypto.randomUUID(),
    year: body.year ?? 0,
    edition: body.edition ?? "",
    title: body.title ?? "",
    description: body.description ?? "",
    tasks: Array.isArray(body.tasks) ? body.tasks : [],
    active: body.active ?? true,
    order: body.order ?? exams.length + 1,
    createdAt: new Date().toISOString(),
  };
  exams.push(newExam);
  saveExams(exams);
  res.status(201).json(newExam);
});

router.put("/admin/exams/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const body = req.body as Partial<ExamEdition>;
  const exams = getExams();
  const idx = exams.findIndex((e) => e.id === id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  exams[idx] = { ...exams[idx]!, ...body, id, createdAt: exams[idx]!.createdAt };
  saveExams(exams);
  res.json(exams[idx]);
});

router.delete("/admin/exams/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const exams = getExams();
  const filtered = exams.filter((e) => e.id !== id);
  if (filtered.length === exams.length) { res.status(404).json({ error: "Not found" }); return; }
  saveExams(filtered);
  res.status(204).send();
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORD OF THE DAY BANK
// ═══════════════════════════════════════════════════════════════════════════════

router.get("/admin/wotd", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getWotdEntries());
});

router.post("/admin/wotd", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as Omit<WotdEntry, "id" | "createdAt">;
  const entries = getWotdEntries();
  const newEntry: WotdEntry = {
    id: crypto.randomUUID(),
    word: body.word ?? "",
    pos: body.pos ?? "",
    definition: body.definition ?? "",
    example: body.example ?? "",
    active: body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  entries.push(newEntry);
  saveWotdEntries(entries);
  res.status(201).json(newEntry);
});

router.put("/admin/wotd/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const body = req.body as Partial<WotdEntry>;
  const entries = getWotdEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  entries[idx] = { ...entries[idx]!, ...body, id, createdAt: entries[idx]!.createdAt };
  saveWotdEntries(entries);
  res.json(entries[idx]);
});

router.delete("/admin/wotd/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const { id } = req.params;
  const entries = getWotdEntries();
  const filtered = entries.filter((e) => e.id !== id);
  if (filtered.length === entries.length) { res.status(404).json({ error: "Not found" }); return; }
  saveWotdEntries(filtered);
  res.status(204).send();
});

export default router;
