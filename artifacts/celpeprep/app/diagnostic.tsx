import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    level: "A2",
    question: "Como estudante dedicada, ela ___ sempre pontual.",
    options: ["está", "é", "estava", "seja"],
    correct: 1,
    explanation: "'Ser' expressa característica permanente. 'Estar' é para estados temporários.",
  },
  {
    id: "q2",
    level: "A2",
    question: "Quando eu era criança, ___ muito nas ruas.",
    options: ["brinquei", "brincava", "brinco", "brinque"],
    correct: 1,
    explanation: "O imperfeito ('brincava') indica ação habitual no passado.",
  },
  {
    id: "q3",
    level: "A2",
    question: "A carta que você escreveu está muito bem ___.",
    options: ["escrito", "escritas", "escrita", "escritos"],
    correct: 2,
    explanation: "Concordância com 'carta' (feminino singular): bem escrita.",
  },
  {
    id: "q4",
    level: "B1",
    question: "O professor pediu que os alunos ___ o texto com atenção.",
    options: ["leram", "lerem", "lerão", "leiam"],
    correct: 3,
    explanation: "Após 'pedir que', usa-se o subjuntivo presente: leiam.",
  },
  {
    id: "q5",
    level: "B1",
    question: "___ estivesse cansada, ela continuou estudando.",
    options: ["Porque", "Embora", "Portanto", "Assim"],
    correct: 1,
    explanation: "'Embora' é conjunção concessiva e exige subjuntivo.",
  },
  {
    id: "q6",
    level: "B1",
    question: "A pesquisadora ___ você me falou ganhou um prêmio.",
    options: ["que", "a qual", "de quem", "quem"],
    correct: 2,
    explanation: "'Falar de alguém' → 'de quem você me falou'.",
  },
  {
    id: "q7",
    level: "B1",
    question: "O relatório ___ pela equipe até sexta-feira.",
    options: ["será entregado", "será entregue", "entregará", "vai entregar"],
    correct: 1,
    explanation: "'Entregar' tem particípio irregular: entregue (voz passiva).",
  },
  {
    id: "q8",
    level: "B2",
    question: "Quando você ___ os dados, me avise imediatamente.",
    options: ["analisará", "analisa", "analisar", "analisasse"],
    correct: 2,
    explanation: "Após 'quando' referindo-se ao futuro, usa-se o futuro do subjuntivo.",
  },
  {
    id: "q9",
    level: "B2",
    question: "Estudamos bastante ___ passar no exame.",
    options: ["pois", "assim", "a fim de", "visto que"],
    correct: 2,
    explanation: "'A fim de' exprime finalidade (= para).",
  },
  {
    id: "q10",
    level: "B2",
    question: "Ela disse que ___ à festa naquela noite.",
    options: ["iria", "vai", "foi", "irá"],
    correct: 0,
    explanation: "No discurso indireto, o futuro do indicativo vira futuro do pretérito (iria).",
  },
  {
    id: "q11",
    level: "B2",
    question: "Os especialistas discordaram ___ decisão tomada.",
    options: ["de a", "da", "em", "à"],
    correct: 1,
    explanation: "'Discordar de' + 'a decisão' → crase obrigatória: 'da'.",
  },
  {
    id: "q12",
    level: "B2",
    question: "As análises apresentadas foram ___ relevantes para o caso.",
    options: ["muito", "muitas", "muitos", "muitíssimas"],
    correct: 0,
    explanation: "'Muito' como advérbio (modifica adjetivo) é invariável.",
  },
  {
    id: "q13",
    level: "C1",
    question: "Era necessário que todos ___ mais conscientes sobre o impacto.",
    options: ["são", "fossem", "sejam", "tenham sido"],
    correct: 1,
    explanation: "Com verbo principal no passado, o subjuntivo da subordinada fica no imperfeito: fossem.",
  },
  {
    id: "q14",
    level: "C1",
    question: "O programa mostrou-se eficiente; ___, gerou novos desafios.",
    options: ["por isso", "contudo", "assim sendo", "além disso"],
    correct: 1,
    explanation: "'Contudo' expressa contraste/adversidade entre as orações.",
  },
  {
    id: "q15",
    level: "C1",
    question: "Trata-se de uma das análises mais ___ já conduzidas nessa área.",
    options: ["abrangente", "abrangentes", "abrangendo", "abrangido"],
    correct: 1,
    explanation: "Concordância com 'análises' (plural): abrangentes.",
  },
];

