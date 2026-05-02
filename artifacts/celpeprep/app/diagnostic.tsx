import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Level = "A2" | "B1" | "B2" | "C1";

interface Question {
  id: string;
  level: Level;
  category: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  grammarRule?: string;
}

interface AiStudyRec {
  area: string;
  priority: string;
  tip: string;
}

interface AiAnalysis {
  level: string;
  confidence: string;
  personalizedAnalysis: string;
  studyRecommendations: AiStudyRec[];
  motivationalNote: string;
}

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

const FALLBACK_QUESTIONS: Question[] = [
  {
    id: "a2-v1", level: "A2", category: "verbos",
    question: "Como estudante dedicada, ela ___ sempre pontual.",
    options: ["está", "é", "estava", "seja"],
    correct: 1,
    explanation: "'Ser' exprime característica permanente; 'estar' é para estados temporários.",
    grammarRule: "Ser vs. Estar",
  },
  {
    id: "a2-v2", level: "A2", category: "verbos",
    question: "Quando eu era criança, ___ muito nas ruas.",
    options: ["brinquei", "brincava", "brinco", "brinque"],
    correct: 1,
    explanation: "O pretérito imperfeito ('brincava') indica ação habitual no passado.",
    grammarRule: "Pretérito Imperfeito",
  },
  {
    id: "a2-c1", level: "A2", category: "concordancia",
    question: "A carta que você escreveu está muito bem ___.",
    options: ["escrito", "escritas", "escrita", "escritos"],
    correct: 2,
    explanation: "O particípio concorda com 'carta' (feminino singular): 'bem escrita'.",
    grammarRule: "Concordância nominal",
  },
  {
    id: "a2-c2", level: "A2", category: "concordancia",
    question: "Os alunos ___ muito esforçados neste semestre.",
    options: ["tem sido", "têm sido", "tem sidos", "têm sidos"],
    correct: 1,
    explanation: "'Alunos' é plural → verbo no plural: 'têm sido'. 'Sidos' não existe.",
    grammarRule: "Concordância verbal",
  },
  {
    id: "b1-s1", level: "B1", category: "subjuntivo",
    question: "O professor pediu que os alunos ___ o texto com atenção.",
    options: ["leram", "lerem", "lerão", "leiam"],
    correct: 3,
    explanation: "Após 'pedir que' (verbo de volição), usa-se o subjuntivo presente: 'leiam'.",
    grammarRule: "Subjuntivo presente após verbos de volição",
  },
  {
    id: "b1-s2", level: "B1", category: "subjuntivo",
    question: "___ estivesse cansada, ela continuou estudando.",
    options: ["Porque", "Embora", "Portanto", "Assim"],
    correct: 1,
    explanation: "'Embora' é conjunção concessiva e exige subjuntivo imperfeito ('estivesse').",
    grammarRule: "Conjunções concessivas + subjuntivo",
  },
  {
    id: "b1-s3", level: "B1", category: "subjuntivo",
    question: "É importante que todos ___ as regras.",
    options: ["conhecem", "conhecerão", "conheçam", "conheceram"],
    correct: 2,
    explanation: "Após 'é importante que', usa-se o subjuntivo presente: 'conheçam'.",
    grammarRule: "Subjuntivo com expressões impessoais",
  },
  {
    id: "b1-p1", level: "B1", category: "pronomes",
    question: "A pesquisadora ___ você me falou ganhou um prêmio.",
    options: ["que", "a qual", "de quem", "quem"],
    correct: 2,
    explanation: "'Falar de alguém' → o pronome relativo correto é 'de quem'.",
    grammarRule: "Pronomes relativos com preposição",
  },
  {
    id: "b1-p2", level: "B1", category: "pronomes",
    question: "O relatório ___ pela equipe até sexta-feira.",
    options: ["será entregado", "será entregue", "entregará", "vai entregar"],
    correct: 1,
    explanation: "'Entregar' tem particípio irregular: 'entregue'. Voz passiva: 'será entregue'.",
    grammarRule: "Particípios irregulares – voz passiva",
  },
  {
    id: "b2-sf1", level: "B2", category: "subjuntivo",
    question: "Quando você ___ os dados, me avise imediatamente.",
    options: ["analisará", "analisa", "analisar", "analisasse"],
    correct: 2,
    explanation: "Após 'quando' com referência ao futuro, usa-se o futuro do subjuntivo.",
    grammarRule: "Futuro do subjuntivo",
  },
  {
    id: "b2-k1", level: "B2", category: "conectivos",
    question: "Estudamos bastante ___ passar no exame.",
    options: ["pois", "assim", "a fim de", "visto que"],
    correct: 2,
    explanation: "'A fim de' + infinitivo exprime finalidade. 'Pois' e 'visto que' são causais.",
    grammarRule: "Locuções finais",
  },
  {
    id: "b2-k2", level: "B2", category: "conectivos",
    question: "Ela disse que ___ à festa naquela noite.",
    options: ["iria", "vai", "foi", "irá"],
    correct: 0,
    explanation: "No discurso indireto, o futuro do indicativo vira futuro do pretérito ('iria').",
    grammarRule: "Discurso indireto – correlação temporal",
  },
  {
    id: "b2-prep1", level: "B2", category: "preposicoes",
    question: "Os especialistas discordaram ___ decisão tomada.",
    options: ["de a", "da", "em", "à"],
    correct: 1,
    explanation: "'Discordar de' + artigo 'a' = crase obrigatória: 'da' (contração de + a).",
    grammarRule: "Regência verbal + crase",
  },
  {
    id: "b2-prep2", level: "B2", category: "preposicoes",
    question: "As análises apresentadas foram ___ relevantes para o caso.",
    options: ["muito", "muitas", "muitos", "muitíssimas"],
    correct: 0,
    explanation: "'Muito' como advérbio (modifica adjetivo) é invariável.",
    grammarRule: "Advérbio invariável vs. pronome indefinido",
  },
  {
    id: "c1-s1", level: "C1", category: "subjuntivo",
    question: "Era necessário que todos ___ mais conscientes sobre o impacto.",
    options: ["são", "fossem", "sejam", "tenham sido"],
    correct: 1,
    explanation: "Verbo principal no passado → subjuntivo da subordinada no imperfeito: 'fossem'.",
    grammarRule: "Correlação de tempos – subjuntivo imperfeito",
  },
  {
    id: "c1-k1", level: "C1", category: "conectivos",
    question: "O programa mostrou-se eficiente; ___, gerou novos desafios.",
    options: ["por isso", "contudo", "assim sendo", "além disso"],
    correct: 1,
    explanation: "'Contudo' expressa contraste/adversidade — conectivo adversativo.",
    grammarRule: "Conectivos adversativos",
  },
  {
    id: "c1-k2", level: "C1", category: "conectivos",
    question: "Trata-se de uma das análises mais ___ já conduzidas nessa área.",
    options: ["abrangente", "abrangentes", "abrangendo", "abrangido"],
    correct: 1,
    explanation: "Concordância com 'análises' (plural feminino): 'abrangentes'.",
    grammarRule: "Superlativo relativo – concordância",
  },
  {
    id: "c1-prep1", level: "C1", category: "preposicoes",
    question: "O relatório foi elaborado ___ intuito de esclarecer as dúvidas.",
    options: ["com", "no", "ao", "pelo"],
    correct: 1,
    explanation: "'No intuito de' é locução prepositiva de finalidade.",
    grammarRule: "Locuções prepositivas de finalidade",
  },
  {
    id: "c1-c1", level: "C1", category: "concordancia",
    question: "Fazem dois anos que não vejo minha família.",
    options: ["A frase está correta", "Deveria ser 'Faz dois anos'", "Deveria ser 'Fazem dois anos passados'", "Deveria ser 'Faz dois ano'"],
    correct: 1,
    explanation: "Verbos que indicam tempo decorrido (fazer, haver) são impessoais e ficam no singular: 'Faz dois anos'.",
    grammarRule: "Verbos impessoais – fazer/haver com sentido de tempo",
  },
  {
    id: "c1-v1", level: "C1", category: "verbos",
    question: "Se eu ___ mais tempo, teria estudado o dobro.",
    options: ["tivesse", "teria", "tenho", "terei"],
    correct: 0,
    explanation: "Período hipotético do passado: 'se + imperfeito do subjuntivo + futuro do pretérito'.",
    grammarRule: "Período condicional hipotético (passado)",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  verbos: "Verbos",
  concordancia: "Concordância",
  subjuntivo: "Subjuntivo",
  pronomes: "Pronomes",
  conectivos: "Conectivos",
  preposicoes: "Preposições",
};

const CATEGORY_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  verbos: "clock",
  concordancia: "check-square",
  subjuntivo: "git-branch",
  pronomes: "user",
  conectivos: "link",
  preposicoes: "arrow-right",
};

