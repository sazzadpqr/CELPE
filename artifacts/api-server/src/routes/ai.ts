import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

// In-memory cache for word of the day
let wordCache: { date: string; data: unknown } | null = null;

// ─── POST /ai/feedback ──────────────────────────────────────────────────────
router.post("/ai/feedback", async (req, res) => {
  const { text, task_type, genre, time_expired } = req.body as {
    text: string;
    task_type: string;
    genre: string;
    time_expired?: boolean;
  };

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "text is required" });
    return;
  }

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const expiredNote = time_expired ? "\n\nNOTA: O texto foi submetido após o tempo esgotado." : "";

  const systemPrompt = `Você é um avaliador especialista do exame Celpe-Bras. 
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
  "commentary": "<comentário detalhado em português de 3-5 frases, destacando pontos fortes e áreas a melhorar>"
}

Seja justo, específico e educativo. Mencione exemplos do texto quando possível.`;

  const userPrompt = `Tipo de tarefa: ${task_type}
Gênero esperado: ${genre}
Número de palavras: ${wordCount}${expiredNote}

TEXTO DO CANDIDATO:
${text}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 1024,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      overall_score: number;
      rubric_tema: number;
      rubric_genero: number;
      rubric_coesao: number;
      rubric_gramatica: number;
      commentary: string;
    };

    const clamped = (n: number) => Math.min(5, Math.max(0, Number(n) || 0));
    const rubricTema = clamped(parsed.rubric_tema);
    const rubricGenero = clamped(parsed.rubric_genero);
    const rubricCoesao = clamped(parsed.rubric_coesao);
    const rubricGramatica = clamped(parsed.rubric_gramatica);
    const overall = Number(((rubricTema + rubricGenero + rubricCoesao + rubricGramatica) / 4).toFixed(1));

    res.json({
      overall_score: overall,
      rubric_tema: rubricTema,
      rubric_genero: rubricGenero,
      rubric_coesao: rubricCoesao,
      rubric_gramatica: rubricGramatica,
      commentary: parsed.commentary || "Avaliação concluída.",
    });
  } catch (err) {
    req.log.error({ err }, "AI feedback error");
    const fallback = Math.min(5, Math.max(1, Number((wordCount / 60).toFixed(1))));
    res.json({
      overall_score: fallback,
      rubric_tema: fallback,
      rubric_genero: fallback,
      rubric_coesao: fallback,
      rubric_gramatica: fallback,
      commentary: "Avaliação automática indisponível no momento. Pontuação estimada com base na extensão do texto. Tente novamente em instantes.",
    });
  }
});

// ─── POST /ai/prompt ─────────────────────────────────────────────────────────
router.post("/ai/prompt", async (req, res) => {
  const { task_type, genre } = req.body as { task_type: string; genre: string };

  if (!task_type) {
    res.status(400).json({ error: "task_type is required" });
    return;
  }

  const systemPrompt = `Você é um criador de questões para o exame Celpe-Bras.
Gere um novo prompt de prática realista e inédito para o tipo de tarefa especificado.

Responda APENAS com JSON no formato:
{
  "source": "<texto de apoio em 3-5 linhas: descreva um vídeo, áudio, texto ou dado visual realista e atual>",
  "prompt": "<instrução da tarefa em 2-3 linhas: o que o candidato deve escrever, incluindo gênero e extensão esperada>"
}

O tema deve ser relevante, contemporâneo e brasileiro. Evite temas repetidos.
Alguns temas sugeridos: sustentabilidade, saúde pública, tecnologia e sociedade, desigualdade, cultura, mercado de trabalho, educação, urbanização.`;

  const userPrompt = `Tipo de tarefa: ${task_type}\nGênero esperado: ${genre}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-mini",
      max_completion_tokens: 512,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { source: string; prompt: string };

    res.json({
      source: parsed.source || "",
      prompt: parsed.prompt || "",
    });
  } catch (err) {
    req.log.error({ err }, "AI prompt error");
    res.status(503).json({ error: "Prompt generation unavailable" });
  }
});

// ─── GET /ai/word-of-day ─────────────────────────────────────────────────────
router.get("/ai/word-of-day", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];

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
    const data = JSON.parse(raw);

    wordCache = { date: today, data };
    res.json(data);
  } catch (err) {
    req.log.error({ err }, "Word of day error");
    res.json({
      word: "cotidiano",
      part_of_speech: "adjetivo/substantivo",
      register: "formal",
      definition: "Relativo ao dia a dia; que acontece todos os dias.",
      example: "As questões cotidianas da vida urbana refletem as transformações sociais do século XXI.",
      etymology: "Do latim quotidianus, de quotidie ('cada dia').",
      synonyms: ["diário", "habitual"],
    });
  }
});

// ─── POST /ai/chat ───────────────────────────────────────────────────────────
// Conversational AI for the Conversation Practice screen
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

export default router;
