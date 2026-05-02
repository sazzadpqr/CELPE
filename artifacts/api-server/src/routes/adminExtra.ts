import { Router } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getStoredPasswordHash } from "../lib/adminStore.js";

const router = Router();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../../data");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const p = path.join(DATA_DIR, filename);
  if (!fs.existsSync(p)) return defaultValue;
  try { return JSON.parse(fs.readFileSync(p, "utf-8")) as T; } catch { return defaultValue; }
}

function writeJson(filename: string, data: unknown) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
}

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const token = authHeader.slice(7);
  const storedHash = getStoredPasswordHash();
  if (storedHash) {
    const expected = Buffer.from(storedHash).toString("base64");
    if (token !== expected) { res.status(401).json({ error: "Unauthorized" }); return false; }
    return true;
  }
  const envPassword = process.env["SESSION_SECRET"] ?? "admin";
  const expected = Buffer.from(envPassword).toString("base64");
  if (token !== expected) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

// ─── VAULT (API Key Management) ──────────────────────────────────────────────

export type VaultConfig = {
  openaiModel: string;
  paddleEnv: string;
  paddleApiKey: string;
  paddleMonthlyPriceId: string;
  paddleYearlyPriceId: string;
  paddleWebhookSecret: string;
  resendApiKey: string;
  sessionSecret: string;
  admobAndroidAppId: string;
  admobIosAppId: string;
};

const VAULT_DEFAULTS: VaultConfig = {
  openaiModel: "gpt-4o",
  paddleEnv: "sandbox",
  paddleApiKey: "",
  paddleMonthlyPriceId: "",
  paddleYearlyPriceId: "",
  paddleWebhookSecret: "",
  resendApiKey: "",
  sessionSecret: "",
  admobAndroidAppId: "",
  admobIosAppId: "",
};

router.get("/admin/vault", (req, res) => {
  if (!checkAuth(req, res)) return;
  const config = readJson<VaultConfig>("vault-config.json", VAULT_DEFAULTS);
  const masked: Record<string, string> = {};
  for (const [k, v] of Object.entries(config)) {
    masked[k] = v && ["paddleApiKey", "paddleWebhookSecret", "resendApiKey", "sessionSecret"].includes(k)
      ? v.slice(0, 4) + "•".repeat(Math.max(0, v.length - 4))
      : v;
  }
  res.json({ ...config, _masked: masked });
});

router.put("/admin/vault", (req, res) => {
  if (!checkAuth(req, res)) return;
  const current = readJson<VaultConfig>("vault-config.json", VAULT_DEFAULTS);
  const body = req.body as Partial<VaultConfig>;
  const updated: VaultConfig = { ...current };
  for (const key of Object.keys(VAULT_DEFAULTS) as (keyof VaultConfig)[]) {
    if (body[key] !== undefined && body[key] !== "") {
      updated[key] = body[key] as string;
    }
  }
  writeJson("vault-config.json", updated);
  res.json({ ok: true });
});

// ─── ADS CONFIG ───────────────────────────────────────────────────────────────

export type AdsConfig = {
  adsEnabled: boolean;
  webAdsEnabled: boolean;
  admobEnabled: boolean;
  rewardedAdsEnabled: boolean;
  hideAdsForPremium: boolean;
  adProvider: "none" | "adsense" | "admob" | "both";
  adsenseClientId: string;
  adsenseHomeSlotId: string;
  adsenseBottomSlotId: string;
  adsensePracticeSlotId: string;
  adsenseProfileSlotId: string;
  admobBannerAndroid: string;
  admobBannerIos: string;
  admobRewardedAndroid: string;
  admobRewardedIos: string;
  rewardedAdCreditAmount: number;
  rewardedAdMaxPerDay: number;
};

const ADS_DEFAULTS: AdsConfig = {
  adsEnabled: false,
  webAdsEnabled: false,
  admobEnabled: false,
  rewardedAdsEnabled: false,
  hideAdsForPremium: true,
  adProvider: "none",
  adsenseClientId: "",
  adsenseHomeSlotId: "",
  adsenseBottomSlotId: "",
  adsensePracticeSlotId: "",
  adsenseProfileSlotId: "",
  admobBannerAndroid: "",
  admobBannerIos: "",
  admobRewardedAndroid: "",
  admobRewardedIos: "",
  rewardedAdCreditAmount: 1,
  rewardedAdMaxPerDay: 3,
};

