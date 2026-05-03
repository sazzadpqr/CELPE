import { Router } from "express";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const router = Router();
const DATA_DIR = join(process.cwd(), "data");

type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type ListeningExercise = {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  audioSource: string;
  level: string;
  durationLabel: string;
  questions: Question[];
  transcript: string;
  active: boolean;
  createdAt: string;
};

const DEFAULT_EXERCISES: ListeningExercise[] = [
  {
    id: "lex1",
    title: "Entrevista sobre Meio Ambiente",
    description: "Ouça uma entrevista jornalística sobre políticas ambientais no Brasil e responda às questões de compreensão.",
    audioUrl: "https://radiomec.com.br",
    audioSource: "Rádio MEC",
    level: "B2",
    durationLabel: "~8 min",
    questions: [
      {
        id: "lex1q1",
        text: "Qual é o tema central abordado no áudio?",
        options: [
          "A biodiversidade da Amazônia",
          "A legislação ambiental brasileira",
          "O turismo ecológico no Pantanal",
          "A poluição dos rios urbanos",
        ],
        correctIndex: 1,
        explanation: "O áudio foca nas mudanças recentes na legislação ambiental e seus impactos para a preservação.",
      },
      {
        id: "lex1q2",
        text: "De acordo com o entrevistado, qual é o maior desafio?",
        options: [
          "O financiamento de projetos verdes",
          "A fiscalização do desmatamento ilegal",
          "A educação ambiental nas escolas",
          "O crescimento das cidades sem planejamento",
        ],
        correctIndex: 1,
        explanation: "A fiscalização é mencionada como o principal obstáculo para a efetividade da legislação.",
      },
      {
        id: "lex1q3",
        text: "Qual expressão melhor indica contraste no discurso formal?",
        options: [
          "Além disso",
          "Por exemplo",
          "Entretanto",
          "Em seguida",
        ],
        correctIndex: 2,
        explanation: "'Entretanto' é um marcador discursivo de contraste muito comum em textos formais e jornalísticos.",
      },
    ],
    transcript: "Locutor: Você está ouvindo o Rádio MEC. Hoje, nossa entrevistada é a Dra. Ana Lima, especialista em direito ambiental. Dra. Ana, o Brasil passou por mudanças significativas na legislação ambiental nos últimos anos. Como a senhora avalia esse cenário?\n\nDra. Ana: Obrigada pelo convite. De fato, tivemos avanços importantes. Entretanto, o grande desafio ainda é a fiscalização efetiva do desmatamento ilegal, especialmente nas áreas de fronteira agrícola.\n\nLocutor: E quais seriam as perspectivas para os próximos anos?\n\nDra. Ana: Acredito que a chave está na integração entre tecnologia de monitoramento e ação local. Sem essa sinergia, qualquer legislação fica incompleta.",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "lex2",
    title: "Debate sobre Educação Superior",
    description: "Ouça um trecho de debate sobre acesso ao ensino superior e cotas universitárias.",
    audioUrl: "https://cbn.globoradio.globo.com",
    audioSource: "CBN",
    level: "C1",
    durationLabel: "~10 min",
    questions: [
      {
        id: "lex2q1",
        text: "Qual é o ponto de discordância principal entre os debatedores?",
        options: [
          "A qualidade das universidades públicas",
          "A eficácia das cotas raciais e sociais",
          "O financiamento estudantil federal",
          "A evasão nos cursos de graduação",
        ],
        correctIndex: 1,
        explanation: "O debate gira em torno dos argumentos a favor e contra as políticas de cotas nas universidades.",
      },
      {
        id: "lex2q2",
        text: "Como os debatedores se referem à questão da meritocracia?",
        options: [
          "Como um argumento unânime a favor das cotas",
          "Como tema irrelevante para o debate",
          "Como argumento central dos críticos das cotas",
          "Como solução proposta pelos dois lados",
        ],
        correctIndex: 2,
        explanation: "Os críticos das cotas utilizam o argumento da meritocracia para questionar a justiça do sistema.",
      },
    ],
    transcript: "Mediador: Boa noite. Nosso debate de hoje aborda as políticas de cotas nas universidades federais brasileiras. Temos dois especialistas com visões distintas sobre o tema.\n\nDebatedora 1: As cotas são uma resposta necessária a séculos de exclusão histórica. Os dados mostram que houve aumento significativo na representatividade de grupos marginalizados.\n\nDebatedor 2: Entendo o argumento histórico. Entretanto, defendo que políticas de acesso universal à educação básica de qualidade seriam mais eficazes e menos divisivas do que um sistema de cotas.\n\nDebatedora 1: Mas por sua vez, enquanto aguardamos essa melhoria estrutural, gerações inteiras são prejudicadas. Precisamos de soluções para agora, não apenas para o futuro.",
    active: true,
    createdAt: new Date().toISOString(),
  },
];

