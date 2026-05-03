import { Router } from "express";
import { db } from "@workspace/db";
import { diagnosticQuestions, diagnosticResults } from "@workspace/db/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { getStoredPasswordHash } from "../lib/adminStore.js";
import OpenAI from "openai";

const router = Router();
const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const authHeader = req.headers["authorization"];
  if (!authHeader?.startsWith("Bearer ")) { res.status(401).json({ error: "Unauthorized" }); return false; }
  const token = authHeader.slice(7);
  const storedHash = getStoredPasswordHash();
  const envPassword = process.env["SESSION_SECRET"] ?? "admin";
  const expected = Buffer.from(storedHash ?? envPassword).toString("base64");
  if (token !== expected) { res.status(401).json({ error: "Unauthorized" }); return false; }
  return true;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

router.get("/admin/diagnostic/analytics", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const questions = await db.select({
      id: diagnosticQuestions.id,
      level: diagnosticQuestions.level,
      category: diagnosticQuestions.category,
      question: diagnosticQuestions.question,
      timesAnswered: diagnosticQuestions.timesAnswered,
      timesCorrect: diagnosticQuestions.timesCorrect,
      active: diagnosticQuestions.active,
    }).from(diagnosticQuestions).orderBy(diagnosticQuestions.order);

    const results = await db.select({
      level: diagnosticResults.level,
      score: diagnosticResults.score,
      totalQuestions: diagnosticResults.totalQuestions,
      timeTakenSeconds: diagnosticResults.timeTakenSeconds,
      categoryBreakdown: diagnosticResults.categoryBreakdown,
      createdAt: diagnosticResults.createdAt,
    }).from(diagnosticResults).orderBy(desc(diagnosticResults.createdAt)).limit(500);

    const levelDist: Record<string, number> = {};
    let totalTime = 0;
    const catAccum: Record<string, { correct: number; total: number }> = {};

    for (const r of results) {
      levelDist[r.level] = (levelDist[r.level] ?? 0) + 1;
      totalTime += r.timeTakenSeconds ?? 0;
      if (r.categoryBreakdown) {
        for (const [cat, v] of Object.entries(r.categoryBreakdown as Record<string, { correct: number; total: number }>)) {
          if (!catAccum[cat]) catAccum[cat] = { correct: 0, total: 0 };
          catAccum[cat]!.correct += v.correct;
          catAccum[cat]!.total += v.total;
        }
      }
    }

    res.json({
      questions: questions.map(q => ({
        ...q,
        accuracy: q.timesAnswered > 0 ? Math.round((q.timesCorrect / q.timesAnswered) * 100) : null,
      })),
      totalResults: results.length,
      levelDistribution: levelDist,
      avgTimeSecs: results.length > 0 ? Math.round(totalTime / results.length) : 0,
      categoryAccuracy: Object.entries(catAccum).map(([cat, v]) => ({
        category: cat,
        accuracy: Math.round((v.correct / v.total) * 100),
        total: v.total,
      })).sort((a, b) => a.accuracy - b.accuracy),
    });
  } catch (err) {
    req.log.error(err, "diagnostic analytics error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AI Insights ──────────────────────────────────────────────────────────────

router.get("/admin/diagnostic/insights", async (req, res) => {
  if (!checkAuth(req, res)) return;
  try {
    const questions = await db.select({
      level: diagnosticQuestions.level,
      category: diagnosticQuestions.category,
      question: diagnosticQuestions.question,
      timesAnswered: diagnosticQuestions.timesAnswered,
      timesCorrect: diagnosticQuestions.timesCorrect,
    }).from(diagnosticQuestions).where(
      and(eq(diagnosticQuestions.active, true), sql`${diagnosticQuestions.timesAnswered} > 0`)
    );

    const recentResults = await db.select({
      level: diagnosticResults.level,
      categoryBreakdown: diagnosticResults.categoryBreakdown,
    }).from(diagnosticResults).orderBy(desc(diagnosticResults.createdAt)).limit(100);

    const weakQuestions = questions
      .filter(q => q.timesAnswered > 0)
      .map(q => ({ ...q, accuracy: q.timesCorrect / q.timesAnswered }))
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const catAccum: Record<string, { correct: number; total: number }> = {};
    for (const r of recentResults) {
      if (r.categoryBreakdown) {
        for (const [cat, v] of Object.entries(r.categoryBreakdown as Record<string, { correct: number; total: number }>)) {
          if (!catAccum[cat]) catAccum[cat] = { correct: 0, total: 0 };
          catAccum[cat]!.correct += v.correct;
          catAccum[cat]!.total += v.total;
        }
      }
    }

    const prompt = `Você é um especialista em ensino de português como língua estrangeira e análise do exame Celpe-Bras.

Analise os dados de desempenho abaixo e forneça insights acionáveis para a equipe pedagógica:

QUESTÕES MAIS DIFÍCEIS (menor acerto):
${weakQuestions.length > 0 ? weakQuestions.map(q => `- [${q.level}][${q.category}] "${q.question.slice(0, 80)}..." — ${Math.round(q.accuracy * 100)}% acerto`).join("\n") : "Sem dados ainda."}

ACERTO POR CATEGORIA:
${Object.entries(catAccum).map(([cat, v]) => `- ${cat}: ${Math.round((v.correct / v.total) * 100)}% (${v.total} respostas)`).join("\n") || "Sem dados ainda."}

Responda em JSON com exatamente este formato:
{
  "headline": "<frase resumo de 1 linha>",
  "weakAreas": ["<área 1>", "<área 2>", "<área 3>"],
  "strongAreas": ["<área forte 1>", "<área forte 2>"],
  "recommendations": [
    { "title": "<título>", "description": "<descrição de 1-2 frases>", "priority": "high|medium|low" },
    { "title": "<título>", "description": "<descrição de 1-2 frases>", "priority": "high|medium|low" },
    { "title": "<título>", "description": "<descrição de 1-2 frases>", "priority": "high|medium|low" }
  ],
  "contentGaps": "<parágrafo sobre lacunas no banco de questões e o que adicionar>"
}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    res.json(JSON.parse(raw));
  } catch (err) {
    req.log.error(err, "diagnostic insights error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AI Question Generator (single) ───────────────────────────────────────────

router.post("/admin/diagnostic/generate", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { level, category, topic, style } = req.body as {
    level: string; category: string; topic?: string; style?: string;
  };
  if (!level || !category) { res.status(400).json({ error: "level and category required" }); return; }

  const prompt = `Você é um especialista em gramática portuguesa e criação de exercícios para o exame Celpe-Bras.

Crie UMA questão de múltipla escolha de alta qualidade para o diagnóstico de nível de português.

ESPECIFICAÇÕES:
- Nível: ${level} (${level === "A2" ? "básico" : level === "B1" ? "intermediário" : level === "B2" ? "intermediário avançado" : "avançado"})
- Categoria gramatical: ${category}
${topic ? `- Tópico específico: ${topic}` : ""}
${style ? `- Estilo da questão: ${style}` : "- Estilo: lacuna (use ___ para a lacuna)"}

CRITÉRIOS DE QUALIDADE:
- Contexto acadêmico ou formal, adequado ao Celpe-Bras
- 4 alternativas plausíveis, apenas uma correta
- Distratores baseados em erros comuns de aprendizes
- Explicação clara e didática do porquê a resposta correta é a certa
- Regra gramatical identificada (ex: "Subjuntivo presente após verbos de volição")

Responda APENAS em JSON com exatamente este formato:
{
  "level": "${level}",
  "category": "${category}",
  "question": "<enunciado da questão>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "correct": <índice 0-3 da resposta correta>,
  "explanation": "<explicação de 1-3 frases em português>",
  "grammarRule": "<nome da regra gramatical>"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    res.json(JSON.parse(raw));
  } catch (err) {
    req.log.error(err, "diagnostic generate error");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── AI Bulk Generation (SSE) ─────────────────────────────────────────────────

router.post("/admin/diagnostic/generate-bulk", async (req, res) => {
  if (!checkAuth(req, res)) return;
  const { level, category, count = 5 } = req.body as {
    level: string; category: string; count?: number;
  };
  if (!level || !category) { res.status(400).json({ error: "level and category required" }); return; }
  const total = Math.min(Number(count) || 5, 10);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const generated: unknown[] = [];
  for (let i = 0; i < total; i++) {
    try {
      res.write(`data: ${JSON.stringify({ type: "progress", current: i + 1, total })}\n\n`);
      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
        max_completion_tokens: 800,
        messages: [{
          role: "user",
          content: `Crie UMA questão de múltipla escolha nível ${level}, categoria "${category}", para diagnóstico Celpe-Bras. Contexto acadêmico. Use ___ para lacunas. Distratores plausíveis. Responda APENAS em JSON: {"level":"${level}","category":"${category}","question":"...","options":["A","B","C","D"],"correct":0,"explanation":"...","grammarRule":"..."}`,
        }],
        response_format: { type: "json_object" },
      });
      const q = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      generated.push(q);
      res.write(`data: ${JSON.stringify({ type: "question", question: q })}\n\n`);
    } catch {
      res.write(`data: ${JSON.stringify({ type: "error", index: i })}\n\n`);
    }
  }
  res.write(`data: ${JSON.stringify({ type: "done", questions: generated })}\n\n`);
  res.end();
});

// ─── AI Session Generator (public, mobile) ────────────────────────────────────

router.post("/diagnostic/generate-session", async (req, res) => {
  const seed = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const topicVariants = [
    "tecnologia, redes sociais e trabalho remoto",
    "saúde, alimentação e bem-estar",
    "educação, carreira e mercado de trabalho",
    "meio ambiente, sustentabilidade e cidades",
    "viagens, culturas e relações interpessoais",
    "economia, consumo e finanças pessoais",
    "cultura brasileira, esportes e entretenimento",
    "política, cidadania e direitos",
  ];
  const topicTheme = topicVariants[Math.floor(Math.random() * topicVariants.length)];

  const prompt = `Você é especialista em ensino de português como língua estrangeira e criação de questões para o exame Celpe-Bras.

Sessão ID: ${seed}
Tema principal dos contextos: ${topicTheme}

Gere EXATAMENTE 30 questões únicas de múltipla escolha para um diagnóstico de nível de português brasileiro.
IMPORTANTE: Cada sessão deve ser completamente diferente de outras sessões. Varie tópicos, vocabulário e situações.

Use EXCLUSIVAMENTE contextos autênticos do cotidiano real:
- Manchetes e trechos de notícias brasileiras
- Postagens e comentários em redes sociais
- E-mails e mensagens de trabalho
- Diálogos e situações do dia a dia (supermercado, médico, emprego, viagem)
- Documentos e formulários oficiais
- Conversas de WhatsApp e aplicativos de mensagem

DISTRIBUIÇÃO OBRIGATÓRIA (30 questões no total):
- 7 × A2 – básico (5 gramática + 2 vocabulário): conjugações regulares, ser/estar, concordância simples; vocabulário do cotidiano
- 8 × B1 – intermediário (6 gramática + 2 vocabulário): subjuntivo presente, pronomes relativos, conectivos causais/concessivos; vocabulário formal/informal
- 8 × B2 – intermediário avançado (6 gramática + 2 vocabulário): futuro do subjuntivo, discurso indireto, regência verbal, crase; vocabulário acadêmico e colocações
- 7 × C1 – avançado (5 gramática + 2 vocabulário): correlação temporal, subjuntivo imperfeito, verbos impessoais, concordância complexa; vocabulário sofisticado e nuançado

Categorias disponíveis: verbos, concordancia, subjuntivo, pronomes, conectivos, preposicoes, vocabulario

TIPOS DE QUESTÕES DE VOCABULÁRIO (categoria "vocabulario"):
- Escolher a palavra correta pelo significado em contexto
- Identificar sinônimo/antônimo mais adequado ao registro
- Completar colocação lexical fixa (ex: "tomar uma ___ drástica")
- Reconhecer o significado de expressão idiomática ou vocabulário técnico
- Distinguir palavras parecidas (ex: iminente vs. eminente)
Para A2: palavras cotidianas básicas; B1: registro formal básico e coloquial; B2: vocabulário acadêmico e colocações formais; C1: termos sofisticados, nuances semânticas, expressões argumentativas

Regras de qualidade:
- Cada questão deve ter um mini-contexto real antes do enunciado (ex: "Numa reunião de trabalho, seu colega disse: '...' Qual alternativa completa corretamente?")
- 4 alternativas plausíveis (distratores baseados em erros reais de aprendizes)
- Apenas uma resposta correta
- Explicação didática de 1-2 frases em português
- Nome da regra gramatical ou vocabular
- Varie os formatos: lacuna com ___, escolha de conector, identificação de erro, completar fala, escolha de palavra pelo significado
- NÃO repita estruturas similares em questões consecutivas

Responda SOMENTE com JSON válido (sem markdown, sem texto adicional):
{
  "questions": [
    {
      "id": "q1",
      "level": "A2",
      "category": "verbos",
      "question": "<mini-contexto real + enunciado com ___ ou pergunta>",
      "options": ["<A>", "<B>", "<C>", "<D>"],
      "correct": 0,
      "explanation": "<explicação didática>",
      "grammarRule": "<nome da regra ou área vocabular>"
    }
  ]
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 12000,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);
    const questions = Array.isArray(parsed.questions) ? parsed.questions : [];
    req.log.info({ count: questions.length, seed, theme: topicTheme }, "diagnostic session generated");
    res.json({ questions });
  } catch (err) {
    req.log.error(err, "generate-session error");
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

// ─── AI Answer Analysis (public, mobile) ──────────────────────────────────────

router.post("/diagnostic/analyze", async (req, res) => {
  const { questions, answers, elapsed } = req.body as {
    questions: Array<{ id: string; level: string; category: string; question: string; options: string[]; correct: number; explanation: string }>;
    answers: (number | null)[];
    elapsed: number;
  };

  if (!questions?.length || !answers?.length) {
    res.status(400).json({ error: "questions and answers required" });
    return;
  }

  const byLevel: Record<string, { c: number; t: number }> = {
    A2: { c: 0, t: 0 }, B1: { c: 0, t: 0 }, B2: { c: 0, t: 0 }, C1: { c: 0, t: 0 },
  };
  const byCategory: Record<string, { c: number; t: number }> = {};
  const mistakes: string[] = [];

  questions.forEach((q, i) => {
    const ans = answers[i];
    const isCorrect = ans === q.correct;
    if (byLevel[q.level]) {
      byLevel[q.level]!.t++;
      if (isCorrect) byLevel[q.level]!.c++;
    }
    if (!byCategory[q.category]) byCategory[q.category] = { c: 0, t: 0 };
    byCategory[q.category]!.t++;
    if (isCorrect) byCategory[q.category]!.c++;
    if (!isCorrect) {
      const chosen = typeof ans === "number" && ans >= 0 ? (q.options[ans] ?? "sem resposta") : "sem resposta";
      mistakes.push(`[${q.level}][${q.category}] "${q.question.slice(0, 70)}" → escolheu: "${chosen}", correto: "${q.options[q.correct]}"`);
    }
  });

  const levelSummary = Object.entries(byLevel)
    .map(([l, v]) => `${l}: ${v.t > 0 ? Math.round((v.c / v.t) * 100) : 0}% (${v.c}/${v.t})`)
    .join(" | ");
  const catSummary = Object.entries(byCategory)
    .map(([c, v]) => `${c}: ${Math.round((v.c / v.t) * 100)}%`)
    .join(", ");
  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  const prompt = `Você é pedagogo especialista em português para o exame Celpe-Bras. Analise o diagnóstico de um aluno e forneça feedback personalizado.

DESEMPENHO POR NÍVEL: ${levelSummary}
DESEMPENHO POR CATEGORIA: ${catSummary}
TEMPO TOTAL: ${mins}min ${secs}s
TOTAL DE ERROS: ${mistakes.length} de ${questions.length} questões

ERROS ESPECÍFICOS:
${mistakes.slice(0, 12).join("\n")}

Com base no padrão de erros, determine o nível real do aluno e forneça análise personalizada com recomendações concretas.

Responda SOMENTE com JSON válido:
{
  "level": "A2|B1|B2|C1",
  "confidence": "alta|média|baixa",
  "personalizedAnalysis": "<2 parágrafos: primeiro analisando pontos fortes, segundo identificando padrão nos erros e o que eles revelam sobre o nível do aluno>",
  "studyRecommendations": [
    {"area": "<área gramatical específica>", "priority": "alta|média", "tip": "<dica concreta e acionável de 1-2 frases>"},
    {"area": "<área>", "priority": "alta|média", "tip": "<dica>"},
    {"area": "<área>", "priority": "média", "tip": "<dica>"}
  ],
  "motivationalNote": "<1-2 frases motivadoras personalizadas ao nível e aos resultados do aluno>"
}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content ?? "{}";
    req.log.info("diagnostic analysis completed");
    res.json(JSON.parse(raw));
  } catch (err) {
    req.log.error(err, "analyze error");
    res.status(500).json({ error: "Failed to analyze" });
  }
});

// ─── Save Result (public, mobile) ─────────────────────────────────────────────

router.post("/diagnostic/result", async (req, res) => {
  const {
    deviceToken, level, score, totalQuestions, timeTakenSeconds,
    answers, categoryBreakdown, sessionQuestions, aiAnalysis,
  } = req.body as {
    deviceToken: string; level: string; score: number; totalQuestions: number;
    timeTakenSeconds: number; answers: { questionId: string; chosen: number; correct: boolean }[];
    categoryBreakdown: Record<string, { correct: number; total: number }>;
    sessionQuestions?: { id: string; level: string; category: string; question: string; options: string[]; correct: number }[];
    aiAnalysis?: { level: string; confidence: string; personalizedAnalysis: string; studyRecommendations: { area: string; priority: string; tip: string }[]; motivationalNote: string };
  };
  if (!deviceToken || !level) { res.status(400).json({ error: "deviceToken and level required" }); return; }
  try {
    const [row] = await db.insert(diagnosticResults).values({
      deviceToken, level, score: score ?? 0, totalQuestions: totalQuestions ?? 0,
      timeTakenSeconds: timeTakenSeconds ?? 0,
      answers: answers ?? [],
      categoryBreakdown: categoryBreakdown ?? {},
      sessionQuestions: sessionQuestions ?? null,
      aiAnalysis: aiAnalysis ?? null,
    }).returning({ id: diagnosticResults.id });
    if (answers?.length) {
      for (const a of answers) {
        await db.update(diagnosticQuestions)
          .set({
            timesAnswered: sql`${diagnosticQuestions.timesAnswered} + 1`,
            timesCorrect: a.correct ? sql`${diagnosticQuestions.timesCorrect} + 1` : diagnosticQuestions.timesCorrect,
          })
          .where(eq(diagnosticQuestions.id, a.questionId));
      }
    }
    res.json({ id: row?.id });
  } catch (err) {
    req.log.error(err, "diagnostic result save error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