router.get("/admin/ads-config", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(readJson<AdsConfig>("ads-config.json", ADS_DEFAULTS));
});

router.put("/admin/ads-config", (req, res) => {
  if (!checkAuth(req, res)) return;
  const current = readJson<AdsConfig>("ads-config.json", ADS_DEFAULTS);
  const updated = { ...current, ...req.body } as AdsConfig;
  writeJson("ads-config.json", updated);
  res.json({ ok: true });
});

// Public endpoint for the mobile app
router.get("/content/ads-config", (_req, res) => {
  res.json(readJson<AdsConfig>("ads-config.json", ADS_DEFAULTS));
});

// ─── PAYWALL CMS ──────────────────────────────────────────────────────────────

export type PaywallCms = {
  headline: string;
  subheadline: string;
  monthlyPrice: string;
  monthlyLabel: string;
  yearlyPrice: string;
  yearlyLabel: string;
  yearlyBadge: string;
  ctaMonthly: string;
  ctaYearly: string;
  features: string[];
  footnote: string;
};

const PAYWALL_DEFAULTS: PaywallCms = {
  headline: "Desbloqueie o CelpePrep Premium",
  subheadline: "Avaliações ilimitadas, plano adaptativo e muito mais para sua aprovação.",
  monthlyPrice: "R$ 44,99",
  monthlyLabel: "por mês",
  yearlyPrice: "R$ 479,88",
  yearlyLabel: "R$ 39,99/mês — economize 11%",
  yearlyBadge: "Mais Popular",
  ctaMonthly: "Assinar Mensal",
  ctaYearly: "Assinar Anual",
  features: [
    "Avaliações de redação ilimitadas por IA",
    "Práticas geradas por IA ilimitadas",
    "Simulações com timer de 25 minutos",
    "Plano de estudos adaptativo",
    "Flashcards SRS ilimitados",
    "Gabaritos e comentários detalhados",
    "Sem anúncios",
  ],
  footnote: "Cancele quando quiser. Sem fidelidade.",
};

router.get("/admin/paywall-cms", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(readJson<PaywallCms>("paywall-cms.json", PAYWALL_DEFAULTS));
});

router.put("/admin/paywall-cms", (req, res) => {
  if (!checkAuth(req, res)) return;
  const current = readJson<PaywallCms>("paywall-cms.json", PAYWALL_DEFAULTS);
  const updated = { ...current, ...req.body } as PaywallCms;
  writeJson("paywall-cms.json", updated);
  res.json({ ok: true });
});

// Public endpoint for the mobile app
router.get("/content/paywall-cms", (_req, res) => {
  res.json(readJson<PaywallCms>("paywall-cms.json", PAYWALL_DEFAULTS));
});

// ─── DIAGNOSTIC QUESTIONS ─────────────────────────────────────────────────────

export type DiagnosticQuestion = {
  id: string;
  level: "A2" | "B1" | "B2" | "C1";
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  active: boolean;
  createdAt: string;
};

