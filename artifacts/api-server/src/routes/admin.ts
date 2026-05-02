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
  getStoredPasswordHash,
  savePasswordHash,
  getSecurityEvents,
  recordSecurityEvent,
  type PracticePrompt,
  type GrammarTopic,
} from "../lib/adminStore.js";

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
