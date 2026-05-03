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

type HourlyCounts = { feedback: number; prompt: number; wordOfDay: number };

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

// Hourly AI call tracking — keyed by "YYYY-MM-DDTHH" (UTC)
const hourlyAiCalls: Map<string, HourlyCounts> = new Map();

function hourKey(date = new Date()): string {
  return date.toISOString().slice(0, 13); // "2025-05-02T14"
}

function getOrCreateHour(key: string): HourlyCounts {
  if (!hourlyAiCalls.has(key)) {
    hourlyAiCalls.set(key, { feedback: 0, prompt: 0, wordOfDay: 0 });
    // Prune entries older than 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 13);
    for (const k of hourlyAiCalls.keys()) {
      if (k < cutoff) hourlyAiCalls.delete(k);
    }
  }
  return hourlyAiCalls.get(key)!;
}

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
  const hour = getOrCreateHour(hourKey());
  hour[type]++;
}

function buildHourlySeries() {
  // Return last 24 hours as a sorted array, filling gaps with zeros
  const now = new Date();
  const result = [];
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 13);
    const counts = hourlyAiCalls.get(key) ?? { feedback: 0, prompt: 0, wordOfDay: 0 };
    const label = `${String(d.getUTCHours()).padStart(2, "0")}:00`;
    result.push({
      hour: label,
      feedback: counts.feedback,
      prompt: counts.prompt,
      wordOfDay: counts.wordOfDay,
      total: counts.feedback + counts.prompt + counts.wordOfDay,
    });
  }
  return result;
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
    hourlyAiCalls: buildHourlySeries(),
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

type PasswordStore = { hash: string };

export function getStoredPasswordHash(): string | null {
  const stored = readJson<PasswordStore | null>("password.json", null);
  return stored?.hash ?? null;
}

export function savePasswordHash(hash: string) {
  writeJson("password.json", { hash });
}

export type SecurityEvent = {
  id: string;
  type: string;
  description: string;
  timestamp: string;
};

export function getSecurityEvents(): SecurityEvent[] {
  return readJson<SecurityEvent[]>("security-events.json", []);
}