const DIAGNOSTIC_SEED: DiagnosticQuestion[] = [
  { id: "q1", level: "A2", question: "Como estudante dedicada, ela ___ sempre pontual.", options: ["está", "é", "estava", "seja"], correct: 1, explanation: "'Ser' expressa característica permanente. 'Estar' é para estados temporários.", active: true, createdAt: new Date().toISOString() },
  { id: "q2", level: "A2", question: "Quando eu era criança, ___ muito nas ruas.", options: ["brinquei", "brincava", "brinco", "brinque"], correct: 1, explanation: "O imperfeito ('brincava') indica ação habitual no passado.", active: true, createdAt: new Date().toISOString() },
  { id: "q3", level: "A2", question: "A carta que você escreveu está muito bem ___.", options: ["escrito", "escritas", "escrita", "escritos"], correct: 2, explanation: "Concordância com 'carta' (feminino singular): bem escrita.", active: true, createdAt: new Date().toISOString() },
  { id: "q4", level: "B1", question: "O professor pediu que os alunos ___ o texto com atenção.", options: ["leram", "lerem", "lerão", "leiam"], correct: 3, explanation: "Após 'pedir que', usa-se o subjuntivo presente: leiam.", active: true, createdAt: new Date().toISOString() },
  { id: "q5", level: "B1", question: "___ estivesse cansada, ela continuou estudando.", options: ["Porque", "Embora", "Portanto", "Assim"], correct: 1, explanation: "'Embora' é conjunção concessiva e exige subjuntivo.", active: true, createdAt: new Date().toISOString() },
  { id: "q6", level: "B1", question: "A pesquisadora ___ você me falou ganhou um prêmio.", options: ["que", "a qual", "de quem", "quem"], correct: 2, explanation: "'Falar de alguém' → 'de quem você me falou'.", active: true, createdAt: new Date().toISOString() },
  { id: "q7", level: "B1", question: "Apesar de ___ tarde, os convidados ainda chegaram.", options: ["sendo", "ser", "é", "foi"], correct: 1, explanation: "Após preposição 'de', usa-se infinitivo: 'apesar de ser'.", active: true, createdAt: new Date().toISOString() },
  { id: "q8", level: "B2", question: "O relatório ___ pela diretora ontem trouxe dados alarmantes.", options: ["apresentado", "apresentou", "apresentando", "apresentar"], correct: 0, explanation: "Particípio passado como adjetivo: 'apresentado pela diretora'.", active: true, createdAt: new Date().toISOString() },
  { id: "q9", level: "B2", question: "Não há dúvida de que a situação ___ graves consequências.", options: ["terá", "teria", "tenha", "teve"], correct: 2, explanation: "Após 'não há dúvida de que' com sentido assertivo, aceita-se indicativo ou subjuntivo. O subjuntivo 'tenha' é correto em uso formal.", active: true, createdAt: new Date().toISOString() },
  { id: "q10", level: "B2", question: "Mal ___ ao aeroporto, percebeu que havia esquecido o passaporte.", options: ["chegou", "chegava", "chegasse", "chegaria"], correct: 0, explanation: "'Mal' com sentido temporal equivale a 'assim que' e exige pretérito perfeito.", active: true, createdAt: new Date().toISOString() },
  { id: "q11", level: "B2", question: "Trata-se de um fenômeno ___ poucas pesquisas se dedicaram.", options: ["ao qual", "do qual", "com que", "sobre o qual"], correct: 3, explanation: "'Dedicar-se a' → 'ao qual' seria correto, mas 'fenômeno sobre o qual pesquisas se dedicaram' é mais natural em contexto de 'dedicar pesquisa a fenômeno'.", active: true, createdAt: new Date().toISOString() },
  { id: "q12", level: "C1", question: "Fosse mais criteriosa a análise, ___ erros tão graves.", options: ["evitaram-se", "ter-se-iam evitado", "se evitaria", "evitar-se-iam"], correct: 3, explanation: "Oração condicional no imperfeito do subjuntivo exige futuro do pretérito: 'evitar-se-iam'.", active: true, createdAt: new Date().toISOString() },
  { id: "q13", level: "C1", question: "A proposta, ___ que seja, deve ser considerada com cautela.", options: ["inovadora", "inovador", "inovar", "inovação"], correct: 0, explanation: "Concordância nominal com 'proposta' (feminino): 'inovadora que seja'.", active: true, createdAt: new Date().toISOString() },
  { id: "q14", level: "C1", question: "Com ___ habilidade demonstrou o candidato, conseguiu o cargo.", options: ["tanta", "tamanha", "tal", "quanta"], correct: 1, explanation: "'Tamanha' é sinônimo de 'tão grande', usado para intensidade superlativa de qualidade.", active: true, createdAt: new Date().toISOString() },
  { id: "q15", level: "C1", question: "O documento redigido com tal precisão ___ qualquer questionamento.", options: ["dispensou", "dispensar", "dispense", "dispensaria"], correct: 0, explanation: "Ação concluída no passado com resultado definitivo: pretérito perfeito 'dispensou'.", active: true, createdAt: new Date().toISOString() },
];

