import { Router } from "express";
import OpenAI from "openai";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
  apiKey: process.env["AI_INTEGRATIONS_OPENAI_API_KEY"],
});

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

export default router;
