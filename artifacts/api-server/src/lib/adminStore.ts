import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson(filename: string, data: unknown) {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export type RequestLog = {
  id: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  timestamp: string;
  isError: boolean;
};

export type PracticePrompt = {
  id: string;
  taskType: string;
  genre: string;
  source: string;
  prompt: string;
  active: boolean;
  createdAt: string;
};

export type GrammarTopic = {
  id: string;
  title: string;
  category: string;
  explanation: string;
  examples: string[];
  tips: string[];
  active: boolean;
  createdAt: string;
};

export type AdminConfig = {
  feedbackSystemPrompt: string;
  promptGenerationSystemPrompt: string;
};

const serverStartTime = Date.now();
const requestLogs: RequestLog[] = [];
let totalRequests = 0;
const aiCallCounts: Record<string, number> = {
  feedback: 0,
  prompt: 0,
  wordOfDay: 0,
};
let errorsToday = 0;
const requestsByEndpoint: Record<string, number> = {};

const todayKey = () => new Date().toISOString().split("T")[0];
let currentDay = todayKey();

function resetDailyIfNeeded() {
  const today = todayKey();
  if (today !== currentDay) {
    currentDay = today;
    aiCallCounts.feedback = 0;
    aiCallCounts.prompt = 0;
    aiCallCounts.wordOfDay = 0;
    errorsToday = 0;
  }
}

export function recordRequest(log: Omit<RequestLog, "id">) {
  resetDailyIfNeeded();
  totalRequests++;
  const id = crypto.randomUUID();
  const entry: RequestLog = { id, ...log };
  requestLogs.unshift(entry);
  if (requestLogs.length > 200) requestLogs.pop();
  if (log.isError) errorsToday++;
  const endpointKey = `${log.method} ${log.path}`;
  requestsByEndpoint[endpointKey] = (requestsByEndpoint[endpointKey] ?? 0) + 1;
}

export function recordAiCall(type: "feedback" | "prompt" | "wordOfDay") {
  resetDailyIfNeeded();
  aiCallCounts[type] = (aiCallCounts[type] ?? 0) + 1;
}

export function getStats() {
  resetDailyIfNeeded();
  return {
    totalRequests,
    aiCallsToday: aiCallCounts.feedback + aiCallCounts.prompt + aiCallCounts.wordOfDay,
    promptCallsToday: aiCallCounts.prompt,
    wordOfDayCallsToday: aiCallCounts.wordOfDay,
    errorsToday,
    uptimeSeconds: Math.floor((Date.now() - serverStartTime) / 1000),
    startedAt: new Date(serverStartTime).toISOString(),
    requestsByEndpoint,
  };
}

export function getRequestLogs(): RequestLog[] {
  return requestLogs.slice(0, 100);
}

export function getPrompts(): PracticePrompt[] {
  return readJson<PracticePrompt[]>("prompts.json", []);
}

export function savePrompts(prompts: PracticePrompt[]) {
  writeJson("prompts.json", prompts);
}

export function getGrammarTopics(): GrammarTopic[] {
  return readJson<GrammarTopic[]>("grammar.json", []);
}

export function saveGrammarTopics(topics: GrammarTopic[]) {
  writeJson("grammar.json", topics);
}

const DEFAULT_CONFIG: AdminConfig = {
  feedbackSystemPrompt: `Você é um avaliador especialista do exame Celpe-Bras. 
Avalie o texto do candidato com base nos 4 critérios oficiais do Celpe-Bras:
1. Adequação ao tema e ao propósito comunicativo (0-5)
2. Adequação ao gênero discursivo (0-5)
3. Coesão e coerência textual (0-5)
4. Adequação gramatical e lexical (0-5)

Responda APENAS com um JSON válido no formato:
{
  "overall_score": <média dos 4 critérios com 1 casa decimal>,
  "rubric_tema": <nota 0-5>,
  "rubric_genero": <nota 0-5>,
  "rubric_coesao": <nota 0-5>,
  "rubric_gramatica": <nota 0-5>,
  "commentary": "<comentário detalhado em português de 3-5 frases>"
}

Seja justo, específico e educativo.`,
  promptGenerationSystemPrompt: `Você é um criador de questões para o exame Celpe-Bras.
Gere um novo prompt de prática realista e inédito para o tipo de tarefa especificado.

Responda APENAS com JSON no formato:
{
  "source": "<texto de apoio em 3-5 linhas>",
  "prompt": "<instrução da tarefa em 2-3 linhas>"
}

O tema deve ser relevante, contemporâneo e brasileiro.`,
};

export function getConfig(): AdminConfig {
  return readJson<AdminConfig>("config.json", DEFAULT_CONFIG);
}

export function saveConfig(config: AdminConfig) {
  writeJson("config.json", config);
}