function getDiagnosticQuestions(): DiagnosticQuestion[] {
  const stored = readJson<DiagnosticQuestion[]>("diagnostic-questions.json", []);
  if (stored.length === 0) {
    writeJson("diagnostic-questions.json", DIAGNOSTIC_SEED);
    return DIAGNOSTIC_SEED;
  }
  return stored;
}

router.get("/admin/diagnostic-questions", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(getDiagnosticQuestions());
});

router.post("/admin/diagnostic-questions", (req, res) => {
  if (!checkAuth(req, res)) return;
  const body = req.body as Partial<DiagnosticQuestion>;
  const questions = getDiagnosticQuestions();
  const newQ: DiagnosticQuestion = {
    id: crypto.randomUUID(),
    level: (body.level as DiagnosticQuestion["level"]) ?? "B1",
    question: body.question ?? "",
    options: body.options ?? ["", "", "", ""],
    correct: body.correct ?? 0,
    explanation: body.explanation ?? "",
    active: body.active ?? true,
    createdAt: new Date().toISOString(),
  };
  questions.push(newQ);
  writeJson("diagnostic-questions.json", questions);
  res.status(201).json(newQ);
});

router.put("/admin/diagnostic-questions/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const questions = getDiagnosticQuestions();
  const idx = questions.findIndex((q) => q.id === req.params.id);
  if (idx === -1) { res.status(404).json({ error: "Not found" }); return; }
  questions[idx] = { ...questions[idx]!, ...req.body, id: req.params.id };
  writeJson("diagnostic-questions.json", questions);
  res.json(questions[idx]);
});

router.delete("/admin/diagnostic-questions/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const questions = getDiagnosticQuestions();
  const filtered = questions.filter((q) => q.id !== req.params.id);
  if (filtered.length === questions.length) { res.status(404).json({ error: "Not found" }); return; }
  writeJson("diagnostic-questions.json", filtered);
  res.status(204).send();
});

// Public endpoint for mobile app
router.get("/content/diagnostic-questions", (_req, res) => {
  const questions = getDiagnosticQuestions().filter((q) => q.active);
  res.json(questions);
});

// ─── FREEMIUM LIMITS CONFIG ───────────────────────────────────────────────────

export type LimitsConfig = {
  freeAiEvaluationsPerMonth: number;
  freeAiGeneratedPracticesPerDay: number;
  freeRetakesPerPractice: number;
  freeVocabularyAiEnrichmentsPerDay: number;
  freePronunciationEvaluationsPerDay: number;
  freeConversationMinutesPerDay: number;
  freeListeningExercisesPerDay: number;
  freeGrammarLessonsPerDay: number;
  freeWritingCoachUsesPerDay: number;
  rewardedAdCreditAmount: number;
  rewardedAdMaxPerDay: number;
  practiceTimerSeconds: number;
};

const LIMITS_DEFAULTS: LimitsConfig = {
  freeAiEvaluationsPerMonth: 5,
  freeAiGeneratedPracticesPerDay: 2,
  freeRetakesPerPractice: 2,
  freeVocabularyAiEnrichmentsPerDay: 10,
  freePronunciationEvaluationsPerDay: 3,
  freeConversationMinutesPerDay: 5,
  freeListeningExercisesPerDay: 3,
  freeGrammarLessonsPerDay: 3,
  freeWritingCoachUsesPerDay: 3,
  rewardedAdCreditAmount: 1,
  rewardedAdMaxPerDay: 3,
  practiceTimerSeconds: 1500,
};

router.get("/admin/limits", (req, res) => {
  if (!checkAuth(req, res)) return;
  res.json(readJson<LimitsConfig>("limits-config.json", LIMITS_DEFAULTS));
});

router.put("/admin/limits", (req, res) => {
  if (!checkAuth(req, res)) return;
  const current = readJson<LimitsConfig>("limits-config.json", LIMITS_DEFAULTS);
  const updated = { ...current, ...req.body } as LimitsConfig;
  writeJson("limits-config.json", updated);
  res.json({ ok: true });
});

router.get("/content/limits", (_req, res) => {
  res.json(readJson<LimitsConfig>("limits-config.json", LIMITS_DEFAULTS));
});

export default router;
