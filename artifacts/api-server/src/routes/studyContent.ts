import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

function readData<T>(filename: string, def: T): T {
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return def;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as T; } catch { return def; }
}

function writeData(filename: string, data: unknown) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

// ─── Default data ──────────────────────────────────────────────────────────────

interface StudyTask {
  id: string; title: string;
  type: "practice" | "vocab" | "reading" | "listening" | "grammar";
  durationMins: number; dayOfWeek: number; order: number; active: boolean;
}

interface StudyTip {
  id: string; text: string; active: boolean; order: number;
}

interface QuickAction {
  id: string; label: string; icon: string; color: string;
  route: string; desc: string; order: number; active: boolean;
}

const DEFAULT_TASKS: StudyTask[] = [
  { id: "t1",  title: "Praticar Tarefa 3",          type: "practice",  durationMins: 30, dayOfWeek: 1, order: 0, active: true },
  { id: "t2",  title: "Revisar vocabulário",         type: "vocab",     durationMins: 15, dayOfWeek: 1, order: 1, active: true },
  { id: "t3",  title: "Praticar Tarefa 1",           type: "practice",  durationMins: 30, dayOfWeek: 2, order: 0, active: true },
  { id: "t4",  title: "Gramática — subjuntivo",      type: "grammar",   durationMins: 20, dayOfWeek: 2, order: 1, active: true },
  { id: "t5",  title: "Praticar Tarefa 2",           type: "practice",  durationMins: 30, dayOfWeek: 3, order: 0, active: true },
  { id: "t6",  title: "Revisar vocabulário",         type: "vocab",     durationMins: 15, dayOfWeek: 3, order: 1, active: true },
  { id: "t7",  title: "Praticar Tarefa 4",           type: "practice",  durationMins: 30, dayOfWeek: 4, order: 0, active: true },
  { id: "t8",  title: "Leitura de texto autêntico",  type: "reading",   durationMins: 20, dayOfWeek: 4, order: 1, active: true },
  { id: "t9",  title: "Prática IA — Escrita",        type: "practice",  durationMins: 30, dayOfWeek: 5, order: 0, active: true },
  { id: "t10", title: "Revisar vocabulário",         type: "vocab",     durationMins: 15, dayOfWeek: 5, order: 1, active: true },
  { id: "t11", title: "Simulado oral",               type: "practice",  durationMins: 25, dayOfWeek: 6, order: 0, active: true },
  { id: "t12", title: "Revisão semanal",             type: "reading",   durationMins: 30, dayOfWeek: 0, order: 0, active: true },
];

const DEFAULT_TIPS: StudyTip[] = [
  { id: "tip1", text: "Leia textos autênticos em português todos os dias — jornais, blogs, artigos.", active: true, order: 0 },
  { id: "tip2", text: "Grave-se falando português e ouça para identificar pontos a melhorar.", active: true, order: 1 },
  { id: "tip3", text: "Pratique escrever em diferentes gêneros: e-mail, carta, artigo de opinião.", active: true, order: 2 },
  { id: "tip4", text: "Estude conectivos e operadores argumentativos — são essenciais no Celpe-Bras.", active: true, order: 3 },
  { id: "tip5", text: "Faça uma redação completa toda semana e revise com o critério do exame.", active: true, order: 4 },
  { id: "tip6", text: "Assista a programas de TV ou vídeos em português com foco na entonação.", active: true, order: 5 },
  { id: "tip7", text: "Pratique responder às tarefas no tempo real da prova (90 min total).", active: true, order: 6 },
  { id: "tip8", text: "Estude temas recorrentes do Celpe-Bras: meio ambiente, tecnologia, cidadania.", active: true, order: 7 },
];

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: "practice",  label: "Praticar",    icon: "edit-3",     color: "#185FA5", route: "/practice",  desc: "Tarefas escritas",    order: 0, active: true },
  { id: "grammar",   label: "Gramática",   icon: "code",       color: "#D85A30", route: "/grammar",   desc: "Exercícios e regras", order: 1, active: true },
  { id: "vocab",     label: "Vocabulário", icon: "book-open",  color: "#1D9E75", route: "/vocab",     desc: "Flashcards SRS",      order: 2, active: true },
  { id: "oral",      label: "Oral",        icon: "mic",        color: "#7c3aed", route: "/oral",      desc: "Prática de fala",     order: 3, active: true },
  { id: "listening", label: "Escuta",      icon: "headphones", color: "#BA7517", route: "/listening", desc: "Áudios e questões",   order: 4, active: true },
  { id: "exams",     label: "Simulados",   icon: "clipboard",  color: "#DC2626", route: "/exams",     desc: "Provas anteriores",   order: 5, active: true },
];

const router = Router();

// ─── STUDY TASKS (admin) ─────────────────────────────────────────────────────

router.get("/admin/study-tasks", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tasks = readData<StudyTask[]>("study-tasks.json", DEFAULT_TASKS);
  res.json(tasks.sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.order - b.order));
});