function calculateLevel(answers: (number | null)[]): Level {
  const byLevel: Record<Level, { correct: number; total: number }> = {
    A2: { correct: 0, total: 0 },
    B1: { correct: 0, total: 0 },
    B2: { correct: 0, total: 0 },
    C1: { correct: 0, total: 0 },
  };
  QUESTIONS.forEach((q, i) => {
    byLevel[q.level].total++;
    if (answers[i] === q.correct) byLevel[q.level].correct++;
  });

  const pct = (l: Level) =>
    byLevel[l].total > 0 ? byLevel[l].correct / byLevel[l].total : 0;

  if (pct("C1") >= 0.67) return "C1";
  if (pct("B2") >= 0.6) return "B2";
  if (pct("B1") >= 0.5) return "B1";
  return "A2";
}

const LEVEL_DESC: Record<Level, string> = {
  A2: "Nível básico — foque em gramática fundamental e vocabulário essencial.",
  B1: "Nível intermediário — trabalhe estruturas complexas e coesão textual.",
  B2: "Nível intermediário-avançado — refine o registro formal e argumentação.",
  C1: "Nível avançado — foque em precisão, sofisticação e adequação ao gênero.",
};

const LEVEL_COLOR: Record<Level, string> = {
  A2: "#BA7517",
  B1: "#185FA5",
  B2: "#6B21A8",
  C1: "#1D9E75",
};