export function recordSecurityEvent(type: string, description: string) {
  const events = getSecurityEvents();
  const event: SecurityEvent = {
    id: crypto.randomUUID(),
    type,
    description,
    timestamp: new Date().toISOString(),
  };
  events.unshift(event);
  if (events.length > 50) events.pop();
  writeJson("security-events.json", events);
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────

export type QuizCategory = {
  id: string;
  title: string;
  description: string;
  color: string;
  icon: string;
  active: boolean;
  createdAt: string;
};

export type QuizQuestion = {
  id: string;
  categoryId: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  order: number;
  createdAt: string;
};

export type GrammarExercise = {
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
};

const DEFAULT_QUIZ_CATEGORIES: QuizCategory[] = [
  { id: "subjuntivo", title: "Subjuntivo", description: "Presente, pretérito imperfeito e futuro do subjuntivo", color: "#185FA5", icon: "git-branch", active: true, createdAt: new Date().toISOString() },
  { id: "concordancia", title: "Concordância", description: "Nominal e verbal: regras e casos especiais", color: "#1D9E75", icon: "link", active: true, createdAt: new Date().toISOString() },
  { id: "preposicoes", title: "Preposições", description: "Regência verbal, regência nominal e crase", color: "#6B21A8", icon: "arrow-right", active: true, createdAt: new Date().toISOString() },
  { id: "pronomes", title: "Pronomes", description: "Colocação pronominal e uso de pronomes", color: "#BA7517", icon: "user", active: true, createdAt: new Date().toISOString() },
  { id: "ortografia", title: "Ortografia", description: "Acordo ortográfico, acentuação e grafia correta", color: "#D85A30", icon: "type", active: true, createdAt: new Date().toISOString() },
];

const DEFAULT_QUIZ_QUESTIONS: QuizQuestion[] = [
  { id: "s1", categoryId: "subjuntivo", question: "Escolha a forma correta: \"Espero que ele ___ amanhã.\"", options: ["vem", "venha", "viesse", "veio"], correct: 1, explanation: "Após verbos de desejo como 'esperar que', usa-se o presente do subjuntivo: 'venha'.", order: 1, createdAt: new Date().toISOString() },
  { id: "s2", categoryId: "subjuntivo", question: "\"Se eu ___ rico, viajaria pelo mundo.\"", options: ["fosse", "seria", "fui", "sou"], correct: 0, explanation: "Em orações condicionais contrárias à realidade, usa-se o imperfeito do subjuntivo: 'fosse'.", order: 2, createdAt: new Date().toISOString() },
  { id: "s3", categoryId: "subjuntivo", question: "\"Quando você ___ ao Brasil, avise-me.\"", options: ["veio", "venha", "vier", "vem"], correct: 2, explanation: "Com 'quando' referindo-se ao futuro, usa-se o futuro do subjuntivo: 'vier'.", order: 3, createdAt: new Date().toISOString() },
  { id: "s4", categoryId: "subjuntivo", question: "\"É importante que todos ___ às reuniões.\"", options: ["comparecem", "compareçam", "compareceram", "compareceriam"], correct: 1, explanation: "Após expressões impessoais como 'é importante que', usa-se o presente do subjuntivo.", order: 4, createdAt: new Date().toISOString() },
  { id: "s5", categoryId: "subjuntivo", question: "\"Embora ele ___ cansado, continuou trabalhando.\"", options: ["está", "esteve", "esteja", "estivesse"], correct: 3, explanation: "Após 'embora' (concessiva), usa-se o imperfeito do subjuntivo: 'estivesse'.", order: 5, createdAt: new Date().toISOString() },
  { id: "c1", categoryId: "concordancia", question: "\"___ muita gente nas ruas ontem.\"", options: ["Haviam", "Havia", "Houveram", "Tem"], correct: 1, explanation: "'Haver' com sentido de existir é impessoal e fica sempre no singular: 'Havia'.", order: 1, createdAt: new Date().toISOString() },
  { id: "c2", categoryId: "concordancia", question: "\"A maioria dos alunos ___ à aula.\"", options: ["faltaram", "faltou", "Ambas estão corretas", "falta"], correct: 2, explanation: "Com 'a maioria de', o verbo pode concordar com o núcleo ('maioria' → singular) ou com o complemento ('alunos' → plural).", order: 2, createdAt: new Date().toISOString() },
  { id: "c3", categoryId: "concordancia", question: "\"Os meninos e a menina ___ muito espertos.\"", options: ["é", "são", "foi", "estava"], correct: 1, explanation: "Sujeito composto com pessoas diferentes exige o verbo no plural.", order: 3, createdAt: new Date().toISOString() },
  { id: "p1", categoryId: "preposicoes", question: "\"Ele aspira ___ uma vida melhor.\"", options: ["a", "à", "de", "por"], correct: 1, explanation: "'Aspirar' no sentido de 'desejar' rege 'a'. Com artigo feminino, forma-se crase: 'à'.", order: 1, createdAt: new Date().toISOString() },
  { id: "p2", categoryId: "preposicoes", question: "\"Vou ___ São Paulo amanhã.\"", options: ["à", "a", "para", "em"], correct: 1, explanation: "Nomes de cidades sem artigo não admitem crase. Portanto, usa-se 'a' sem acento.", order: 2, createdAt: new Date().toISOString() },
  { id: "pr1", categoryId: "pronomes", question: "\"Não ___ disseram nada.\"", options: ["me", "-me", "lhe", "te"], correct: 0, explanation: "Com palavra negativa antes do verbo, o pronome deve ficar antes (próclise): 'Não me disseram'.", order: 1, createdAt: new Date().toISOString() },
  { id: "pr2", categoryId: "pronomes", question: "\"___ telefonou ontem?\" (referindo-se a você)", options: ["Lhe", "Te", "Quem", "O"], correct: 0, explanation: "'Lhe' é pronome oblíquo de 3ª pessoa que substitui 'a você/a ele/a ela'.", order: 2, createdAt: new Date().toISOString() },
  { id: "o1", categoryId: "ortografia", question: "Qual a grafia correta após o Acordo Ortográfico de 2009?", options: ["idéia", "idea", "ideia", "idêia"], correct: 2, explanation: "Com o Acordo Ortográfico, o acento diferencial foi eliminado de 'ideia'. A grafia correta é 'ideia'.", order: 1, createdAt: new Date().toISOString() },
  { id: "o2", categoryId: "ortografia", question: "Qual palavra leva acento circunflexo?", options: ["voce", "vocé", "você", "vocè"], correct: 2, explanation: "'Você' leva acento circunflexo no 'e'. É uma oxítona terminada em 'e', portanto acentuada.", order: 2, createdAt: new Date().toISOString() },
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

export function getQuizCategories(): QuizCategory[] {
  return readJson<QuizCategory[]>("quiz-categories.json", DEFAULT_QUIZ_CATEGORIES);
}
export function saveQuizCategories(cats: QuizCategory[]) { writeJson("quiz-categories.json", cats); }

export function getQuizQuestions(): QuizQuestion[] {
  return readJson<QuizQuestion[]>("quiz-questions.json", DEFAULT_QUIZ_QUESTIONS);
}
export function saveQuizQuestions(qs: QuizQuestion[]) { writeJson("quiz-questions.json", qs); }

export function getGrammarExercises(): GrammarExercise[] {
  return readJson<GrammarExercise[]>("grammar-exercises.json", DEFAULT_GRAMMAR_EXERCISES);
}
export function saveGrammarExercises(exercises: GrammarExercise[]) {
  writeJson("grammar-exercises.json", exercises);
}

// ─── Exams Archive ─────────────────────────────────────────────────────────────

export type ExamTask = {
  id: string;
  type: string;
  title: string;
  genre: string;
  description: string;
  linkUrl?: string;
  order: number;
};

export type ExamEdition = {
  id: string;
  year: number;
  edition: string;
  title: string;
  description: string;
  tasks: ExamTask[];
  active: boolean;
  order: number;
  createdAt: string;
};

const DEFAULT_EXAMS: ExamEdition[] = [
  { id: "2023-2", year: 2023, edition: "2023/2", title: "Celpe-Bras Novembro 2023", description: "Segunda edição de 2023. Provas aplicadas em novembro.", active: true, order: 1, createdAt: new Date().toISOString(), tasks: [
    { id: "2023-2-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "Carta", description: "Baseada em vídeo sobre tecnologia e sociedade.", order: 1 },
    { id: "2023-2-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Resenha", description: "Texto baseado em áudio sobre questões ambientais.", order: 2 },
    { id: "2023-2-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Artigo", description: "Produção textual sobre impactos do trabalho remoto.", order: 3 },
    { id: "2023-2-t4", type: "Tarefa 4", title: "Tarefa 4 — Gráfico", genre: "Análise", description: "Análise de dados sobre o mercado de trabalho no Brasil.", order: 4 },
  ]},
  { id: "2023-1", year: 2023, edition: "2023/1", title: "Celpe-Bras Abril 2023", description: "Primeira edição de 2023. Provas aplicadas em abril.", active: true, order: 2, createdAt: new Date().toISOString(), tasks: [
    { id: "2023-1-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "E-mail", description: "Baseada em vídeo sobre alimentação saudável.", order: 1 },
    { id: "2023-1-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Relatório", description: "Baseada em áudio sobre migração no Brasil.", order: 2 },
    { id: "2023-1-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Crônica", description: "Tema: memória e identidade cultural.", order: 3 },
    { id: "2023-1-t4", type: "Tarefa 4", title: "Tarefa 4 — Tabela", genre: "Proposta", description: "Dados sobre uso de redes sociais por faixa etária.", order: 4 },
  ]},
  { id: "2022-2", year: 2022, edition: "2022/2", title: "Celpe-Bras Novembro 2022", description: "Segunda edição de 2022.", active: true, order: 3, createdAt: new Date().toISOString(), tasks: [
    { id: "2022-2-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "Carta", description: "Vídeo sobre desigualdade social urbana.", order: 1 },
    { id: "2022-2-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Resumo", description: "Debate sobre saúde mental e trabalho.", order: 2 },
    { id: "2022-2-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Artigo", description: "Texto sobre impacto da pandemia na educação.", order: 3 },
    { id: "2022-2-t4", type: "Tarefa 4", title: "Tarefa 4 — Gráfico", genre: "Análise", description: "Índices de vacinação no Brasil por região.", order: 4 },
  ]},
  { id: "2022-1", year: 2022, edition: "2022/1", title: "Celpe-Bras Abril 2022", description: "Primeira edição de 2022.", active: true, order: 4, createdAt: new Date().toISOString(), tasks: [
    { id: "2022-1-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "Carta Aberta", description: "Baseada em vídeo sobre sustentabilidade.", order: 1 },
    { id: "2022-1-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Resenha", description: "Podcast sobre empreendedorismo feminino.", order: 2 },
    { id: "2022-1-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Conto", description: "Texto literário sobre identidade e pertencimento.", order: 3 },
    { id: "2022-1-t4", type: "Tarefa 4", title: "Tarefa 4 — Infográfico", genre: "Análise", description: "Dados sobre desmatamento no cerrado.", order: 4 },
  ]},
  { id: "inep", year: 0, edition: "INEP Oficial", title: "Materiais Oficiais — INEP", description: "Acesse provas, gabaritos e materiais oficiais do Celpe-Bras no site do INEP.", active: true, order: 5, createdAt: new Date().toISOString(), tasks: [
    { id: "inep-link", type: "Link Externo", title: "Site oficial INEP — Celpe-Bras", genre: "Portal", description: "Provas anteriores, edital e informações oficiais.", linkUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/celpe-bras", order: 1 },
  ]},
];

export function getExams(): ExamEdition[] {
  return readJson<ExamEdition[]>("exams.json", DEFAULT_EXAMS);
}
export function saveExams(exams: ExamEdition[]) { writeJson("exams.json", exams); }

// ─── Word of the Day Bank ──────────────────────────────────────────────────────

export type WotdEntry = {
  id: string;
  word: string;
  pos: string;
  topic?: string;
  definition: string;
  example: string;
  active: boolean;
  createdAt: string;
};

const DEFAULT_WOTD: WotdEntry[] = [
  { id: "w1", word: "reivindicar", pos: "verbo", definition: "Reclamar como direito próprio; exigir algo a que se tem direito.", example: "Os trabalhadores reivindicaram melhores condições.", active: true, createdAt: new Date().toISOString() },
  { id: "w2", word: "suscitar", pos: "verbo", definition: "Provocar, causar, originar (sentimento, reação ou questão).", example: "O discurso suscitou grande debate.", active: true, createdAt: new Date().toISOString() },
  { id: "w3", word: "ponderar", pos: "verbo", definition: "Considerar atentamente; avaliar com cuidado antes de decidir.", example: "É preciso ponderar todas as consequências.", active: true, createdAt: new Date().toISOString() },
  { id: "w4", word: "elucidar", pos: "verbo", definition: "Esclarecer, tornar mais claro; explicar com detalhes.", example: "O relatório elucidou os fatos do caso.", active: true, createdAt: new Date().toISOString() },
  { id: "w5", word: "equívoco", pos: "substantivo", definition: "Erro resultante de má compreensão; engano, mal-entendido.", example: "O equívoco causou confusão entre os participantes.", active: true, createdAt: new Date().toISOString() },
  { id: "w6", word: "paradoxo", pos: "substantivo", definition: "Situação ou afirmação que parece contraditória mas pode ser verdadeira.", example: "É um paradoxo que a tecnologia una e isole as pessoas.", active: true, createdAt: new Date().toISOString() },
  { id: "w7", word: "eminente", pos: "adjetivo", definition: "De grande destaque; notável, ilustre.", example: "Um eminente cientista recebeu o prêmio.", active: true, createdAt: new Date().toISOString() },
  { id: "w8", word: "lacuna", pos: "substantivo", definition: "Espaço vazio; ausência de algo necessário; falha.", example: "Há uma lacuna na legislação sobre esse tema.", active: true, createdAt: new Date().toISOString() },
  { id: "w9", word: "mitigar", pos: "verbo", definition: "Diminuir a intensidade de; amenizar, suavizar.", example: "Medidas foram tomadas para mitigar os efeitos da crise.", active: true, createdAt: new Date().toISOString() },
  { id: "w10", word: "corroborar", pos: "verbo", definition: "Confirmar, reforçar (argumento, tese ou afirmação).", example: "Os estudos corroboram a hipótese apresentada.", active: true, createdAt: new Date().toISOString() },
];

export function getWotdEntries(): WotdEntry[] {
  return readJson<WotdEntry[]>("wotd.json", DEFAULT_WOTD);
}
export function saveWotdEntries(entries: WotdEntry[]) { writeJson("wotd.json", entries); }

// ─── Quiz Lesson Content ───────────────────────────────────────────────────────

export type LessonExample = { sentence: string; highlight: string; note: string };
export type LessonMistake = { wrong: string; right: string; reason: string };

export type QuizLesson = {
  categoryId: string;
  rule: string;
  examples: LessonExample[];
  mistake: LessonMistake;
  tip: string;
  updatedAt: string;
};

const DEFAULT_QUIZ_LESSONS: QuizLesson[] = [
  {
    categoryId: "subjuntivo",
    rule: "O subjuntivo expressa dúvida, desejo, hipótese ou sentimento. Aparece após verbos como querer, esperar, duvidar, temer + 'que'; expressões impessoais (é importante que, é necessário que); conjunções como embora, caso, quando (futuro), se (hipótese irreal).",
    examples: [
      { sentence: "Espero que ele venha amanhã.", highlight: "venha", note: "Presente do subjuntivo após 'esperar que'" },
      { sentence: "Se eu fosse rico, viajaria pelo mundo.", highlight: "fosse", note: "Imperfeito do subj. em hipótese contrária à realidade" },
      { sentence: "Quando você chegar, me avise.", highlight: "chegar", note: "Futuro do subj. com 'quando' referindo ao futuro" },
    ],
    mistake: { wrong: "Espero que ele vem amanhã.", right: "Espero que ele venha amanhã.", reason: "Após verbos de desejo + 'que', sempre subjuntivo." },
    tip: "💡 Gatilho: verbo de desejo/dúvida/sentimento + 'que' → subjuntivo. 'Quando' + futuro → futuro do subjuntivo.",
    updatedAt: new Date().toISOString(),
  },
  {
    categoryId: "concordancia",
    rule: "O verbo concorda com o sujeito em número e pessoa. Atenção: 'haver' no sentido de existir é impessoal (singular); 'fazer' indicando tempo também. Expressões partitivas (a maioria de, parte de) admitem concordância com o núcleo ou com o complemento.",
    examples: [
      { sentence: "Havia muitas pessoas na festa.", highlight: "Havia", note: "Haver impessoal = sempre singular" },
      { sentence: "A maioria dos alunos foi aprovada.", highlight: "foi", note: "Partitiva: concorda com 'maioria' (sing.) ou 'alunos' (pl.)" },
      { sentence: "Pedro e Maria chegaram cedo.", highlight: "chegaram", note: "Sujeito composto = plural" },
    ],
    mistake: { wrong: "Haviam muitas pessoas aqui.", right: "Havia muitas pessoas aqui.", reason: "'Haver' como existir é sempre impessoal — singular." },
    tip: "💡 Teste: 'ter' e 'haver' com sentido de existir = singular. 'Fazer' no sentido de tempo = singular.",
    updatedAt: new Date().toISOString(),
  },
  {
    categoryId: "preposicoes",
    rule: "Regência verbal: cada verbo exige uma preposição específica. Crase (à): fusão de preposição 'a' + artigo 'a' (feminino). Não há crase antes de pronomes, verbos, palavras masculinas ou nomes de cidades sem artigo.",
    examples: [
      { sentence: "Aspiro à vida tranquila.", highlight: "à", note: "Aspirar (desejar) + 'a' + fem. = crase" },
      { sentence: "Vou a São Paulo amanhã.", highlight: "a", note: "Cidade sem artigo = sem crase" },
      { sentence: "Lembrei-me da viagem.", highlight: "da", note: "Lembrar-se de + 'a' → contração 'da'" },
    ],
    mistake: { wrong: "Vou à São Paulo amanhã.", right: "Vou a São Paulo amanhã.", reason: "Nomes de cidades sem artigo não admitem crase." },
    tip: "💡 Teste da crase: substitua por palavra masculina. Se usar 'ao' → há crase. Se usar 'a' → sem crase.",
    updatedAt: new Date().toISOString(),
  },
  {
    categoryId: "pronomes",
    rule: "Próclise (pronome antes): após negação, conjunção subordinativa, pronome relativo. Ênclise (pronome depois com hífen): início de oração, após vírgula, com imperativo afirmativo. Mesóclise (intercalado): futuro do presente e futuro do pretérito.",
    examples: [
      { sentence: "Não me diga isso.", highlight: "me", note: "Próclise obrigatória após negação" },
      { sentence: "Diga-me a verdade.", highlight: "-me", note: "Ênclise com imperativo afirmativo" },
      { sentence: "Dir-lhe-ei a resposta amanhã.", highlight: "-lhe-", note: "Mesóclise no futuro do presente" },
    ],
    mistake: { wrong: "Me ligue quando chegar.", right: "Ligue-me quando chegar.", reason: "Em início de oração, o pronome átono não pode aparecer antes do verbo (norma culta)." },
    tip: "💡 Início de frase = nunca pronome átono antes do verbo em português formal. 'Me ligue' é coloquial.",
    updatedAt: new Date().toISOString(),
  },
  {
    categoryId: "ortografia",
    rule: "Acordo Ortográfico de 2009: eliminou o trema em palavras nativas; suprimiu acentos diferenciais em palavras como 'para', 'pelo', 'polo'; aboliu o hífen em compostos com prefixos terminados em vogal + base começada em vogal diferente.",
    examples: [
      { sentence: "ideia, assembleia, europeu", highlight: "ideia", note: "Ditongos abertos não recebem mais acento" },
      { sentence: "autoescola, contraindicado", highlight: "autoescola", note: "Prefixo + vogal diferente = sem hífen" },
      { sentence: "frequente, tranquilo, linguiça", highlight: "frequente", note: "Trema eliminado em palavras nativas" },
    ],
    mistake: { wrong: "idéia, heróico, tranqüilo", right: "ideia, heroico, tranquilo", reason: "O Acordo Ortográfico de 2009 eliminou esses acentos e o trema." },
    tip: "💡 Trema só sobrou em nomes estrangeiros: Müller, Büchs. Em português nativo: sem trema.",
    updatedAt: new Date().toISOString(),
  },
];

export function getQuizLessons(): QuizLesson[] {
  return readJson<QuizLesson[]>("quiz-lessons.json", DEFAULT_QUIZ_LESSONS);
}
export function saveQuizLessons(lessons: QuizLesson[]) { writeJson("quiz-lessons.json", lessons); }
