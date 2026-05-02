import { Router } from "express";
import {
  getQuizCategories,
  getQuizQuestions,
  getExams,
  getWotdEntries,
} from "../lib/adminStore.js";

const router = Router();

// ─── GET /content/quiz ────────────────────────────────────────────────────────
router.get("/content/quiz", (_req, res) => {
  const categories = getQuizCategories().filter((c) => c.active);
  const questions = getQuizQuestions();
  const result = categories.map((cat) => ({
    ...cat,
    questions: questions
      .filter((q) => q.categoryId === cat.id)
      .sort((a, b) => a.order - b.order),
  }));
  res.json(result);
});

// ─── GET /content/exams ───────────────────────────────────────────────────────
router.get("/content/exams", (_req, res) => {
  const exams = getExams()
    .filter((e) => e.active)
    .sort((a, b) => a.order - b.order)
    .map((e) => ({
      ...e,
      tasks: [...e.tasks].sort((a, b) => a.order - b.order),
    }));
  res.json(exams);
});

// ─── GET /content/wotd ────────────────────────────────────────────────────────
router.get("/content/wotd", (_req, res) => {
  const active = getWotdEntries().filter((w) => w.active);
  res.json(active);
});

export default router;
