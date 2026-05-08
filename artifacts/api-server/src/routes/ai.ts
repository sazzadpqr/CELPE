import { Router } from "express";
import type { Response } from "express";
import multer from "multer";
import OpenAI from "openai";
import { z } from "zod";
import { db } from "@workspace/db";
import { adminAiConfig, profiles } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

// ─── Multer for audio uploads (oral feedback) ────────────────────────────────
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB — Whisper max
  fileFilter: (_req, file, cb) => {
    const allowed = ["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg", "audio/m4a", "audio/x-m4a"];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ─── Zod schemas for AI response shapes ─────────────────────────────────────

const FeedbackScoresSchema = z.object({
  rubric_tema: z.number().min(0).max(5),
  rubric_genero: z.number().min(0).max(5),
  rubric_coesao: z.number().min(0).max(5),
  rubric_gramatica: z.number().min(0).max(5),
});

const PromptSchema = z.object({
  source: z.string().default(""),
  prompt: z.string().default(""),
});

const OralSimulatorSchema = z.object({
  title: z.string().default("Simulação Oral"),
  description: z.string().default("Treine sua resposta oral com um cenário realista."),
  prepTips: z.array(z.string()).default([]),
  instructions: z.array(z.string()).default([]),
  followUps: z.array(z.string()).default([]),
});

const WordOfDaySchema = z.object({
  word: z.string(),
  part_of_speech: z.string().default(""),
  register: z.string().default("formal"),
  definition: z.string().default(""),
  example: z.string().default(""),
  etymology: z.string().default(""),
  synonyms: z.array(z.string()).default([]),
});

const VocabWordSchema = z.object({
  word: z.string().default(""),
  definition: z.string().default(""),
  example: z.string().default(""),
  partOfSpeech: z.string().default("substantivo"),
  register: z.string().default("neutro"),
});

const VocabGenerateSchema = z.object({
  words: z.array(VocabWordSchema).default([]),
});

const OralRubricSchema = z.object({
  rubric_adequacao: z.number().min(0).max(5),
  rubric_fluencia: z.number().min(0).max(5),
  rubric_pronuncia: z.number().min(0).max(5),
  rubric_interacao: z.number().min(0).max(5),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

// In-memory cache for AI config (refreshed every 5 minutes)
let aiConfigCache: {
  systemPromptFeedback: string;
  systemPromptGeneration: string;
  modelFeedback: string;
  modelGeneration: string;
  maxTokensFeedback: number;
  maxTokensGeneration: number;
  fetchedAt: number;
} | null = null;

const AI_CONFIG_TTL_MS = 5 * 60 * 1000;

async function loadAiConfig() {
  const now = Date.now();
  if (aiConfigCache && now - aiConfigCache.fetchedAt < AI_CONFIG_TTL_MS) {
    return aiConfigCache;
  }
  try {
    const [row] = await db.select().from(adminAiConfig).where(eq(adminAiConfig.id, "singleton"));
    if (row) {
      aiConfigCache = {
        systemPromptFeedback: row.systemPromptFeedback,
        systemPromptGeneration: row.systemPromptGeneration,
        modelFeedback: row.modelFeedback,
        modelGeneration: row.modelGeneration,
        maxTokensFeedback: row.maxTokensFeedback,
        maxTokensGeneration: row.maxTokensGeneration,
        fetchedAt: now,
      };
      return aiConfigCache;
    }
  } catch { }
  return {
    systemPromptFeedback: "",
    systemPromptGeneration: "",
    modelFeedback: "gpt-4o",
    modelGeneration: "gpt-4o-mini",
    maxTokensFeedback: 1024,
    maxTokensGeneration: 512,
    fetchedAt: now,
  };
}

const clamped = (n: number) => Math.min(5, Math.max(0, Number(n) || 0));

/**
 * Checks whether the device has enough AI credits for a single call.
 * Atomically decrements aiCredits in the DB and returns true on success.
 * Returns false (and sends the error response) when credits are exhausted.
 * Skips the check for unknown devices (first-time users) and premium users.
 */
async function checkAndDeductCredits(deviceToken: string, res: Response): Promise<boolean> {
  try {
    const [row] = await db
      .select({ aiCredits: profiles.aiCredits, isPremium: profiles.isPremium })
      .from(profiles)
      .where(eq(profiles.deviceToken, deviceToken));

    // Unknown device — allow the call (first use)
    if (!row) return true;

    // Premium users have unlimited credits
    if (row.isPremium) return true;

    // Atomically decrement only when credits > 0, using a WHERE guard.
    // If no rows are returned it means aiCredits was already 0 when the
    // UPDATE was evaluated (no race condition possible here).
    const updated = await db
      .update(profiles)
      .set({ aiCredits: sql`${profiles.aiCredits} - 1`, updatedAt: new Date() })
      .where(eq(profiles.deviceToken, deviceToken))
      .returning({ aiCredits: profiles.aiCredits });

    if (updated.length === 0 || (updated[0] !== undefined && updated[0].aiCredits < 0)) {
      // Restore to 0 if it somehow went negative
      if (updated[0] !== undefined && updated[0].aiCredits < 0) {
        await db
          .update(profiles)
          .set({ aiCredits: 0, updatedAt: new Date() })
          .where(eq(profiles.deviceToken, deviceToken));
      }
      res.status(402).json({
        error: "Créditos de IA esgotados",
        code: "CREDITS_EXHAUSTED",
        aiCredits: 0,
      });
      return false;
    }

    return true;
  } catch {
    // DB error — allow the call through rather than blocking the user
    return true;
  }
}

/**
 * Writes an SSE event to the response stream.
 */
function sseEvent(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ─── POST /ai/feedback ───────────────────────────────────────────────────────
//
// Streams the evaluation via Server-Sent Events (SSE).
//
// Events emitted:
//   progress  { stage: "analyzing" | "scoring" }   — immediate feedback
//   scores    { rubric_tema, rubric_genero, rubric_coesao, rubric_gramatica,
//               overall_score, aiCreditsRemaining? }
//   token     { content: string }                   — commentary tokens
//   done      {}
//   error     { message: string }
//
// The system prompt instructs the model to output a structured format:
//   SCORES: {"rubric_tema":N,"rubric_genero":N,"rubric_coesao":N,"rubric_gramatica":N}
//   COMMENTARY: <free-text commentary>
//
// This allows the server to send the rubric scores as soon as they appear in
// the stream, then stream the commentary text token-by-token.
//
router.post("/ai/feedback", async (req, res) => {
  const { text, task_type, genre, time_expired, deviceToken } = req.body as {
    text: string;
    task_type: string;
    genre: string;
    time_expired?: boolean;
    deviceToken?: string;
  };

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }

  // ── Credit gate ───────────────────────────────────────────────────────────
  if (deviceToken) {
    const ok = await checkAndDeductCredits(deviceToken, res);
    if (!ok) return;
  }

  // ── Set up SSE ────────────────────────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  sseEvent(res, "progress", { stage: "analyzing" });

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const expiredNote = time_expired ? "\n\nNOTA: O texto foi submetido após o tempo esgotado." : "";

  const aiCfg = await loadAiConfig();

  // Prompt designed for streaming: scores on the first line, commentary after.
  const defaultFeedbackPrompt = `Você é um avaliador especialista do exame Celpe-Bras.
Avalie o texto do candidato com base nos 4 critérios oficiais do Celpe-Bras (cada um de 0 a 5).

Responda EXATAMENTE neste formato (duas linhas, nada mais):
SCORES: {"rubric_tema":<0-5>,"rubric_genero":<0-5>,"rubric_coesao":<0-5>,"rubric_gramatica":<0-5>}
COMMENTARY: <comentário detalhado em português de 3-5 frases, destacando pontos fortes e áreas de melhoria com exemplos do texto>

Seja justo, específico e educativo.`;

  const systemPrompt = aiCfg.systemPromptFeedback || defaultFeedbackPrompt;

  const userPrompt = `Tipo de tarefa: ${task_type}
Gênero esperado: ${genre}
Número de palavras: ${wordCount}${expiredNote}

TEXTO DO CANDIDATO:
${text}`;

  try {
    sseEvent(res, "progress", { stage: "scoring" });

    const stream = await openai.chat.completions.create({
      model: aiCfg.modelFeedback,
      max_completion_tokens: aiCfg.maxTokensFeedback,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    let buffer = "";
    let scoresEmitted = false;
    let commentaryStarted = false;

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (!token) continue;

      buffer += token;

      if (!scoresEmitted) {
        // Look for the SCORES line
        const newlineIdx = buffer.indexOf("\n");
        if (newlineIdx !== -1) {
          const scoresLine = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          const match = scoresLine.match(/SCORES:\s*(\{.+\})/);
          if (match) {
            try {
              const raw = JSON.parse(match[1]);
              const parsed = FeedbackScoresSchema.safeParse(raw);
              const scores = parsed.success ? parsed.data : {
                rubric_tema: 0, rubric_genero: 0, rubric_coesao: 0, rubric_gramatica: 0,
              };

              const rubricTema = clamped(scores.rubric_tema);
              const rubricGenero = clamped(scores.rubric_genero);
              const rubricCoesao = clamped(scores.rubric_coesao);
              const rubricGramatica = clamped(scores.rubric_gramatica);
              const overall = Number(((rubricTema + rubricGenero + rubricCoesao + rubricGramatica) / 4).toFixed(1));

              // Fetch remaining credits for the response
              let aiCreditsRemaining: number | undefined;
              if (deviceToken) {
                try {
                  const [p] = await db.select({ aiCredits: profiles.aiCredits }).from(profiles).where(eq(profiles.deviceToken, deviceToken));
                  aiCreditsRemaining = p?.aiCredits ?? undefined;
                } catch { }
              }

              sseEvent(res, "scores", {
                overall_score: overall,
                rubric_tema: rubricTema,
                rubric_genero: rubricGenero,
                rubric_coesao: rubricCoesao,
                rubric_gramatica: rubricGramatica,
                aiCreditsRemaining,
              });
              scoresEmitted = true;
            } catch {
              // Malformed scores line — continue buffering
            }
          }
        }
        continue;
      }

      // Stream the commentary tokens
      if (!commentaryStarted) {
        // Strip the "COMMENTARY: " prefix before streaming
        const prefixIdx = buffer.indexOf("COMMENTARY: ");
        if (prefixIdx !== -1) {
          buffer = buffer.slice(prefixIdx + "COMMENTARY: ".length);
          commentaryStarted = true;
        } else if (buffer.includes("\n")) {
          // Skip blank lines between SCORES and COMMENTARY
          buffer = buffer.replace(/^\n+/, "");
        }
        // Emit anything remaining in the buffer now that the prefix is stripped
        if (commentaryStarted && buffer) {
          sseEvent(res, "token", { content: buffer });
          buffer = "";
        }
        continue;
      }

      sseEvent(res, "token", { content: token });
      buffer = "";
    }

    // Flush any remaining buffer as a final token
    if (buffer.trim()) {
      sseEvent(res, "token", { content: buffer });
    }

    // If we never parsed scores (model deviated from format), emit fallback scores
    if (!scoresEmitted) {
      const fallback = Math.min(5, Math.max(1, Number((wordCount / 60).toFixed(1))));
      sseEvent(res, "scores", {
        overall_score: fallback,
        rubric_tema: fallback,
        rubric_genero: fallback,
        rubric_coesao: fallback,
        rubric_gramatica: fallback,
      });
    }

    sseEvent(res, "done", {});
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI feedback error");
    const fallback = Math.min(5, Math.max(1, Number((wordCount / 60).toFixed(1))));
    sseEvent(res, "scores", {
      overall_score: fallback,
      rubric_tema: fallback,
      rubric_genero: fallback,
      rubric_coesao: fallback,
      rubric_gramatica: fallback,
    });
    sseEvent(res, "token", { content: "Avaliação automática indisponível no momento. Pontuação estimada com base na extensão do texto. Tente novamente em instantes." });
    sseEvent(res, "done", {});
    res.end();
  }
});

// ─── POST /ai/prompt ─────────────────────────────────────────────────────────
router.post("/ai/prompt", async (req, res) => {
  const { task_type, genre } = req.body as { task_type: string; genre: string };

  if (!task_type) {
    res.status(400).json({ error: "task_type is required" });
    return;
  }

  const aiCfg2 = await loadAiConfig();

  const defaultGenerationPrompt = `Você é um criador de questões para o exame Celpe-Bras.
Gere um novo prompt de prática realista e inédito para o tipo de tarefa especificado.

Responda APENAS com JSON no formato:
{
  "source": "<texto de apoio em 3-5 linhas: descreva um vídeo, áudio, texto ou dado visual realista e atual>",
  "prompt": "<instrução da tarefa em 2-3 linhas: o que o candidato deve escrever, incluindo gênero e extensão esperada>"
}

O tema deve ser relevante, contemporâneo e brasileiro. Evite temas repetidos.
Alguns temas sugeridos: sustentabilidade, saúde pública, tecnologia e sociedade, desigualdade, cultura, mercado de trabalho, educação, urbanização.`;

  const systemPrompt = aiCfg2.systemPromptGeneration || defaultGenerationPrompt;
  const userPrompt = `Tipo de tarefa: ${task_type}\nGênero esperado: ${genre}`;

  try {
    const completion = await openai.chat.completions.create({
      model: aiCfg2.modelGeneration,
      max_completion_tokens: aiCfg2.maxTokensGeneration,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = PromptSchema.safeParse(JSON.parse(raw));

    res.json(result.success ? result.data : { source: "", prompt: "" });
  } catch (err) {
    req.log.error({ err }, "AI prompt error");
    res.status(503).json({ error: "Prompt generation unavailable" });
  }
});

// ─── POST /ai/oral-simulator ─────────────────────────────────────────────────
router.post("/ai/oral-simulator", async (req, res) => {
  const { level, topic, mode } = req.body as {
    level?: string;
    topic?: string;
    mode?: string;
  };

  const aiCfg = await loadAiConfig();
  const systemPrompt = `Você é um criador de simulações orais para o exame Celpe-Bras.
Gere um cenário autêntico, útil e desafiador para treino oral em português brasileiro.

Responda APENAS com JSON no formato:
{
  "title": "<título curto e forte>",
  "description": "<1 frase explicando a tarefa>",
  "prepTips": ["<dica 1>", "<dica 2>", "<dica 3>", "<dica 4>"],
  "instructions": ["<instrução 1>", "<instrução 2>", "<instrução 3>", "<instrução 4>", "<instrução 5>"],
  "followUps": ["<pergunta 1>", "<pergunta 2>", "<pergunta 3>"]
}

O cenário deve ser apropriado para nível ${level || "B1"} e modo ${mode || "simulação"}.
Tema sugerido: ${topic || "vida cotidiana, trabalho, estudo, cultura ou serviços públicos"}.`;

  try {
    const completion = await openai.chat.completions.create({
      model: aiCfg.modelGeneration,
      max_completion_tokens: 700,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Gere uma nova simulação oral inédita agora.` },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = OralSimulatorSchema.safeParse(JSON.parse(raw));
    const data = result.success ? result.data : OralSimulatorSchema.parse({});

    const FALLBACK_TIPS = [
      "Organize a resposta em abertura, desenvolvimento e fechamento.",
      "Use conectivos para ganhar fluência.",
      "Dê exemplos concretos.",
      "Mantenha o registro adequado ao contexto.",
    ];
    const FALLBACK_INSTRUCTIONS = [
      "Leia o cenário com atenção.",
      "Fale com clareza e naturalidade.",
      "Desenvolva argumentos com exemplos.",
      "Responda às perguntas de acompanhamento.",
      "Conclua com uma ideia forte.",
    ];
    const FALLBACK_FOLLOWUPS = [
      "Quais seriam os principais desafios?",
      "Como você resolveria isso na prática?",
      "Que exemplo brasileiro ajuda a entender melhor o tema?",
    ];

    res.json({
      title: data.title || "Simulação Oral",
      description: data.description || "Treine sua resposta oral com um cenário realista.",
      prepTips: data.prepTips.length > 0 ? data.prepTips.slice(0, 4) : FALLBACK_TIPS,
      instructions: data.instructions.length > 0 ? data.instructions.slice(0, 5) : FALLBACK_INSTRUCTIONS,
      followUps: data.followUps.length > 0 ? data.followUps.slice(0, 3) : FALLBACK_FOLLOWUPS,
    });
  } catch (err) {
    req.log.error({ err }, "AI oral simulator error");
    res.status(503).json({ error: "Simulação oral indisponível" });
  }
});

// ─── GET /ai/word-of-day ─────────────────────────────────────────────────────

// In-memory cache for word of the day
let wordCache: { date: string; data: z.infer<typeof WordOfDaySchema> } | null = null;

router.get("/ai/word-of-day", async (req, res) => {
  const today = new Date().toISOString().split("T")[0]!;

  if (wordCache && wordCache.date === today) {
    res.json(wordCache.data);
    return;
  }

  const systemPrompt = `Você é um professor de português do Brasil especialista em preparação para o Celpe-Bras.
Selecione UMA palavra sofisticada em português que seja relevante para o Celpe-Bras (formal, acadêmica ou literária).

Responda APENAS com JSON:
{
  "word": "<palavra>",
  "part_of_speech": "<classe gramatical>",
  "register": "<formal|coloquial|literário|técnico>",
  "definition": "<definição clara em português simples, 1-2 frases>",
  "example": "<frase de exemplo autêntica usando a palavra em contexto>",
  "etymology": "<origem breve da palavra, 1 frase>",
  "synonyms": ["<sinônimo1>", "<sinônimo2>"]
}`;

  const FALLBACK_WORD: z.infer<typeof WordOfDaySchema> = {
    word: "cotidiano",
    part_of_speech: "adjetivo/substantivo",
    register: "formal",
    definition: "Relativo ao dia a dia; que acontece todos os dias.",
    example: "As questões cotidianas da vida urbana refletem as transformações sociais do século XXI.",
    etymology: "Do latim quotidianus, de quotidie ('cada dia').",
    synonyms: ["diário", "habitual"],
  };

  try {
    const seed = Math.floor(Math.random() * 1000);
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 384,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Seed: ${seed}. Gere uma palavra inédita para hoje.` },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = WordOfDaySchema.safeParse(JSON.parse(raw));
    const data = result.success ? result.data : FALLBACK_WORD;

    wordCache = { date: today, data };
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Word of day error");
    res.json(FALLBACK_WORD);
  }
});

// ─── POST /ai/chat ───────────────────────────────────────────────────────────
router.post("/ai/chat", async (req, res) => {
  const { systemPrompt, messages } = req.body as {
    systemPrompt: string;
    messages: { role: "user" | "assistant"; content: string }[];
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const sysMsg = systemPrompt ||
    "Você é um assistente de conversação em português brasileiro. Ajude o estudante a praticar PT-BR de forma natural e encorajadora.";

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: sysMsg },
        ...messages.slice(-12),
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "Desculpe, não consegui gerar uma resposta.";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "Chat error");
    res.status(500).json({ error: "Erro ao gerar resposta. Tente novamente." });
  }
});

// ─── POST /ai/vocab-generate ─────────────────────────────────────────────────
// In-memory per-device daily counter for rate limiting
const vocabGenCounters: Map<string, { date: string; count: number }> = new Map();

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getDeviceCount(deviceToken: string): number {
  const entry = vocabGenCounters.get(deviceToken);
  if (!entry || entry.date !== todayKey()) return 0;
  return entry.count;
}

function incrementDeviceCount(deviceToken: string): void {
  const today = todayKey();
  const entry = vocabGenCounters.get(deviceToken);
  if (!entry || entry.date !== today) {
    vocabGenCounters.set(deviceToken, { date: today, count: 1 });
  } else {
    entry.count += 1;
  }
}

router.post("/ai/vocab-generate", async (req, res) => {
  const { topic, count, deviceToken, isPremium } = req.body as {
    topic: string;
    count: number;
    deviceToken: string;
    isPremium?: boolean;
  };

  if (!topic || typeof topic !== "string" || !topic.trim()) {
    res.status(400).json({ error: "topic is required" });
    return;
  }

  if (!deviceToken || typeof deviceToken !== "string") {
    res.status(400).json({ error: "deviceToken is required" });
    return;
  }

  const clampedCount = Math.max(1, Math.min(Number(count) || 5, isPremium ? 15 : 5));

  // Fetch limits from DB
  let maxPerDay = isPremium ? 20 : 3;
  try {
    const { adminLimitsConfig } = await import("@workspace/db/schema");
    const { db: dbInner } = await import("@workspace/db");
    const { eq: eqInner } = await import("drizzle-orm");
    const [row] = await dbInner.select().from(adminLimitsConfig).where(eqInner(adminLimitsConfig.id, "singleton"));
    if (row) {
      maxPerDay = isPremium ? row.vocabGeneratorPremiumPerDay : row.vocabGeneratorFreePerDay;
    }
  } catch { }

  const usedToday = getDeviceCount(deviceToken);
  if (usedToday >= maxPerDay) {
    res.status(429).json({
      error: "Limite diário atingido",
      remaining: 0,
      usedToday,
      maxPerDay,
    });
    return;
  }

  const systemPrompt = `Você é um especialista em vocabulário do português brasileiro, focado em preparação para o exame Celpe-Bras.
Gere exatamente ${clampedCount} palavra(s) em português relacionadas ao tema fornecido pelo usuário.
Para cada palavra, forneça:
- "word": a palavra em português
- "definition": uma definição clara e concisa em português (máx. 2 frases)
- "example": uma frase de exemplo natural e contextualizada usando a palavra (1 frase)
- "partOfSpeech": classe gramatical (substantivo, verbo, adjetivo, advérbio, locução, etc.)
- "register": registro linguístico (formal, informal, neutro, técnico, coloquial)

Responda APENAS com um JSON válido no formato:
{
  "words": [
    { "word": "...", "definition": "...", "example": "...", "partOfSpeech": "...", "register": "..." }
  ]
}

Gere palavras variadas e úteis para o nível B2–C1, adequadas para a prova Celpe-Bras. Evite palavras muito simples ou raras demais.`;

  const userPrompt = `Tema: ${topic.trim()}
Quantidade: ${clampedCount} palavra(s)`;

  try {
    const aiCfg = await loadAiConfig();
    const completion = await openai.chat.completions.create({
      model: aiCfg.modelGeneration,
      max_completion_tokens: 800,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = VocabGenerateSchema.safeParse(JSON.parse(raw));

    if (!result.success || result.data.words.length === 0) {
      res.status(500).json({ error: "Erro ao gerar vocabulário. Tente novamente." });
      return;
    }

    incrementDeviceCount(deviceToken);
    const remaining = Math.max(0, maxPerDay - getDeviceCount(deviceToken));

    res.json({
      words: result.data.words.slice(0, clampedCount),
      remaining,
      usedToday: getDeviceCount(deviceToken),
      maxPerDay,
    });
  } catch (err) {
    req.log.error({ err }, "Vocab generate error");
    res.status(500).json({ error: "Erro ao gerar vocabulário. Tente novamente." });
  }
});

// ─── POST /ai/oral-feedback ──────────────────────────────────────────────────
//
// Evaluates an oral practice session. Accepts either:
//   - A text transcript (JSON body: { deviceToken, task_type, task_title,
//     instructions[], transcript })
//   - An audio file via multipart/form-data (field "audio") — transcribed with
//     Whisper before evaluation
//
// Returns rubric scores aligned to the Celpe-Bras oral assessment criteria:
//   rubric_adequacao  — adequacy to the communicative task
//   rubric_fluencia   — fluency and speech organisation
//   rubric_pronuncia  — pronunciation clarity (estimated from transcript)
//   rubric_interacao  — interactive competence / discourse management
//
router.post("/ai/oral-feedback", audioUpload.single("audio"), async (req, res) => {
  const deviceToken: string = req.body.deviceToken ?? "";
  const task_type: string = req.body.task_type ?? "oral";
  const task_title: string = req.body.task_title ?? "";
  const instructions: string[] = (() => {
    try {
      return Array.isArray(req.body.instructions)
        ? req.body.instructions
        : JSON.parse(req.body.instructions ?? "[]");
    } catch { return []; }
  })();
  let transcript: string = req.body.transcript ?? "";

  // ── Credit gate ───────────────────────────────────────────────────────────
  if (deviceToken) {
    const ok = await checkAndDeductCredits(deviceToken, res);
    if (!ok) return;
  }

  // ── Whisper transcription if audio file was uploaded ──────────────────────
  if (req.file) {
    try {
      const audioFile = new File([req.file.buffer], req.file.originalname || "audio.m4a", {
        type: req.file.mimetype,
      });
      const transcription = await openai.audio.transcriptions.create({
        model: "whisper-1",
        file: audioFile,
        language: "pt",
      });
      transcript = transcription.text;
    } catch (err) {
      req.log.error({ err }, "Whisper transcription error");
      res.status(503).json({ error: "Transcrição de áudio indisponível. Tente enviar um texto." });
      return;
    }
  }

  if (!transcript || typeof transcript !== "string" || !transcript.trim()) {
    res.status(400).json({ error: "transcript or audio file is required" });
    return;
  }

  const aiCfg = await loadAiConfig();

  const instructionsList = instructions.length > 0
    ? instructions.map((ins, i) => `${i + 1}. ${ins}`).join("\n")
    : "Não fornecidas.";

  const systemPrompt = `Você é um avaliador especialista do exame Celpe-Bras, responsável pela avaliação oral.
Avalie a resposta do candidato com base nos 4 critérios da parte oral do Celpe-Bras:
1. Adequação à tarefa comunicativa (rubric_adequacao, 0-5)
2. Fluência e organização do discurso (rubric_fluencia, 0-5)
3. Clareza de pronúncia e inteligibilidade (rubric_pronuncia, 0-5)
4. Competência interacional e gestão do discurso (rubric_interacao, 0-5)

Responda EXATAMENTE neste formato (duas linhas):
SCORES: {"rubric_adequacao":<0-5>,"rubric_fluencia":<0-5>,"rubric_pronuncia":<0-5>,"rubric_interacao":<0-5>}
COMMENTARY: <comentário detalhado em português de 3-5 frases sobre a performance oral>`;

  const userPrompt = `Tipo de tarefa: ${task_type}
Título da tarefa: ${task_title}
Instruções da tarefa:
${instructionsList}

TRANSCRIÇÃO DA RESPOSTA ORAL:
${transcript.trim()}`;

  try {
    const stream = await openai.chat.completions.create({
      model: aiCfg.modelFeedback,
      max_completion_tokens: aiCfg.maxTokensFeedback,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: true,
    });

    // Set up SSE
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    let buffer = "";
    let scoresEmitted = false;
    let commentaryStarted = false;

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? "";
      if (!token) continue;

      buffer += token;

      if (!scoresEmitted) {
        const newlineIdx = buffer.indexOf("\n");
        if (newlineIdx !== -1) {
          const scoresLine = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);

          const match = scoresLine.match(/SCORES:\s*(\{.+\})/);
          if (match) {
            try {
              const raw = JSON.parse(match[1]);
              const parsed = OralRubricSchema.safeParse(raw);
              const scores = parsed.success ? parsed.data : {
                rubric_adequacao: 0, rubric_fluencia: 0, rubric_pronuncia: 0, rubric_interacao: 0,
              };

              const rubricAdequacao = clamped(scores.rubric_adequacao);
              const rubricFluencia = clamped(scores.rubric_fluencia);
              const rubricPronuncia = clamped(scores.rubric_pronuncia);
              const rubricInteracao = clamped(scores.rubric_interacao);
              const overall = Number(((rubricAdequacao + rubricFluencia + rubricPronuncia + rubricInteracao) / 4).toFixed(1));

              let aiCreditsRemaining: number | undefined;
              if (deviceToken) {
                try {
                  const [p] = await db.select({ aiCredits: profiles.aiCredits }).from(profiles).where(eq(profiles.deviceToken, deviceToken));
                  aiCreditsRemaining = p?.aiCredits ?? undefined;
                } catch { }
              }

              sseEvent(res, "scores", {
                overall_score: overall,
                rubric_adequacao: rubricAdequacao,
                rubric_fluencia: rubricFluencia,
                rubric_pronuncia: rubricPronuncia,
                rubric_interacao: rubricInteracao,
                transcript,
                aiCreditsRemaining,
              });
              scoresEmitted = true;
            } catch { }
          }
        }
        continue;
      }

      if (!commentaryStarted) {
        const prefixIdx = buffer.indexOf("COMMENTARY: ");
        if (prefixIdx !== -1) {
          buffer = buffer.slice(prefixIdx + "COMMENTARY: ".length);
          commentaryStarted = true;
        } else if (buffer.includes("\n")) {
          buffer = buffer.replace(/^\n+/, "");
        }
        if (commentaryStarted && buffer) {
          sseEvent(res, "token", { content: buffer });
          buffer = "";
        }
        continue;
      }

      sseEvent(res, "token", { content: token });
      buffer = "";
    }

    if (buffer.trim()) sseEvent(res, "token", { content: buffer });

    if (!scoresEmitted) {
      sseEvent(res, "scores", {
        overall_score: 0, rubric_adequacao: 0, rubric_fluencia: 0, rubric_pronuncia: 0, rubric_interacao: 0, transcript,
      });
    }

    sseEvent(res, "done", {});
    res.end();
  } catch (err) {
    req.log.error({ err }, "AI oral feedback error");
    if (!res.headersSent) {
      res.status(503).json({ error: "Avaliação oral indisponível. Tente novamente." });
    } else {
      sseEvent(res, "error", { message: "Avaliação oral indisponível. Tente novamente." });
      sseEvent(res, "done", {});
      res.end();
    }
  }
});

export default router;