router.post("/admin/study-tasks", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tasks = readData<StudyTask[]>("study-tasks.json", DEFAULT_TASKS);
  const b = req.body as Partial<StudyTask>;
  const task: StudyTask = {
    id: uuid(),
    title: b.title ?? "Nova tarefa",
    type: b.type ?? "practice",
    durationMins: b.durationMins ?? 20,
    dayOfWeek: b.dayOfWeek ?? 1,
    order: b.order ?? tasks.length,
    active: b.active ?? true,
  };
  tasks.push(task);
  writeData("study-tasks.json", tasks);
  res.status(201).json(task);
});

router.put("/admin/study-tasks/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tasks = readData<StudyTask[]>("study-tasks.json", DEFAULT_TASKS);
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx < 0) { res.status(404).json({ error: "Not found" }); return; }
  tasks[idx] = { ...tasks[idx]!, ...req.body as Partial<StudyTask>, id: req.params.id! };
  writeData("study-tasks.json", tasks);
  res.json(tasks[idx]);
});

router.delete("/admin/study-tasks/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tasks = readData<StudyTask[]>("study-tasks.json", DEFAULT_TASKS);
  const filtered = tasks.filter(t => t.id !== req.params.id);
  if (filtered.length === tasks.length) { res.status(404).json({ error: "Not found" }); return; }
  writeData("study-tasks.json", filtered);
  res.status(204).send();
});

router.post("/admin/study-tasks/reset", (req, res) => {
  if (!checkAuth(req, res)) return;
  writeData("study-tasks.json", DEFAULT_TASKS);
  res.json({ ok: true });
});

// ─── STUDY TASKS (public) ─────────────────────────────────────────────────────

router.get("/content/study-tasks", (_req, res) => {
  const tasks = readData<StudyTask[]>("study-tasks.json", DEFAULT_TASKS);
  res.json(tasks.filter(t => t.active).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.order - b.order));
});

// ─── STUDY TIPS (admin) ──────────────────────────────────────────────────────

router.get("/admin/study-tips", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tips = readData<StudyTip[]>("study-tips.json", DEFAULT_TIPS);
  res.json(tips.sort((a, b) => a.order - b.order));
});

router.post("/admin/study-tips", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tips = readData<StudyTip[]>("study-tips.json", DEFAULT_TIPS);
  const b = req.body as Partial<StudyTip>;
  const tip: StudyTip = { id: uuid(), text: b.text ?? "", active: b.active ?? true, order: b.order ?? tips.length };
  tips.push(tip);
  writeData("study-tips.json", tips);
  res.status(201).json(tip);
});

router.put("/admin/study-tips/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tips = readData<StudyTip[]>("study-tips.json", DEFAULT_TIPS);
  const idx = tips.findIndex(t => t.id === req.params.id);
  if (idx < 0) { res.status(404).json({ error: "Not found" }); return; }
  tips[idx] = { ...tips[idx]!, ...req.body as Partial<StudyTip>, id: req.params.id! };
  writeData("study-tips.json", tips);
  res.json(tips[idx]);
});

router.delete("/admin/study-tips/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const tips = readData<StudyTip[]>("study-tips.json", DEFAULT_TIPS);
  const filtered = tips.filter(t => t.id !== req.params.id);
  writeData("study-tips.json", filtered);
  res.status(204).send();
});

// ─── STUDY TIPS (public) ─────────────────────────────────────────────────────

router.get("/content/study-tips", (_req, res) => {
  const tips = readData<StudyTip[]>("study-tips.json", DEFAULT_TIPS);
  res.json(tips.filter(t => t.active).sort((a, b) => a.order - b.order));
});

// ─── QUICK ACTIONS (admin) ───────────────────────────────────────────────────

router.get("/admin/quick-actions", (req, res) => {
  if (!checkAuth(req, res)) return;
  const qa = readData<QuickAction[]>("quick-actions.json", DEFAULT_QUICK_ACTIONS);
  res.json(qa.sort((a, b) => a.order - b.order));
});

router.put("/admin/quick-actions", (req, res) => {
  if (!checkAuth(req, res)) return;
  const actions = req.body as QuickAction[];
  if (!Array.isArray(actions)) { res.status(400).json({ error: "Array expected" }); return; }
  writeData("quick-actions.json", actions);
  res.json(actions);
});

router.put("/admin/quick-actions/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const qa = readData<QuickAction[]>("quick-actions.json", DEFAULT_QUICK_ACTIONS);
  const idx = qa.findIndex(a => a.id === req.params.id);
  if (idx < 0) { res.status(404).json({ error: "Not found" }); return; }
  qa[idx] = { ...qa[idx]!, ...req.body as Partial<QuickAction>, id: req.params.id! };
  writeData("quick-actions.json", qa);
  res.json(qa[idx]);
});

// ─── QUICK ACTIONS (public) ──────────────────────────────────────────────────

router.get("/content/quick-actions", (_req, res) => {
  const qa = readData<QuickAction[]>("quick-actions.json", DEFAULT_QUICK_ACTIONS);
  res.json(qa.filter(a => a.active).sort((a, b) => a.order - b.order));
});

export default router;