export default function DiagnosticScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { updateProfile } = useApp();

  const [step, setStep] = useState<"intro" | "quiz" | "result">("intro");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(QUESTIONS.length).fill(null)
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [resultLevel, setResultLevel] = useState<Level>("B1");

  const q = QUESTIONS[currentIdx];
  const progress = (currentIdx / QUESTIONS.length) * 100;

  const handleSelect = (optIdx: number) => {
    if (selected !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(optIdx);
  };

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[currentIdx] = selected;
    setAnswers(newAnswers);

    if (currentIdx + 1 < QUESTIONS.length) {
      setCurrentIdx(currentIdx + 1);
      setSelected(null);
    } else {
      const level = calculateLevel(newAnswers);
      setResultLevel(level);
      setStep("result");
      updateProfile({ diagnosticDone: true, level });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  if (step === "intro") {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16 }]}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={[styles.introIcon, { backgroundColor: colors.primary + "18" }]}>
          <Feather name="activity" size={36} color={colors.primary} />
        </View>
        <Text style={[styles.introTitle, { color: colors.text }]}>
          Teste Diagnóstico
        </Text>
        <Text style={[styles.introDesc, { color: colors.mutedForeground }]}>
          15 questões de gramática que vão determinar seu nível atual de português e personalizar seu plano de estudos.
        </Text>
        <View style={styles.infoCards}>
          {[
            { icon: "clock" as const, text: "~10 minutos" },
            { icon: "bar-chart-2" as const, text: "15 questões de gramática" },
            { icon: "target" as const, text: "Plano personalizado ao final" },
          ].map((item) => (
            <View
              key={item.text}
              style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name={item.icon} size={18} color={colors.primary} />
              <Text style={[styles.infoCardText, { color: colors.text }]}>{item.text}</Text>
            </View>
          ))}
        </View>
        <Pressable
          style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
          onPress={() => setStep("quiz")}
        >
          <Text style={styles.ctaBtnText}>Começar teste</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      </ScrollView>
    );
  }

  if (step === "result") {
    const correct = answers.filter((a, i) => a === QUESTIONS[i].correct).length;
    const levelColor = LEVEL_COLOR[resultLevel];
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 60 }]}
      >
        <View style={[styles.resultHeader, { backgroundColor: levelColor + "15", borderColor: levelColor + "40" }]}>
          <Text style={[styles.resultLabel, { color: levelColor }]}>Seu nível</Text>
          <Text style={[styles.resultLevel, { color: levelColor }]}>{resultLevel}</Text>
          <Text style={[styles.resultScore, { color: colors.mutedForeground }]}>
            {correct}/{QUESTIONS.length} questões corretas
          </Text>
        </View>
        <Text style={[styles.resultDesc, { color: colors.text }]}>
          {LEVEL_DESC[resultLevel]}
        </Text>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Desempenho por nível
        </Text>
        {(["A2", "B1", "B2", "C1"] as Level[]).map((lvl) => {
          const qs = QUESTIONS.filter((q) => q.level === lvl);
          const correct = qs.filter((q, i) => {
            const qIdx = QUESTIONS.indexOf(q);
            return answers[qIdx] === q.correct;
          }).length;
          const pct = qs.length > 0 ? (correct / qs.length) * 100 : 0;
          return (
            <View key={lvl} style={styles.levelRow}>
              <Text style={[styles.levelLabel, { color: LEVEL_COLOR[lvl] }]}>{lvl}</Text>
              <View style={[styles.levelTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[
                    styles.levelFill,
                    { width: `${pct}%` as any, backgroundColor: LEVEL_COLOR[lvl] },
                  ]}
                />
              </View>
              <Text style={[styles.levelCount, { color: colors.mutedForeground }]}>
                {correct}/{qs.length}
              </Text>
            </View>
          );
        })}

        <Pressable
          style={[styles.ctaBtn, { backgroundColor: colors.primary, marginTop: 24 }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.ctaBtnText}>Ver meu plano de estudo</Text>
          <Feather name="arrow-right" size={18} color="#fff" />
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.quizHeader, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <Pressable
          onPress={() => {
            if (currentIdx > 0) {
              setCurrentIdx(currentIdx - 1);
              setSelected(answers[currentIdx - 1]);
            } else {
              setStep("intro");
            }
          }}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.quizProgressWrap}>
          <View style={[styles.quizTrack, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.quizFill,
                { width: `${progress}%` as any, backgroundColor: colors.primary },
              ]}
            />
          </View>
          <Text style={[styles.quizProgress, { color: colors.mutedForeground }]}>
            {currentIdx + 1} / {QUESTIONS.length}
          </Text>
        </View>
        <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLOR[q.level] + "18" }]}>
          <Text style={[styles.levelBadgeText, { color: LEVEL_COLOR[q.level] }]}>
            {q.level}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.quizBody}
        contentContainerStyle={styles.quizContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>

        <View style={styles.optionsList}>
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isCorrect = i === q.correct;
            const isWrong = isSelected && !isCorrect;
            const showResult = selected !== null;

            let bg = colors.card;
            let border = colors.border;
            let textColor = colors.text;

            if (showResult && isCorrect) {
              bg = "#D1FAE5";
              border = "#34D399";
              textColor = "#065F46";
            } else if (showResult && isWrong) {
              bg = "#FEE2E2";
              border = "#F87171";
              textColor = "#991B1B";
            } else if (isSelected) {
              bg = colors.infoBg;
              border = colors.primary;
              textColor = colors.primary;
            }

            return (
              <Pressable
                key={i}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                onPress={() => handleSelect(i)}
                disabled={selected !== null}
              >
                <View style={[styles.optionLetter, { backgroundColor: border + "30" }]}>
                  <Text style={[styles.optionLetterText, { color: textColor }]}>
                    {["A", "B", "C", "D"][i]}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {showResult && isCorrect && (
                  <Feather name="check-circle" size={18} color="#059669" />
                )}
                {showResult && isWrong && (
                  <Feather name="x-circle" size={18} color="#DC2626" />
                )}
              </Pressable>
            );
          })}
        </View>

        {selected !== null && (
          <View style={[styles.explanationBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="info" size={14} color={colors.primary} />
            <Text style={[styles.explanationText, { color: colors.mutedForeground }]}>
              {q.explanation}
            </Text>
          </View>
        )}
      </ScrollView>

      {selected !== null && (
        <View style={[styles.nextBar, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <Pressable
            style={[styles.nextBtn, { backgroundColor: colors.primary }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {currentIdx + 1 < QUESTIONS.length ? "Próxima" : "Ver resultado"}
            </Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 20, paddingBottom: 40 },
  backBtn: { padding: 4, marginBottom: 8 },
  introIcon: { width: 72, height: 72, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  introTitle: { fontSize: 26, fontFamily: "Inter_700Bold" },
  introDesc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  infoCards: { gap: 10 },
  infoCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  infoCardText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 16, borderRadius: 14 },
  ctaBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  resultHeader: { borderRadius: 16, borderWidth: 1.5, padding: 24, alignItems: "center", gap: 4 },
  resultLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.8 },
  resultLevel: { fontSize: 56, fontFamily: "Inter_700Bold" },
  resultScore: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resultDesc: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 24 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  levelRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  levelLabel: { fontSize: 13, fontFamily: "Inter_700Bold", width: 28 },
  levelTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  levelFill: { height: 8, borderRadius: 4 },
  levelCount: { fontSize: 12, fontFamily: "Inter_500Medium", width: 28, textAlign: "right" },
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  quizProgressWrap: { flex: 1, gap: 4 },
  quizTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  quizFill: { height: 6, borderRadius: 3 },
  quizProgress: { fontSize: 11, fontFamily: "Inter_500Medium" },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  levelBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  quizBody: { flex: 1 },
  quizContent: { padding: 20, gap: 16, paddingBottom: 40 },
  questionText: { fontSize: 18, fontFamily: "Inter_600SemiBold", lineHeight: 28 },
  optionsList: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    minHeight: 52,
  },
  optionLetter: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 20 },
  explanationBox: { flexDirection: "row", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14, alignItems: "flex-start" },
  explanationText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  nextBar: { padding: 16, paddingBottom: Platform.OS === "web" ? 16 : 32, borderTopWidth: 1 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 15, borderRadius: 14 },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
});
