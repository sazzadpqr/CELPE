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

interface StudyTopic {
  id: string;
  name: string;
  active: boolean;
  order: number;
  createdAt: string;
}

interface GrammarExercise {
  id: string;
  categoryId: string;
  type: "multiple_choice" | "fill_blank" | "rewrite" | "error_find";
  prompt: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  order: number;
  active: boolean;
  createdAt: string;
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

const DEFAULT_STUDY_TOPICS: StudyTopic[] = [
  { id: "t1", name: "Alimentação e Nutrição", active: true, order: 1, createdAt: new Date().toISOString() },
  { id: "t2", name: "Artes Divinatórias e Esoterismo", active: true, order: 2, createdAt: new Date().toISOString() },
  { id: "t3", name: "Atividades Físicas e Esportes", active: true, order: 3, createdAt: new Date().toISOString() },
  { id: "t4", name: "Ciência e Tecnologia", active: true, order: 4, createdAt: new Date().toISOString() },
  { id: "t5", name: "Crenças, Valores e Comportamento Social", active: true, order: 5, createdAt: new Date().toISOString() },
  { id: "t6", name: "Direitos Humanos", active: true, order: 6, createdAt: new Date().toISOString() },
  { id: "t7", name: "Educação", active: true, order: 7, createdAt: new Date().toISOString() },
  { id: "t8", name: "Família", active: true, order: 8, createdAt: new Date().toISOString() },
  { id: "t9", name: "Legislação (leis)", active: true, order: 9, createdAt: new Date().toISOString() },
  { id: "t10", name: "Meio ambiente e Ecologia", active: true, order: 10, createdAt: new Date().toISOString() },
  { id: "t11", name: "Meios de Transporte", active: true, order: 11, createdAt: new Date().toISOString() },
  { id: "t12", name: "Música", active: true, order: 12, createdAt: new Date().toISOString() },
  { id: "t13", name: "Política", active: true, order: 13, createdAt: new Date().toISOString() },
  { id: "t14", name: "Saúde e Bem-estar", active: true, order: 14, createdAt: new Date().toISOString() },
  { id: "t15", name: "Animais Selvagens e Domésticos", active: true, order: 15, createdAt: new Date().toISOString() },
  { id: "t16", name: "Artes Visuais, Artes Plásticas", active: true, order: 16, createdAt: new Date().toISOString() },
  { id: "t17", name: "Cidadania e Direitos Humanos", active: true, order: 17, createdAt: new Date().toISOString() },
  { id: "t18", name: "Cinema e Fotografia", active: true, order: 18, createdAt: new Date().toISOString() },
  { id: "t19", name: "Dança", active: true, order: 19, createdAt: new Date().toISOString() },
  { id: "t20", name: "Economia", active: true, order: 20, createdAt: new Date().toISOString() },
  { id: "t21", name: "Emoções, Sensações, Sentimentos e Estados de Espírito", active: true, order: 21, createdAt: new Date().toISOString() },
  { id: "t22", name: "Lazer e Turismo", active: true, order: 22, createdAt: new Date().toISOString() },
  { id: "t23", name: "Literatura e Poesia", active: true, order: 23, createdAt: new Date().toISOString() },
  { id: "t24", name: "Meios de Comunicação", active: true, order: 24, createdAt: new Date().toISOString() },
  { id: "t25", name: "Moda e Vestuário", active: true, order: 25, createdAt: new Date().toISOString() },
  { id: "t26", name: "Negócios", active: true, order: 26, createdAt: new Date().toISOString() },
  { id: "t27", name: "Religião", active: true, order: 27, createdAt: new Date().toISOString() },
];

const DEFAULT_GRAMMAR_EXERCISES: GrammarExercise[] = [
  { id: "g1", categoryId: "subjuntivo", type: "multiple_choice", prompt: "Escolha a forma correta.", question: "Espero que ele ___ cedo.", options: ["chega", "chegue", "chegou", "chegaria"], correct: 1, explanation: "Após 'esperar que', usa-se o presente do subjuntivo.", order: 1, active: true, createdAt: new Date().toISOString() },
  { id: "g2", categoryId: "subjuntivo", type: "fill_blank", prompt: "Complete com a forma verbal correta.", question: "Se eu ___ mais tempo, estudaria tudo.", options: ["tiver", "tinha", "tivesse", "terei"], correct: 2, explanation: "Em hipótese contrária à realidade, usa-se o imperfeito do subjuntivo.", order: 2, active: true, createdAt: new Date().toISOString() },
  { id: "g3", categoryId: "concordancia", type: "error_find", prompt: "Aponte a alternativa com erro de concordância.", question: "Marque a frase incorreta.", options: ["Havia muitas pessoas na rua.", "A maioria dos alunos chegou.", "Fazem dois anos que saí.", "Os meninos cantaram bem."], correct: 2, explanation: "Com sentido de tempo, 'fazer' é impessoal e fica no singular: 'Faz dois anos'.", order: 3, active: true, createdAt: new Date().toISOString() },
  { id: "g4", categoryId: "concordancia", type: "rewrite", prompt: "Escolha a forma correta.", question: "Qual frase está correta?", options: ["Haviam problemas.", "Havia problemas.", "Houveram problemas.", "Tiveram problemas."], correct: 1, explanation: "'Haver' com sentido de existir é impessoal e singular.", order: 4, active: true, createdAt: new Date().toISOString() },
  { id: "g5", categoryId: "preposicoes", type: "multiple_choice", prompt: "Escolha a opção correta.", question: "Ele se referiu ___ pesquisa.", options: ["a", "à", "em", "de"], correct: 0, explanation: "'Referir-se a' exige preposição 'a'.", order: 5, active: true, createdAt: new Date().toISOString() },
  { id: "g6", categoryId: "preposicoes", type: "fill_blank", prompt: "Complete com crase quando necessário.", question: "Vou ___ escola amanhã.", options: ["a", "à", "ao", "na"], correct: 1, explanation: "Há crase na fusão de 'a' + 'a escola'.", order: 6, active: true, createdAt: new Date().toISOString() },
  { id: "g7", categoryId: "pronomes", type: "multiple_choice", prompt: "Escolha a colocação correta.", question: "___ vi ontem no mercado.", options: ["Te", "Vi-te", "A vi", "Te vi"], correct: 3, explanation: "Em português brasileiro, a próclise é comum após ausência de fator de atração em fala informal: 'Te vi'.", order: 7, active: true, createdAt: new Date().toISOString() },
  { id: "g8", categoryId: "pronomes", type: "error_find", prompt: "Encontre a frase correta.", question: "Marque a forma adequada.", options: ["Me disseram a verdade.", "Disseram-me a verdade.", "Disseram me a verdade.", "Disseram à me a verdade."], correct: 1, explanation: "Na norma-padrão, a ênclise 'disseram-me' é a forma esperada.", order: 8, active: true, createdAt: new Date().toISOString() },
  { id: "g9", categoryId: "ortografia", type: "multiple_choice", prompt: "Escolha a grafia correta.", question: "Qual palavra está correta?", options: ["excessão", "exceção", "execessão", "excessao"], correct: 1, explanation: "A forma correta é 'exceção'.", order: 9, active: true, createdAt: new Date().toISOString() },
  { id: "g10", categoryId: "ortografia", type: "fill_blank", prompt: "Complete corretamente.", question: "O professor pediu uma ___ clara.", options: ["análise", "analize", "anallise", "análize"], correct: 0, explanation: "A palavra correta é 'análise'.", order: 10, active: true, createdAt: new Date().toISOString() },
  { id: "g11", categoryId: "subjuntivo", type: "rewrite", prompt: "Escolha a frase melhor escrita.", question: "Selecione a forma adequada.", options: ["Embora ele está cansado, saiu.", "Embora ele estivesse cansado, saiu.", "Embora ele esteve cansado, saiu.", "Embora ele estáva cansado, saiu."], correct: 1, explanation: "Após 'embora', usa-se subjuntivo.", order: 11, active: true, createdAt: new Date().toISOString() },
  { id: "g12", categoryId: "concordancia", type: "multiple_choice", prompt: "Escolha a concordância correta.", question: "___ cinco horas quando chegamos.", options: ["Era", "Eram", "Foi", "Foram"], correct: 1, explanation: "Com horas no plural, o verbo concorda: 'Eram cinco horas'.", order: 12, active: true, createdAt: new Date().toISOString() },
  { id: "g13", categoryId: "preposicoes", type: "multiple_choice", prompt: "Escolha a preposição correta.", question: "Ele obedeceu ___ regras.", options: ["as", "às", "a", "de"], correct: 2, explanation: "'Obedecer' rege a preposição 'a'.", order: 13, active: true, createdAt: new Date().toISOString() },
  { id: "g14", categoryId: "pronomes", type: "fill_blank", prompt: "Complete a frase.", question: "Não ___ disseram nada.", options: ["me", "mim", "eu", "lhe"], correct: 0, explanation: "Com palavra negativa antes do verbo, usa-se próclise: 'não me disseram'.", order: 14, active: true, createdAt: new Date().toISOString() },
  { id: "g15", categoryId: "ortografia", type: "error_find", prompt: "Escolha a alternativa correta.", question: "Marque a frase correta.", options: ["A idéia dele é boa.", "A ideia dele é boa.", "A idêia dele é boa.", "A idéia dele e boa."], correct: 1, explanation: "Após o Acordo Ortográfico, escreve-se 'ideia' sem acento.", order: 15, active: true, createdAt: new Date().toISOString() },
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

router.get("/content/study-topics", (_req, res) => {
  const topics = readData<StudyTopic[]>("study-topics.json", DEFAULT_STUDY_TOPICS);
  res.json(topics.filter((t) => t.active).sort((a, b) => a.order - b.order));
});

router.get("/admin/study-topics", (req, res) => {
  if (!checkAuth(req, res)) return;
  const topics = readData<StudyTopic[]>("study-topics.json", DEFAULT_STUDY_TOPICS);
  res.json(topics.sort((a, b) => a.order - b.order));
});

router.post("/admin/study-topics", (req, res) => {
  if (!checkAuth(req, res)) return;
  const topics = readData<StudyTopic[]>("study-topics.json", DEFAULT_STUDY_TOPICS);
  const body = req.body as Partial<StudyTopic>;
  const topic: StudyTopic = {
    id: uuid(),
    name: body.name ?? "",
    active: body.active ?? true,
    order: body.order ?? topics.length + 1,
    createdAt: new Date().toISOString(),
  };
  topics.push(topic);
  writeData("study-topics.json", topics);
  res.status(201).json(topic);
});

router.put("/admin/study-topics/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const topics = readData<StudyTopic[]>("study-topics.json", DEFAULT_STUDY_TOPICS);
  const idx = topics.findIndex((t) => t.id === req.params.id);
  if (idx < 0) { res.status(404).json({ error: "Not found" }); return; }
  topics[idx] = { ...topics[idx]!, ...req.body as Partial<StudyTopic>, id: req.params.id! };
  writeData("study-topics.json", topics);
  res.json(topics[idx]);
});

router.delete("/admin/study-topics/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const topics = readData<StudyTopic[]>("study-topics.json", DEFAULT_STUDY_TOPICS);
  const filtered = topics.filter((t) => t.id !== req.params.id);
  if (filtered.length === topics.length) { res.status(404).json({ error: "Not found" }); return; }
  writeData("study-topics.json", filtered);
  res.status(204).send();
});

router.get("/content/grammar-exercises", (_req, res) => {
  const exercises = readData<GrammarExercise[]>("grammar-exercises.json", DEFAULT_GRAMMAR_EXERCISES);
  res.json(exercises.filter((e) => e.active).sort((a, b) => a.order - b.order));
});

export default router;