function readData<T>(filename: string, def: T): T {
  const p = join(DATA_DIR, filename);
  try {
    if (!existsSync(p)) return def;
    return JSON.parse(readFileSync(p, "utf-8")) as T;
  } catch { return def; }
}

function writeData(filename: string, data: unknown) {
  writeFileSync(join(DATA_DIR, filename), JSON.stringify(data, null, 2), "utf-8");
}

function checkAuth(req: import("express").Request, res: import("express").Response): boolean {
  const auth = req.headers["authorization"];
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token !== process.env["ADMIN_TOKEN"]) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/content/listening-exercises", (_req, res) => {
  const exercises = readData<ListeningExercise[]>("listening-exercises.json", DEFAULT_EXERCISES);
  res.json(exercises.filter((e) => e.active));
});

router.get("/admin/listening-exercises", (req, res) => {
  if (!checkAuth(req, res)) return;
  const exercises = readData<ListeningExercise[]>("listening-exercises.json", DEFAULT_EXERCISES);
  res.json(exercises);
});

router.post("/admin/listening-exercises", (req, res) => {
  if (!checkAuth(req, res)) return;
  const exercises = readData<ListeningExercise[]>("listening-exercises.json", DEFAULT_EXERCISES);
  const { title, description, audioUrl, audioSource, level, durationLabel, questions, transcript, active } = req.body as Partial<ListeningExercise>;
  if (!title?.trim()) { res.status(400).json({ error: "title obrigatório" }); return; }
  const newEx: ListeningExercise = {
    id: randomUUID(),
    title: title.trim(),
    description: description?.trim() || "",
    audioUrl: audioUrl?.trim() || "",
    audioSource: audioSource?.trim() || "",
    level: level || "B1",
    durationLabel: durationLabel?.trim() || "",
    questions: (questions || []).map((q) => ({ ...q, id: q.id || randomUUID() })),
    transcript: transcript?.trim() || "",
    active: active !== false,
    createdAt: new Date().toISOString(),
  };
  exercises.push(newEx);
  writeData("listening-exercises.json", exercises);
  res.status(201).json(newEx);
});

router.put("/admin/listening-exercises/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const exercises = readData<ListeningExercise[]>("listening-exercises.json", DEFAULT_EXERCISES);
  const idx = exercises.findIndex((e) => e.id === req.params["id"]);
  if (idx < 0) { res.status(404).json({ error: "not found" }); return; }
  exercises[idx] = { ...exercises[idx]!, ...req.body as Partial<ListeningExercise>, id: exercises[idx]!.id, createdAt: exercises[idx]!.createdAt };
  writeData("listening-exercises.json", exercises);
  res.json(exercises[idx]);
});

router.delete("/admin/listening-exercises/:id", (req, res) => {
  if (!checkAuth(req, res)) return;
  const exercises = readData<ListeningExercise[]>("listening-exercises.json", DEFAULT_EXERCISES);
  writeData("listening-exercises.json", exercises.filter((e) => e.id !== req.params["id"]));
  res.json({ ok: true });
});

export default router;
