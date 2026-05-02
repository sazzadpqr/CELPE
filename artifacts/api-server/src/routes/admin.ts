import { Router } from "express";
import crypto from "crypto";
import {
  getStats,
  getRequestLogs,
  getPrompts,
  savePrompts,
  getGrammarTopics,
  saveGrammarTopics,
  getConfig,
  saveConfig,
  type PracticePrompt,
  type GrammarTopic,
} from "../lib/adminStore.js";

const router = Router();

function getAdminPassword(): string {
  return process.env["SESSION_SECRET"] ?? "admin";
}

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const token = authHeader.slice(7);
  const expected = Buffer.from(getAdminPassword()).toString("base64");
  if (token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ─── POST /admin/auth ─────────────────────────────────────────────────────────
router.post("/admin/auth", (req, res) => {
  const { password } = req.body as { password?: string };
  if (!password || password !== getAdminPassword()) {
    res.status(401).json({ ok: false, token: "" });
    return;
  }
  const token = Buffer.from(getAdminPassword()).toString("base64");
  res.json({ ok: true, token });
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
router.get("/admin/config", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getConfig());
});

// ─── PUT /admin/config ────────────────────────────────────────────────────────
router.put("/admin/config", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as {
    feedbackSystemPrompt?: string;
    promptGenerationSystemPrompt?: string;
  };
  const current = getConfig();
  const updated = {
    feedbackSystemPrompt: body.feedbackSystemPrompt ?? current.feedbackSystemPrompt,
    promptGenerationSystemPrompt:
      body.promptGenerationSystemPrompt ?? current.promptGenerationSystemPrompt,
  };
  saveConfig(updated);
  res.json(updated);
});

export default router;
