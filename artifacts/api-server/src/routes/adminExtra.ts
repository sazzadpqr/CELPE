import { Router } from "express";
import { db } from "@workspace/db";
import {
  adminVaultConfig,
  adminAdsConfig,
  adminPaywallConfig,
  adminLimitsConfig,
  diagnosticQuestions,
  practicePrompts,
  grammarTopics,
  wotdEntries,
  profiles,
  courses,
  lessons,
  learningPaths,
  featureFlags,
  notificationCampaigns,
  monetizationPlans,
  appBanners,
  studyMaterials,
  studyCategories,
  quizQuestions,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { getStoredPasswordHash } from "../lib/adminStore.js";

const router = Router();

// ─── Auth ─────────────────────────────────────────────────────────────────────

function checkAuth(
  req: import("express").Request,
  res: import("express").Response,
): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  const token = authHeader.slice(7);
  const storedHash = getStoredPasswordHash();
  if (storedHash) {
    const expected = Buffer.from(storedHash).toString("base64");
    if (token !== expected) {
      res.status(401).json({ error: "Unauthorized" });
      return false;
    }
    return true;
  }
  const envPassword = process.env["SESSION_SECRET"] ?? "admin";
  const expected = Buffer.from(envPassword).toString("base64");
  if (token !== expected) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

// ─── VAULT ────────────────────────────────────────────────────────────────────

router.get("/admin/vault", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const rows = await db.select().from(adminVaultConfig).where(eq(adminVaultConfig.id, "singleton"));
    const row = rows[0] ?? null;
    if (!row) {
      await db.insert(adminVaultConfig).values({ id: "singleton" });
      res.json({ openaiModel: "gpt-4o", paddleEnv: "sandbox", paddleApiKey: "", paddleMonthlyPriceId: "", paddleYearlyPriceId: "", paddleWebhookSecret: "", resendApiKey: "", sessionSecret: "", admobAndroidAppId: "", admobIosAppId: "" });
      return;
    }
    res.json({
      openaiModel: row.openaiModel,
      paddleEnv: row.paddleEnv,
      paddleApiKey: row.paddleApiKey,
      paddleMonthlyPriceId: row.paddleMonthlyPriceId,
      paddleYearlyPriceId: row.paddleYearlyPriceId,
      paddleWebhookSecret: row.paddleWebhookSecret,
      resendApiKey: row.resendApiKey,
      sessionSecret: row.sessionSecret,
      admobAndroidAppId: row.admobAndroidAppId,
      admobIosAppId: row.admobIosAppId,
    });
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

router.put("/admin/vault", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const body = req.body as Record<string, string>;
    const updateData: Record<string, string | Date> = { updatedAt: new Date() };
    const allowed = ["openaiModel","paddleEnv","paddleApiKey","paddleMonthlyPriceId","paddleYearlyPriceId","paddleWebhookSecret","resendApiKey","sessionSecret","admobAndroidAppId","admobIosAppId"];
    for (const key of allowed) {
      if (body[key] !== undefined && body[key] !== "") updateData[key] = body[key]!;
    }
    await db.insert(adminVaultConfig).values({ id: "singleton", ...updateData })
      .onConflictDoUpdate({ target: adminVaultConfig.id, set: updateData });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

// ─── ADS CONFIG ───────────────────────────────────────────────────────────────

const ADS_DEFAULTS = {
  adsEnabled: false, webAdsEnabled: false, admobEnabled: false,
  rewardedAdsEnabled: false, hideAdsForPremium: true, adProvider: "none",
  adsenseClientId: "", adsenseHomeSlotId: "", adsenseBottomSlotId: "",
  adsensePracticeSlotId: "", adsenseProfileSlotId: "",
  admobBannerAndroid: "", admobBannerIos: "",
  admobRewardedAndroid: "", admobRewardedIos: "",
  rewardedAdCreditAmount: 1, rewardedAdMaxPerDay: 3,
};

async function getAdsRow() {
  const rows = await db.select().from(adminAdsConfig).where(eq(adminAdsConfig.id, "singleton"));
  if (!rows[0]) {
    await db.insert(adminAdsConfig).values({ id: "singleton" });
    return ADS_DEFAULTS;
  }
  const r = rows[0];
  return {
    adsEnabled: r.adsEnabled, webAdsEnabled: r.webAdsEnabled, admobEnabled: r.admobEnabled,
    rewardedAdsEnabled: r.rewardedAdsEnabled, hideAdsForPremium: r.hideAdsForPremium,
    adProvider: r.adProvider, adsenseClientId: r.adsenseClientId, adsenseHomeSlotId: r.adsenseHomeSlotId,
    adsenseBottomSlotId: r.adsenseBottomSlotId, adsensePracticeSlotId: r.adsensePracticeSlotId,
    adsenseProfileSlotId: r.adsenseProfileSlotId, admobBannerAndroid: r.admobBannerAndroid,
    admobBannerIos: r.admobBannerIos, admobRewardedAndroid: r.admobRewardedAndroid,
    admobRewardedIos: r.admobRewardedIos, rewardedAdCreditAmount: r.rewardedAdCreditAmount,
    rewardedAdMaxPerDay: r.rewardedAdMaxPerDay,
  };
}

router.get("/admin/ads-config", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try { res.json(await getAdsRow()); } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/ads-config", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const body = req.body;
    const set = { ...body, updatedAt: new Date() };
    await db.insert(adminAdsConfig).values({ id: "singleton", ...body })
      .onConflictDoUpdate({ target: adminAdsConfig.id, set });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/ads-config", async (_req, res) => {
  try { res.json(await getAdsRow()); } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── PAYWALL CMS ──────────────────────────────────────────────────────────────

const PAYWALL_DEFAULTS = {
  headline: "Desbloqueie o CelpePrep Premium",
  subheadline: "Avaliações ilimitadas, plano adaptativo e muito mais para sua aprovação.",
  monthlyPrice: "R$ 44,99", monthlyLabel: "por mês",
  yearlyPrice: "R$ 479,88", yearlyLabel: "R$ 39,99/mês — economize 11%",
  yearlyBadge: "Mais Popular", ctaMonthly: "Assinar Mensal", ctaYearly: "Assinar Anual",
  features: ["Avaliações de redação ilimitadas por IA","Práticas geradas por IA ilimitadas","Simulações com timer de 25 minutos","Plano de estudos adaptativo","Flashcards SRS ilimitados","Gabaritos e comentários detalhados","Sem anúncios"],
  footnote: "Cancele quando quiser. Sem fidelidade.",
};

async function getPaywallRow() {
  const rows = await db.select().from(adminPaywallConfig).where(eq(adminPaywallConfig.id, "singleton"));
  if (!rows[0]) {
    await db.insert(adminPaywallConfig).values({ id: "singleton", features: PAYWALL_DEFAULTS.features });
    return PAYWALL_DEFAULTS;
  }
  const r = rows[0];
  return {
    headline: r.headline, subheadline: r.subheadline,
    monthlyPrice: r.monthlyPrice, monthlyLabel: r.monthlyLabel,
    yearlyPrice: r.yearlyPrice, yearlyLabel: r.yearlyLabel,
    yearlyBadge: r.yearlyBadge, ctaMonthly: r.ctaMonthly, ctaYearly: r.ctaYearly,
    features: (r.features as string[]) ?? [],
    footnote: r.footnote,
  };
}

router.get("/admin/paywall-cms", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try { res.json(await getPaywallRow()); } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/paywall-cms", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const body = req.body;
    const set = { ...body, updatedAt: new Date() };
    await db.insert(adminPaywallConfig).values({ id: "singleton", ...body })
      .onConflictDoUpdate({ target: adminPaywallConfig.id, set });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/paywall-cms", async (_req, res) => {
  try { res.json(await getPaywallRow()); } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── DIAGNOSTIC QUESTIONS ─────────────────────────────────────────────────────

const DIAGNOSTIC_SEED = [
  { level: "A2", question: "Como estudante dedicada, ela ___ sempre pontual.", options: ["está","é","estava","seja"], correct: 1, explanation: "'Ser' expressa característica permanente.", active: true, order: 1 },
  { level: "A2", question: "Quando eu era criança, ___ muito nas ruas.", options: ["brinquei","brincava","brinco","brinque"], correct: 1, explanation: "O imperfeito indica ação habitual no passado.", active: true, order: 2 },
  { level: "A2", question: "A carta que você escreveu está muito bem ___.", options: ["escrito","escritas","escrita","escritos"], correct: 2, explanation: "Concordância com 'carta' (feminino singular).", active: true, order: 3 },
  { level: "B1", question: "O professor pediu que os alunos ___ o texto com atenção.", options: ["leram","lerem","lerão","leiam"], correct: 3, explanation: "Após 'pedir que', usa-se o subjuntivo presente.", active: true, order: 4 },
  { level: "B1", question: "___ estivesse cansada, ela continuou estudando.", options: ["Porque","Embora","Portanto","Assim"], correct: 1, explanation: "'Embora' é conjunção concessiva e exige subjuntivo.", active: true, order: 5 },
  { level: "B1", question: "A pesquisadora ___ você me falou ganhou um prêmio.", options: ["que","a qual","de quem","quem"], correct: 2, explanation: "'Falar de alguém' → 'de quem você me falou'.", active: true, order: 6 },
  { level: "B1", question: "Apesar de ___ tarde, os convidados ainda chegaram.", options: ["sendo","ser","é","foi"], correct: 1, explanation: "Após preposição 'de', usa-se infinitivo.", active: true, order: 7 },
  { level: "B2", question: "O relatório ___ pela diretora ontem trouxe dados alarmantes.", options: ["apresentado","apresentou","apresentando","apresentar"], correct: 0, explanation: "Particípio passado como adjetivo.", active: true, order: 8 },
  { level: "B2", question: "Mal ___ ao aeroporto, percebeu que havia esquecido o passaporte.", options: ["chegou","chegava","chegasse","chegaria"], correct: 0, explanation: "'Mal' temporal exige pretérito perfeito.", active: true, order: 9 },
  { level: "B2", question: "Trata-se de um fenômeno ___ poucas pesquisas se dedicaram.", options: ["ao qual","do qual","com que","sobre o qual"], correct: 3, explanation: "Preposição 'sobre' + relativo 'o qual'.", active: true, order: 10 },
  { level: "C1", question: "Fosse mais criteriosa a análise, ___ erros tão graves.", options: ["evitaram-se","ter-se-iam evitado","se evitaria","evitar-se-iam"], correct: 3, explanation: "Condicional no imperfeito do subjuntivo exige futuro do pretérito.", active: true, order: 11 },
  { level: "C1", question: "A proposta, ___ que seja, deve ser considerada com cautela.", options: ["inovadora","inovador","inovar","inovação"], correct: 0, explanation: "Concordância com 'proposta' (feminino).", active: true, order: 12 },
  { level: "C1", question: "Com ___ habilidade demonstrou o candidato, conseguiu o cargo.", options: ["tanta","tamanha","tal","quanta"], correct: 1, explanation: "'Tamanha' expressa intensidade superlativa.", active: true, order: 13 },
  { level: "C1", question: "O documento redigido com tal precisão ___ qualquer questionamento.", options: ["dispensou","dispensar","dispense","dispensaria"], correct: 0, explanation: "Ação concluída no passado: pretérito perfeito.", active: true, order: 14 },
];

async function seedDiagnostic() {
  const existing = await db.select({ id: diagnosticQuestions.id }).from(diagnosticQuestions).limit(1);
  if (existing.length === 0) {
    await db.insert(diagnosticQuestions).values(
      DIAGNOSTIC_SEED.map((q) => ({ ...q, options: q.options }))
    );
  }
}

router.get("/admin/diagnostic-questions", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    await seedDiagnostic();
    const rows = await db.select().from(diagnosticQuestions).orderBy(diagnosticQuestions.order);
    res.json(rows.map((r) => ({
      id: r.id, level: r.level, question: r.question, options: r.options,
      correct: r.correct, explanation: r.explanation, active: r.active,
      createdAt: r.createdAt,
    })));
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.post("/admin/diagnostic-questions", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const body = req.body;
    const [row] = await db.insert(diagnosticQuestions).values({
      level: body.level ?? "B1",
      question: body.question ?? "",
      options: body.options ?? ["","","",""],
      correct: body.correct ?? 0,
      explanation: body.explanation ?? "",
      active: body.active ?? true,
      order: body.order ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/diagnostic-questions/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const body = req.body;
    const [row] = await db.update(diagnosticQuestions)
      .set({
        level: body.level, question: body.question, options: body.options,
        correct: body.correct, explanation: body.explanation,
        active: body.active, updatedAt: new Date(),
      })
      .where(eq(diagnosticQuestions.id, req.params.id!))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.delete("/admin/diagnostic-questions/:id", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const result = await db.delete(diagnosticQuestions).where(eq(diagnosticQuestions.id, req.params.id!)).returning({ id: diagnosticQuestions.id });
    if (result.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.status(204).send();
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/diagnostic-questions", async (_req, res) => {
  try {
    await seedDiagnostic();
    const rows = await db.select().from(diagnosticQuestions).where(eq(diagnosticQuestions.active, true)).orderBy(diagnosticQuestions.order);
    res.json(rows);
  } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── FREEMIUM LIMITS ──────────────────────────────────────────────────────────

const LIMITS_DEFAULTS = {
  freeAiEvaluationsPerMonth: 5, freeAiGeneratedPracticesPerDay: 2,
  freeRetakesPerPractice: 2, freeVocabularyAiEnrichmentsPerDay: 10,
  freePronunciationEvaluationsPerDay: 3, freeConversationMinutesPerDay: 5,
  freeListeningExercisesPerDay: 3, freeGrammarLessonsPerDay: 3,
  freeWritingCoachUsesPerDay: 3, rewardedAdCreditAmount: 1,
  rewardedAdMaxPerDay: 3, practiceTimerSeconds: 1500,
};

async function getLimitsRow() {
  const rows = await db.select().from(adminLimitsConfig).where(eq(adminLimitsConfig.id, "singleton"));
  if (!rows[0]) {
    await db.insert(adminLimitsConfig).values({ id: "singleton" });
    return LIMITS_DEFAULTS;
  }
  const r = rows[0];
  return {
    freeAiEvaluationsPerMonth: r.freeAiEvaluationsPerMonth,
    freeAiGeneratedPracticesPerDay: r.freeAiGeneratedPracticesPerDay,
    freeRetakesPerPractice: r.freeRetakesPerPractice,
    freeVocabularyAiEnrichmentsPerDay: r.freeVocabularyAiEnrichmentsPerDay,
    freePronunciationEvaluationsPerDay: r.freePronunciationEvaluationsPerDay,
    freeConversationMinutesPerDay: r.freeConversationMinutesPerDay,
    freeListeningExercisesPerDay: r.freeListeningExercisesPerDay,
    freeGrammarLessonsPerDay: r.freeGrammarLessonsPerDay,
    freeWritingCoachUsesPerDay: r.freeWritingCoachUsesPerDay,
    rewardedAdCreditAmount: r.rewardedAdCreditAmount,
    rewardedAdMaxPerDay: r.rewardedAdMaxPerDay,
    practiceTimerSeconds: r.practiceTimerSeconds,
  };
}

router.get("/admin/limits", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try { res.json(await getLimitsRow()); } catch { res.status(500).json({ error: "Database error" }); }
});

router.put("/admin/limits", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const body = req.body;
    const set = { ...body, updatedAt: new Date() };
    await db.insert(adminLimitsConfig).values({ id: "singleton", ...body })
      .onConflictDoUpdate({ target: adminLimitsConfig.id, set });
    res.json({ ok: true });
  } catch { res.status(500).json({ error: "Database error" }); }
});

router.get("/content/limits", async (_req, res) => {
  try { res.json(await getLimitsRow()); } catch { res.status(500).json({ error: "Database error" }); }
});

// ─── Content Stats ────────────────────────────────────────────────────────────

router.get("/admin/content-stats", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const [
      [usersRow],
      [premiumRow],
      [promptsRow],
      [grammarRow],
      [wotdRow],
      [diagRow],
      [quizRow],
      [coursesRow],
      [lessonsRow],
      [pathsRow],
      [materialsRow],
      [catsRow],
      [flagsRow],
      [bannersRow],
      [notifsRow],
      [plansRow],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(profiles),
      db.select({ count: sql<number>`count(*)::int` }).from(profiles).where(eq(profiles.isPremium, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(practicePrompts),
      db.select({ count: sql<number>`count(*)::int` }).from(grammarTopics),
      db.select({ count: sql<number>`count(*)::int` }).from(wotdEntries),
      db.select({ count: sql<number>`count(*)::int` }).from(diagnosticQuestions),
      db.select({ count: sql<number>`count(*)::int` }).from(quizQuestions),
      db.select({ count: sql<number>`count(*)::int` }).from(courses),
      db.select({ count: sql<number>`count(*)::int` }).from(lessons),
      db.select({ count: sql<number>`count(*)::int` }).from(learningPaths),
      db.select({ count: sql<number>`count(*)::int` }).from(studyMaterials),
      db.select({ count: sql<number>`count(*)::int` }).from(studyCategories),
      db.select({ count: sql<number>`count(*)::int` }).from(featureFlags).where(eq(featureFlags.enabled, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(appBanners).where(eq(appBanners.active, true)),
      db.select({ count: sql<number>`count(*)::int` }).from(notificationCampaigns),
      db.select({ count: sql<number>`count(*)::int` }).from(monetizationPlans).where(eq(monetizationPlans.isActive, true)),
    ]);

    res.json({
      users: usersRow?.count ?? 0,
      premiumUsers: premiumRow?.count ?? 0,
      prompts: promptsRow?.count ?? 0,
      grammarTopics: grammarRow?.count ?? 0,
      wotdEntries: wotdRow?.count ?? 0,
      diagnosticQuestions: diagRow?.count ?? 0,
      quizQuestions: quizRow?.count ?? 0,
      courses: coursesRow?.count ?? 0,
      lessons: lessonsRow?.count ?? 0,
      learningPaths: pathsRow?.count ?? 0,
      studyMaterials: materialsRow?.count ?? 0,
      studyCategories: catsRow?.count ?? 0,
      activeFeatureFlags: flagsRow?.count ?? 0,
      scheduledBanners: bannersRow?.count ?? 0,
      notificationCampaigns: notifsRow?.count ?? 0,
      monetizationPlans: plansRow?.count ?? 0,
    });
  } catch (err) {
    req.log.error(err, "content-stats error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