const GEN_MESSAGES = [
  "Analisando categorias gramaticais...",
  "Criando questões do cotidiano real...",
  "Adaptando aos padrões do Celpe-Bras...",
  "Selecionando contextos autênticos...",
  "Calibrando a dificuldade por nível...",
  "Preparando seu diagnóstico único...",
];

function calculateLevel(answers: (number | null)[], questions: Question[]): Level {
  const byLevel: Record<Level, { correct: number; total: number }> = {
    A2: { correct: 0, total: 0 }, B1: { correct: 0, total: 0 },
    B2: { correct: 0, total: 0 }, C1: { correct: 0, total: 0 },
  };
  questions.forEach((q, i) => {
    byLevel[q.level].total++;
    if (answers[i] === q.correct) byLevel[q.level].correct++;
  });
  const pct = (l: Level) => byLevel[l].total > 0 ? byLevel[l].correct / byLevel[l].total : 0;
  if (pct("C1") >= 0.67) return "C1";
  if (pct("B2") >= 0.6) return "B2";
  if (pct("B1") >= 0.5) return "B1";
  return "A2";
}

function calcCategoryBreakdown(answers: (number | null)[], questions: Question[]) {
  const cat: Record<string, { correct: number; total: number }> = {};
  questions.forEach((q, i) => {
    if (!cat[q.category]) cat[q.category] = { correct: 0, total: 0 };
    cat[q.category]!.total++;
    if (answers[i] === q.correct) cat[q.category]!.correct++;
  });
  return cat;
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const LEVEL_DESC: Record<Level, { short: string; tip: string }> = {
  A2: {
    short: "Básico",
    tip: "Foque em estruturas fundamentais: conjugações regulares, concordância básica e vocabulário cotidiano.",
  },
  B1: {
    short: "Intermediário",
    tip: "Trabalhe o subjuntivo, pronomes relativos e coesão textual. Leia textos acadêmicos curtos.",
  },
  B2: {
    short: "Intermediário Avançado",
    tip: "Refine o registro formal, argumentação e períodos complexos. Pratique redações dissertativas.",
  },
  C1: {
    short: "Avançado",
    tip: "Foque em precisão gramatical, sofisticação lexical e adequação ao gênero discursivo do Celpe-Bras.",
  },
};

const LEVEL_COLOR: Record<Level, string> = {
  A2: "#BA7517", B1: "#185FA5", B2: "#6B21A8", C1: "#1D9E75",
};

export default function DiagnosticScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { updateProfile, profile } = useApp();

  const [step, setStep] = useState<"intro" | "generating" | "quiz" | "result">("intro");
  const [questions, setQuestions] = useState<Question[]>(FALLBACK_QUESTIONS);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(new Array(FALLBACK_QUESTIONS.length).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [resultLevel, setResultLevel] = useState<Level>("B1");
  const [elapsed, setElapsed] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [expandedQ, setExpandedQ] = useState<number | null>(null);
  const [genMsgIdx, setGenMsgIdx] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<AiAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const genMsgRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    if (step === "quiz") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [step]);

  useEffect(() => {
    if (step === "generating") {
      setGenMsgIdx(0);
      genMsgRef.current = setInterval(() => setGenMsgIdx(i => (i + 1) % GEN_MESSAGES.length), 1800);
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 0.7, duration: 900, useNativeDriver: true }),
        ])
      ).start();
    }
    return () => { if (genMsgRef.current) clearInterval(genMsgRef.current); };
  }, [step]);

  const q = questions[currentIdx] ?? FALLBACK_QUESTIONS[0]!;
  const progress = questions.length > 0 ? (currentIdx / questions.length) * 100 : 0;

  const animateTransition = (cb: () => void) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      cb();
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const handleSelect = (optIdx: number) => {
    if (selected !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(optIdx);
  };

  const handleStart = async () => {
    setStep("generating");
    setElapsed(0);
    setAiAnalysis(null);
    try {
      const res = await fetch(getApiUrl("/api/diagnostic/generate-session"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceToken: profile.deviceToken ?? "anonymous" }),
      });
      if (res.ok) {
        const data = await res.json() as { questions?: Question[] };
        if (Array.isArray(data.questions) && data.questions.length >= 12) {
          const loaded = data.questions as Question[];
          setQuestions(loaded);
          setAnswers(new Array(loaded.length).fill(null));
          setCurrentIdx(0);
          setSelected(null);
          setStep("quiz");
          return;
        }
      }
    } catch {
      // fall through to fallback
    }
    setQuestions(FALLBACK_QUESTIONS);
    setAnswers(new Array(FALLBACK_QUESTIONS.length).fill(null));
    setCurrentIdx(0);
    setSelected(null);
    setStep("quiz");
  };

  const handleAnalyze = async (qs: Question[], ans: (number | null)[], time: number) => {
    setAnalyzing(true);
    try {
      const res = await fetch(getApiUrl("/api/diagnostic/analyze"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: qs, answers: ans, elapsed: time }),
      });
      if (res.ok) {
        const data = await res.json() as AiAnalysis;
        setAiAnalysis(data);
      }
    } catch {
      // analysis unavailable
    }
    setAnalyzing(false);
  };

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = selected;
    setAnswers(newAnswers);

    if (currentIdx + 1 < questions.length) {
      animateTransition(() => {
        setCurrentIdx(currentIdx + 1);
        setSelected(null);
      });
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      const level = calculateLevel(newAnswers, questions);
      setResultLevel(level);
      setStep("result");
      updateProfile({ diagnosticDone: true, level });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      handleAnalyze(questions, newAnswers, elapsed);

      const breakdown = calcCategoryBreakdown(newAnswers, questions);
      const correctCount = newAnswers.filter((a, i) => a === questions[i]!.correct).length;
      fetch(getApiUrl("/api/diagnostic/result"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceToken: profile.deviceToken ?? "anonymous",
          level,
          score: correctCount,
          totalQuestions: questions.length,
          timeTakenSeconds: elapsed,
          answers: newAnswers.map((a, i) => ({
            questionId: questions[i]!.id,
            chosen: a ?? -1,
            correct: a === questions[i]!.correct,
          })),
          categoryBreakdown: breakdown,
          sessionQuestions: questions.map(({ id, level: l, category, question, options, correct }) => ({ id, level: l, category, question, options, correct })),
        }),
      }).catch(() => {});
    }
  };

  const handleRetake = () => {
    setStep("intro");
    setCurrentIdx(0);
    setQuestions(FALLBACK_QUESTIONS);
    setAnswers(new Array(FALLBACK_QUESTIONS.length).fill(null));
    setSelected(null);
    setElapsed(0);
    setShowReview(false);
    setAiAnalysis(null);
    setAnalyzing(false);
  };

  // ── Generating ─────────────────────────────────────────────────────────────
  if (step === "generating") {
    const categories = ["verbos", "concordancia", "subjuntivo", "pronomes", "conectivos", "preposicoes"];
    return (
      <View style={[S.root, { backgroundColor: colors.background, alignItems: "center", justifyContent: "center", padding: 32 }]}>
        <View style={[S.genCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Animated.View style={{ opacity: pulseAnim }}>
            <View style={[S.genIconWrap, { backgroundColor: colors.primary + "18" }]}>
              <Feather name="cpu" size={38} color={colors.primary} />
            </View>
          </Animated.View>
          <Text style={[S.genTitle, { color: colors.text }]}>Preparando seu diagnóstico</Text>
          <Text style={[S.genMsg, { color: colors.primary }]}>{GEN_MESSAGES[genMsgIdx]}</Text>
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 4 }} />
          <View style={S.genCats}>
            {categories.map(cat => (
              <View key={cat} style={[S.genCatChip, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "25" }]}>
                <Feather name={CATEGORY_ICONS[cat] ?? "book"} size={11} color={colors.primary} />
                <Text style={[S.genCatText, { color: colors.primary }]}>{CATEGORY_LABELS[cat]}</Text>
              </View>
            ))}
          </View>
          <Text style={[S.genNote, { color: colors.mutedForeground }]}>
            A IA está a criar questões únicas para você,{"\n"}com situações reais do cotidiano brasileiro.
          </Text>
        </View>
      </View>
    );
  }

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (step === "intro") {
    const categories = [...new Set(FALLBACK_QUESTIONS.map(q => q.category))];
    return (
      <ScrollView style={[S.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[S.content, { paddingTop: topPad + 16 }]}>
        <Pressable onPress={() => router.back()} style={S.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={[S.introIcon, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="activity" size={36} color={colors.primary} />
        </View>
        <Text style={[S.introTitle, { color: colors.text }]}>Teste Diagnóstico</Text>
        <Text style={[S.introDesc, { color: colors.mutedForeground }]}>
          A IA vai gerar um conjunto único de questões do cotidiano real para identificar seu nível e personalizar seu plano de estudo.
        </Text>

        <View style={[S.aiHighlight, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
          <Feather name="cpu" size={16} color={colors.primary} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[S.aiHighlightTitle, { color: colors.primary }]}>Diagnóstico gerado por IA</Text>
            <Text style={[S.aiHighlightSub, { color: colors.mutedForeground }]}>
              Questões únicas com situações reais · Análise personalizada dos seus resultados
            </Text>
          </View>
        </View>

        <View style={[S.infoGrid, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {[
            { icon: "clock" as const, label: "Duração estimada", value: "~20 minutos" },
            { icon: "bar-chart-2" as const, label: "Questões", value: "20 de gramática" },
            { icon: "layers" as const, label: "Níveis avaliados", value: "A2 · B1 · B2 · C1" },
            { icon: "zap" as const, label: "Resultado", value: "Análise com IA" },
          ].map(item => (
            <View key={item.label} style={[S.infoCell, { borderColor: colors.border }]}>
              <Feather name={item.icon} size={18} color={colors.primary} />
              <Text style={[S.infoCellLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              <Text style={[S.infoCellValue, { color: colors.text }]}>{item.value}</Text>
            </View>
          ))}
        </View>

        <Text style={[S.sectionLabel, { color: colors.text }]}>Categorias avaliadas</Text>
        <View style={S.catChips}>
          {categories.map(cat => (
            <View key={cat} style={[S.catChip, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
              <Feather name={CATEGORY_ICONS[cat] ?? "book"} size={12} color={colors.primary} />
              <Text style={[S.catChipText, { color: colors.primary }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>
            </View>
          ))}
        </View>

        <View style={[S.levelLegend, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[S.legendTitle, { color: colors.text }]}>Escala de referência</Text>
          {(["A2", "B1", "B2", "C1"] as Level[]).map(lvl => (
            <View key={lvl} style={S.legendRow}>
              <View style={[S.legendDot, { backgroundColor: LEVEL_COLOR[lvl] }]} />
              <Text style={[S.legendLevel, { color: LEVEL_COLOR[lvl] }]}>{lvl}</Text>
              <Text style={[S.legendDesc, { color: colors.mutedForeground }]}>{LEVEL_DESC[lvl].short}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[S.ctaBtn, { backgroundColor: colors.primary }]} onPress={handleStart}>
          <Feather name="cpu" size={18} color="#fff" />
          <Text style={S.ctaBtnText}>Gerar meu diagnóstico</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      </ScrollView>
    );
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (step === "result") {
    const correct = answers.filter((a, i) => a === questions[i]!.correct).length;
    const pct = Math.round((correct / questions.length) * 100);
    const levelColor = LEVEL_COLOR[resultLevel];
    const breakdown = calcCategoryBreakdown(answers, questions);
    const sortedCats = Object.entries(breakdown).sort((a, b) => {
      const pa = a[1].total > 0 ? a[1].correct / a[1].total : 0;
      const pb = b[1].total > 0 ? b[1].correct / b[1].total : 0;
      return pb - pa;
    });
    const strengths = sortedCats.filter(([, v]) => v.total > 0 && v.correct / v.total >= 0.67);
    const weaknesses = sortedCats.filter(([, v]) => v.total > 0 && v.correct / v.total < 0.5);

    return (
      <ScrollView style={[S.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[S.content, { paddingTop: topPad + 16, paddingBottom: 60 }]}>

        <View style={[S.resultBadge, { backgroundColor: levelColor + "15", borderColor: levelColor + "40" }]}>
          <Text style={[S.resultBadgeLabel, { color: levelColor }]}>SEU NÍVEL</Text>
          <Text style={[S.resultBadgeLevel, { color: levelColor }]}>{resultLevel}</Text>
          <Text style={[S.resultBadgeSub, { color: levelColor + "CC" }]}>{LEVEL_DESC[resultLevel].short}</Text>
        </View>

        <View style={[S.scoreRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={S.scoreCell}>
            <Text style={[S.scoreVal, { color: colors.text }]}>{correct}/{questions.length}</Text>
            <Text style={[S.scoreLabel, { color: colors.mutedForeground }]}>Acertos</Text>
          </View>
          <View style={[S.scoreDivider, { backgroundColor: colors.border }]} />
          <View style={S.scoreCell}>
            <Text style={[S.scoreVal, { color: colors.text }]}>{pct}%</Text>
            <Text style={[S.scoreLabel, { color: colors.mutedForeground }]}>Aproveitamento</Text>
          </View>
          <View style={[S.scoreDivider, { backgroundColor: colors.border }]} />
          <View style={S.scoreCell}>
            <Text style={[S.scoreVal, { color: colors.text }]}>{formatTime(elapsed)}</Text>
            <Text style={[S.scoreLabel, { color: colors.mutedForeground }]}>Tempo</Text>
          </View>
        </View>

        {/* AI Analysis Card */}
        {(analyzing || aiAnalysis) ? (
          <View style={[S.aiCard, { backgroundColor: colors.card, borderColor: colors.primary + "40" }]}>
            <View style={S.aiCardHeader}>
              <View style={[S.aiCardIconWrap, { backgroundColor: colors.primary + "18" }]}>
                <Feather name="cpu" size={16} color={colors.primary} />
              </View>
              <Text style={[S.aiCardTitle, { color: colors.text }]}>Análise da IA</Text>
              {analyzing && <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: "auto" }} />}
              {!analyzing && aiAnalysis && (
                <View style={[S.aiConfBadge, { backgroundColor: colors.primary + "15" }]}>
                  <Text style={[S.aiConfText, { color: colors.primary }]}>Confiança {aiAnalysis.confidence}</Text>
                </View>
              )}
            </View>

            {analyzing ? (
              <View style={{ gap: 10, paddingTop: 4 }}>
                <View style={[S.aiSkeleton, { backgroundColor: colors.border, width: "100%" }]} />
                <View style={[S.aiSkeleton, { backgroundColor: colors.border, width: "85%" }]} />
                <View style={[S.aiSkeleton, { backgroundColor: colors.border, width: "92%" }]} />
                <Text style={[S.aiLoadingText, { color: colors.mutedForeground }]}>Analisando seu desempenho...</Text>
              </View>
            ) : aiAnalysis ? (
              <View style={{ gap: 14 }}>
                <Text style={[S.aiAnalysisText, { color: colors.text }]}>{aiAnalysis.personalizedAnalysis}</Text>

                {aiAnalysis.studyRecommendations?.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={[S.aiRecTitle, { color: colors.text }]}>Recomendações de estudo</Text>
                    {aiAnalysis.studyRecommendations.map((rec, i) => (
                      <View key={i} style={[S.aiRecRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <View style={[S.aiRecPriority, {
                          backgroundColor: rec.priority === "alta" ? "#D85A3020" : "#185FA520",
                        }]}>
                          <Text style={[S.aiRecPriorityText, {
                            color: rec.priority === "alta" ? "#D85A30" : "#185FA5",
                          }]}>{rec.priority === "alta" ? "Alta" : "Média"}</Text>
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={[S.aiRecArea, { color: colors.text }]}>{rec.area}</Text>
                          <Text style={[S.aiRecTip, { color: colors.mutedForeground }]}>{rec.tip}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {aiAnalysis.motivationalNote && (
                  <View style={[S.aiMotivRow, { backgroundColor: "#1D9E7510", borderColor: "#1D9E7530" }]}>
                    <Feather name="award" size={14} color="#1D9E75" />
                    <Text style={[S.aiMotivText, { color: colors.text }]}>{aiAnalysis.motivationalNote}</Text>
                  </View>
                )}
              </View>
            ) : null}
          </View>
        ) : (
          <View style={[S.tipBox, { backgroundColor: levelColor + "12", borderColor: levelColor + "30" }]}>
            <Feather name="zap" size={16} color={levelColor} />
            <Text style={[S.tipText, { color: colors.text }]}>{LEVEL_DESC[resultLevel].tip}</Text>
          </View>
        )}

        <Text style={[S.sectionTitle, { color: colors.text }]}>Desempenho por nível</Text>
        {(["A2", "B1", "B2", "C1"] as Level[]).map(lvl => {
          const qs = questions.filter(q => q.level === lvl);
          const c = qs.filter(q => answers[questions.indexOf(q)] === q.correct).length;
          const p = qs.length > 0 ? (c / qs.length) * 100 : 0;
          return (
            <View key={lvl} style={S.levelRow}>
              <View style={[S.levelBadgeSmall, { backgroundColor: LEVEL_COLOR[lvl] + "20" }]}>
                <Text style={[S.levelBadgeSmallText, { color: LEVEL_COLOR[lvl] }]}>{lvl}</Text>
              </View>
              <View style={[S.levelTrack, { backgroundColor: colors.border }]}>
                <View style={[S.levelFill, { width: `${p}%` as any, backgroundColor: LEVEL_COLOR[lvl] }]} />
              </View>
              <Text style={[S.levelCount, { color: colors.mutedForeground }]}>{c}/{qs.length}</Text>
            </View>
          );
        })}

        <Text style={[S.sectionTitle, { color: colors.text }]}>Desempenho por categoria</Text>
        {sortedCats.map(([cat, v]) => {
          const p = v.total > 0 ? (v.correct / v.total) * 100 : 0;
          const catColor = p >= 67 ? "#1D9E75" : p >= 50 ? "#185FA5" : "#D85A30";
          return (
            <View key={cat} style={[S.catRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[S.catRowIcon, { backgroundColor: catColor + "20" }]}>
                <Feather name={CATEGORY_ICONS[cat] ?? "book"} size={14} color={catColor} />
              </View>
              <View style={S.catRowBody}>
                <View style={S.catRowTop}>
                  <Text style={[S.catRowName, { color: colors.text }]}>{CATEGORY_LABELS[cat] ?? cat}</Text>
                  <Text style={[S.catRowPct, { color: catColor }]}>{Math.round(p)}%</Text>
                </View>
                <View style={[S.catTrack, { backgroundColor: colors.border }]}>
                  <View style={[S.catFill, { width: `${p}%` as any, backgroundColor: catColor }]} />
                </View>
                <Text style={[S.catRowSub, { color: colors.mutedForeground }]}>{v.correct} de {v.total} corretas</Text>
              </View>
            </View>
          );
        })}

        {(strengths.length > 0 || weaknesses.length > 0) && (
          <View style={[S.swBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {strengths.length > 0 && (
              <View style={S.swSection}>
                <View style={S.swHeader}>
                  <Feather name="award" size={14} color="#1D9E75" />
                  <Text style={[S.swTitle, { color: "#1D9E75" }]}>Pontos fortes</Text>
                </View>
                {strengths.map(([cat]) => (
                  <Text key={cat} style={[S.swItem, { color: colors.mutedForeground }]}>
                    · {CATEGORY_LABELS[cat] ?? cat}
                  </Text>
                ))}
              </View>
            )}
            {weaknesses.length > 0 && (
              <View style={[S.swSection, strengths.length > 0 && { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 12, paddingTop: 12 }]}>
                <View style={S.swHeader}>
                  <Feather name="alert-circle" size={14} color="#D85A30" />
                  <Text style={[S.swTitle, { color: "#D85A30" }]}>Áreas a reforçar</Text>
                </View>
                {weaknesses.map(([cat]) => (
                  <Text key={cat} style={[S.swItem, { color: colors.mutedForeground }]}>
                    · {CATEGORY_LABELS[cat] ?? cat}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        <Pressable style={[S.reviewToggle, { borderColor: colors.border, backgroundColor: colors.card }]}
          onPress={() => setShowReview(r => !r)}>
          <Feather name={showReview ? "chevron-up" : "chevron-down"} size={16} color={colors.mutedForeground} />
          <Text style={[S.reviewToggleText, { color: colors.text }]}>
            {showReview ? "Esconder" : "Ver"} gabarito completo
          </Text>
        </Pressable>

        {showReview && (
          <View style={{ gap: 8 }}>
            {questions.map((question, i) => {
              const userAnswer = answers[i];
              const isCorrect = userAnswer === question.correct;
              return (
                <Pressable key={question.id}
                  style={[S.reviewCard, { backgroundColor: colors.card, borderColor: isCorrect ? "#1D9E7540" : "#D85A3040" }]}
                  onPress={() => setExpandedQ(expandedQ === i ? null : i)}>
                  <View style={S.reviewCardHeader}>
                    <View style={[S.reviewIcon, { backgroundColor: isCorrect ? "#1D9E7520" : "#D85A3020" }]}>
                      <Feather name={isCorrect ? "check" : "x"} size={13} color={isCorrect ? "#1D9E75" : "#D85A30"} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", gap: 6, marginBottom: 2 }}>
                        <Text style={[S.reviewQLevel, { color: LEVEL_COLOR[question.level] }]}>{question.level}</Text>
                        <Text style={[S.reviewQCat, { color: colors.mutedForeground }]}>{CATEGORY_LABELS[question.category] ?? question.category}</Text>
                      </View>
                      <Text style={[S.reviewQText, { color: colors.text }]} numberOfLines={expandedQ === i ? undefined : 2}>
                        {question.question}
                      </Text>
                    </View>
                    <Feather name={expandedQ === i ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
                  </View>
                  {expandedQ === i && (
                    <View style={[S.reviewExpanded, { borderTopColor: colors.border }]}>
                      {question.options.map((opt, oi) => {
                        const isOpt = userAnswer === oi;
                        const isCorr = question.correct === oi;
                        const c = isCorr ? "#1D9E75" : isOpt ? "#D85A30" : colors.mutedForeground;
                        return (
                          <View key={oi} style={S.reviewOpt}>
                            <Feather name={isCorr ? "check-circle" : isOpt ? "x-circle" : "circle"} size={13} color={c} />
                            <Text style={[S.reviewOptText, { color: c }]}>{["A", "B", "C", "D"][oi]}. {opt}</Text>
                          </View>
                        );
                      })}
                      <View style={[S.reviewExplanation, { backgroundColor: colors.primary + "10", borderColor: colors.primary + "30" }]}>
                        <Feather name="info" size={12} color={colors.primary} />
                        <Text style={[S.reviewExplanationText, { color: colors.text }]}>{question.explanation}</Text>
                      </View>
                      {question.grammarRule && (
                        <Text style={[S.reviewRule, { color: colors.mutedForeground }]}>Regra: {question.grammarRule}</Text>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable style={[S.ctaBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => router.replace("/(tabs)")}>
          <Text style={S.ctaBtnText}>Ver meu plano de estudo</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
        <Pressable style={[S.retakeBtn, { borderColor: colors.border }]} onPress={handleRetake}>
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
          <Text style={[S.retakeBtnText, { color: colors.mutedForeground }]}>Refazer diagnóstico</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────────────
  return (
    <View style={[S.root, { backgroundColor: colors.background }]}>
      <View style={[S.quizHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => {
          if (currentIdx > 0) { animateTransition(() => { setCurrentIdx(currentIdx - 1); setSelected(answers[currentIdx - 1] ?? null); }); }
          else { setStep("intro"); }
        }}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={S.quizProgressWrap}>
          <View style={[S.quizTrack, { backgroundColor: colors.border }]}>
            <View style={[S.quizFill, { width: `${progress}%` as any, backgroundColor: colors.primary }]} />
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={[S.quizProgressText, { color: colors.mutedForeground }]}>
              {currentIdx + 1} / {questions.length}
            </Text>
            <Text style={[S.quizProgressText, { color: colors.mutedForeground }]}>
              {formatTime(elapsed)}
            </Text>
          </View>
        </View>
        <View style={[S.levelBadge, { backgroundColor: LEVEL_COLOR[q.level] + "18" }]}>
          <Text style={[S.levelBadgeText, { color: LEVEL_COLOR[q.level] }]}>{q.level}</Text>
        </View>
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView style={S.quizBody} contentContainerStyle={S.quizContent}
          showsVerticalScrollIndicator={false}>

          <View style={[S.catTag, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name={CATEGORY_ICONS[q.category] ?? "book"} size={11} color={colors.mutedForeground} />
            <Text style={[S.catTagText, { color: colors.mutedForeground }]}>{CATEGORY_LABELS[q.category] ?? q.category}</Text>
          </View>

          <Text style={[S.questionText, { color: colors.text }]}>{q.question}</Text>

          <View style={S.optionsList}>
            {q.options.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === q.correct;
              const isWrong = isSelected && !isCorrect;
              const showResult = selected !== null;
              let bg = colors.card, border = colors.border, textColor = colors.text;
              if (showResult && isCorrect) { bg = "#D1FAE5"; border = "#34D399"; textColor = "#065F46"; }
              else if (showResult && isWrong) { bg = "#FEE2E2"; border = "#F87171"; textColor = "#991B1B"; }
              else if (isSelected) { bg = colors.primary + "15"; border = colors.primary; textColor = colors.primary; }
              return (
                <Pressable key={i} style={[S.option, { backgroundColor: bg, borderColor: border }]}
                  onPress={() => handleSelect(i)} disabled={selected !== null}>
                  <View style={[S.optionLetter, { backgroundColor: border + "30" }]}>
                    <Text style={[S.optionLetterText, { color: textColor }]}>{["A", "B", "C", "D"][i]}</Text>
                  </View>
                  <Text style={[S.optionText, { color: textColor }]}>{opt}</Text>
                  {showResult && isCorrect && <Feather name="check-circle" size={18} color="#059669" />}
                  {showResult && isWrong && <Feather name="x-circle" size={18} color="#DC2626" />}
                </Pressable>
              );
            })}
          </View>

          {selected !== null && (
            <View style={[S.explanationBox, { backgroundColor: colors.primary + "0E", borderColor: colors.primary + "30" }]}>
              <Feather name="info" size={14} color={colors.primary} style={{ marginTop: 1 }} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[S.explanationText, { color: colors.text }]}>{q.explanation}</Text>
                {q.grammarRule && (
                  <Text style={[S.grammarRuleText, { color: colors.mutedForeground }]}>Regra: {q.grammarRule}</Text>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {selected !== null && (
        <View style={[S.nextBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 3 }}>
            {questions.map((_, i) => {
              const a = i === currentIdx ? selected : answers[i];
              const done = a !== null;
              const corr = done && a === questions[i]!.correct;
              return (
                <View key={i} style={[S.dot,
                  { backgroundColor: done ? (corr ? "#1D9E75" : "#D85A30") : colors.border,
                    width: i === currentIdx ? 10 : 6,
                    height: i === currentIdx ? 10 : 6,
                    borderRadius: 5,
                  }]} />
              );
            })}
          </View>
          <Pressable style={[S.nextBtn, { backgroundColor: colors.primary }]} onPress={handleNext}>
            <Text style={S.nextBtnText}>
              {currentIdx + 1 < questions.length ? "Próxima questão" : "Ver resultado"}
            </Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16, paddingBottom: 40 },
  backBtn: { padding: 4, marginBottom: 4 },
  introIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  introTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  introDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  aiHighlight: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  aiHighlightTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  aiHighlightSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  infoGrid: { borderRadius: 14, borderWidth: 1, padding: 4, flexDirection: "row", flexWrap: "wrap" },
  infoCell: { width: "50%", padding: 14, gap: 4, borderWidth: 0.5, borderColor: "transparent" },
  infoCellLabel: { fontSize: 11, fontFamily: "Inter_500Medium" },
  infoCellValue: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sectionLabel: { fontSize: 14, fontFamily: "Inter_700Bold" },
  catChips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  catChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  levelLegend: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  legendTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  legendRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLevel: { fontSize: 12, fontFamily: "Inter_700Bold", width: 28 },
  legendDesc: { fontSize: 12, fontFamily: "Inter_400Regular" },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  ctaBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  retakeBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 13, borderRadius: 14, borderWidth: 1 },
  retakeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  // Generating
  genCard: { borderRadius: 20, borderWidth: 1, padding: 28, alignItems: "center", gap: 14, width: "100%", maxWidth: 380 },
  genIconWrap: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  genTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  genMsg: { fontSize: 13, fontFamily: "Inter_500Medium", textAlign: "center" },
  genCats: { flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 4 },
  genCatChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, borderWidth: 1 },
  genCatText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  genNote: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  // Result
  resultBadge: { borderRadius: 20, borderWidth: 2, padding: 28, alignItems: "center", gap: 4 },
  resultBadgeLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 1.5, textTransform: "uppercase" },
  resultBadgeLevel: { fontSize: 64, fontFamily: "Inter_700Bold", lineHeight: 72 },
  resultBadgeSub: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scoreRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  scoreCell: { flex: 1, paddingVertical: 14, alignItems: "center", gap: 2 },
  scoreDivider: { width: 1 },
  scoreVal: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scoreLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  tipBox: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  // AI Analysis Card
  aiCard: { borderRadius: 16, borderWidth: 1.5, padding: 16, gap: 12 },
  aiCardHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  aiCardIconWrap: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  aiCardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  aiConfBadge: { marginLeft: "auto" as any, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  aiConfText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  aiSkeleton: { height: 14, borderRadius: 7 },
  aiLoadingText: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  aiAnalysisText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
  aiRecTitle: { fontSize: 13, fontFamily: "Inter_700Bold", marginBottom: 2 },
  aiRecRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, borderRadius: 10, borderWidth: 1, padding: 10 },
  aiRecPriority: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, marginTop: 1 },
  aiRecPriorityText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  aiRecArea: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  aiRecTip: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  aiMotivRow: { flexDirection: "row", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12, alignItems: "flex-start" },
  aiMotivText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19, fontStyle: "italic" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 4 },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelBadgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, width: 38, alignItems: "center" },
  levelBadgeSmallText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  levelTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  levelFill: { height: 8, borderRadius: 4 },
  levelCount: { fontSize: 12, fontFamily: "Inter_500Medium", width: 30, textAlign: "right" },
  catRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  catRowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catRowBody: { flex: 1, gap: 4 },
  catRowTop: { flexDirection: "row", justifyContent: "space-between" },
  catRowName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  catRowPct: { fontSize: 13, fontFamily: "Inter_700Bold" },
  catTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  catFill: { height: 6, borderRadius: 3 },
  catRowSub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  swBox: { borderRadius: 14, borderWidth: 1, padding: 16 },
  swSection: {},
  swHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  swTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  swItem: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 3 },
  reviewToggle: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 4 },
  reviewToggleText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  reviewCard: { borderRadius: 12, borderWidth: 1.5, overflow: "hidden" },
  reviewCardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12 },
  reviewIcon: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  reviewQLevel: { fontSize: 11, fontFamily: "Inter_700Bold" },
  reviewQCat: { fontSize: 11, fontFamily: "Inter_400Regular" },
  reviewQText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  reviewExpanded: { borderTopWidth: 1, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 6 },
  reviewOpt: { flexDirection: "row", alignItems: "center", gap: 8 },
  reviewOptText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  reviewExplanation: { flexDirection: "row", gap: 8, borderRadius: 8, borderWidth: 1, padding: 10, marginTop: 4, alignItems: "flex-start" },
  reviewExplanationText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  reviewRule: { fontSize: 11, fontFamily: "Inter_500Medium", fontStyle: "italic" },
  // Quiz
  quizHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  quizProgressWrap: { flex: 1, gap: 5 },
  quizTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  quizFill: { height: 6, borderRadius: 3 },
  quizProgressText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  quizBody: { flex: 1 },
  quizContent: { padding: 20, gap: 16, paddingBottom: 40 },
  catTag: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  catTagText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  questionText: { fontSize: 18, fontFamily: "Inter_600SemiBold", lineHeight: 28 },
  optionsList: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 14, minHeight: 52 },
  optionLetter: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  explanationBox: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  explanationText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  grammarRuleText: { fontSize: 11, fontFamily: "Inter_600SemiBold", fontStyle: "italic" },
  nextBar: { padding: 16, paddingBottom: Platform.OS === "web" ? 16 : 32, borderTopWidth: 1, gap: 0 },
  dot: { borderRadius: 5 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 15, borderRadius: 14 },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
