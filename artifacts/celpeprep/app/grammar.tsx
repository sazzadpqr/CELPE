import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState, useEffect } from "react";
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
import { useColors } from "@/hooks/useColors";

interface Question {
  id: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

type LessonContent = {
  rule: string;
  examples: { sentence: string; highlight: string; note: string }[];
  mistake: { wrong: string; right: string; reason: string };
  tip: string;
};

interface Category {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  description: string;
  questions: Question[];
  lesson?: LessonContent | null;
}

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

function useQuizCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/content/quiz"))
      .then((r) => r.json())
      .then((data: Array<{
        id: string; title: string; icon: string; color: string;
        description: string; questions: Question[];
        lesson?: LessonContent | null;
      }>) => {
        setCategories(
          data.map((c) => ({
            ...c,
            icon: (c.icon || "book") as keyof typeof Feather.glyphMap,
            questions: (c.questions || []),
            lesson: c.lesson ?? null,
          }))
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}

// ─── Lesson Phase ──────────────────────────────────────────────────────────────

function LessonPhase({ category, onStart, onBack }: { category: Category; onStart: () => void; onBack: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const lesson = category.lesson;

  if (!lesson) {
    onStart();
    return null;
  }

  const highlightSentence = (sentence: string, highlight: string, color: string) => {
    const idx = sentence.indexOf(highlight);
    if (idx === -1) return <Text style={[styles.exampleSentence, { color: colors.text }]}>{sentence}</Text>;
    return (
      <Text style={[styles.exampleSentence, { color: colors.text }]}>
        {sentence.slice(0, idx)}
        <Text style={{ color, fontFamily: "Inter_700Bold" }}>{highlight}</Text>
        {sentence.slice(idx + highlight.length)}
      </Text>
    );
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 48 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.lessonHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={[styles.lessonIconWrap, { backgroundColor: category.color + "18" }]}>
          <Feather name={category.icon} size={20} color={category.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.lessonTitle, { color: colors.text }]}>{category.title}</Text>
          <Text style={[styles.lessonSubtitle, { color: colors.mutedForeground }]}>Aula rápida antes dos exercícios</Text>
        </View>
      </View>

      {/* Rule */}
      <View style={[styles.lessonSection, { backgroundColor: category.color + "0f", borderColor: category.color + "30" }]}>
        <View style={styles.lessonSectionHeader}>
          <Feather name="book-open" size={13} color={category.color} />
          <Text style={[styles.lessonSectionLabel, { color: category.color }]}>REGRA PRINCIPAL</Text>
        </View>
        <Text style={[styles.ruleText, { color: colors.text }]}>{lesson.rule}</Text>
      </View>

      {/* Examples */}
      <View style={[styles.lessonSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.lessonSectionHeader}>
          <Feather name="check-square" size={13} color={colors.primary} />
          <Text style={[styles.lessonSectionLabel, { color: colors.primary }]}>EXEMPLOS</Text>
        </View>
        <View style={{ gap: 14 }}>
          {lesson.examples.map((ex, i) => (
            <View key={i} style={styles.exampleItem}>
              <View style={[styles.exampleNum, { backgroundColor: category.color + "20" }]}>
                <Text style={[styles.exampleNumText, { color: category.color }]}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                {highlightSentence(ex.sentence, ex.highlight, category.color)}
                <Text style={[styles.exampleNote, { color: colors.mutedForeground }]}>{ex.note}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      {/* Common mistake */}
      <View style={[styles.lessonSection, { backgroundColor: colors.errorBg, borderColor: colors.destructive + "40" }]}>
        <View style={styles.lessonSectionHeader}>
          <Feather name="alert-triangle" size={13} color={colors.destructive} />
          <Text style={[styles.lessonSectionLabel, { color: colors.destructive }]}>ERRO COMUM</Text>
        </View>
        <View style={styles.mistakeRow}>
          <Text style={[styles.mistakeWrong, { color: colors.destructive }]}>✗ {lesson.mistake.wrong}</Text>
          <Text style={[styles.mistakeRight, { color: colors.success }]}>✓ {lesson.mistake.right}</Text>
          <Text style={[styles.mistakeReason, { color: colors.mutedForeground }]}>{lesson.mistake.reason}</Text>
        </View>
      </View>

      {/* Tip */}
      <View style={[styles.lessonSection, { backgroundColor: colors.infoBg, borderColor: colors.primary + "30" }]}>
        <Text style={[styles.tipText, { color: colors.primary }]}>{lesson.tip}</Text>
      </View>

      {/* Start button */}
      <Pressable
        style={[styles.startQuizBtn, { backgroundColor: category.color }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onStart();
        }}
      >
        <Feather name="play" size={18} color="#fff" />
        <Text style={styles.startQuizBtnText}>Iniciar exercícios ({category.questions.length} questões)</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── Quiz Phase ────────────────────────────────────────────────────────────────

type Phase = "select" | "lesson" | "quiz" | "result";

export default function GrammarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { categories, loading } = useQuizCategories();

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const startLesson = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(cat);
    setPhase("lesson");
  };

  const startQuiz = () => {
    setCurrentIndex(0);
    setAnswers([]);
    setSelected(null);
    setShowExplanation(false);
    setPhase("quiz");
  };

  const handleAnswer = (optionIndex: number) => {
    if (selected !== null) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(optionIndex);
    setShowExplanation(true);
  };

  const handleNext = () => {
    if (selected === null || !selectedCategory) return;
    const newAnswers = [...answers, selected];
    if (currentIndex < selectedCategory.questions.length - 1) {
      setAnswers(newAnswers);
      setCurrentIndex(currentIndex + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      setAnswers(newAnswers);
      setPhase("result");
    }
  };

  const reset = () => {
    setPhase("select");
    setSelectedCategory(null);
    setCurrentIndex(0);
    setAnswers([]);
    setSelected(null);
    setShowExplanation(false);
  };

  // ─── Select Phase ─────────────────────────────────────────────────────────────

  if (phase === "select") {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <Text style={[styles.screenTitle, { color: colors.text }]}>Exercícios de Gramática</Text>
        <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
          Escolha um tópico — aprenda a regra primeiro, depois pratique
        </Text>

        {loading ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : categories.map((cat) => (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [
              styles.catCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => startLesson(cat)}
          >
            <View style={[styles.catIcon, { backgroundColor: cat.color + "18" }]}>
              <Feather name={cat.icon} size={22} color={cat.color} />
            </View>
            <View style={styles.catMeta}>
              <View style={styles.catTitleRow}>
                <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
                {cat.lesson && (
                  <View style={[styles.lessonBadge, { backgroundColor: colors.primary + "18" }]}>
                    <Feather name="book-open" size={9} color={colors.primary} />
                    <Text style={[styles.lessonBadgeText, { color: colors.primary }]}>Aula</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.catDesc, { color: colors.mutedForeground }]}>{cat.description}</Text>
            </View>
            <View style={[styles.questBadge, { backgroundColor: cat.color + "18" }]}>
              <Text style={[styles.questCount, { color: cat.color }]}>{cat.questions.length}q</Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    );
  }

  // ─── Lesson Phase ─────────────────────────────────────────────────────────────

  if (phase === "lesson" && selectedCategory) {
    return (
      <LessonPhase
        category={selectedCategory}
        onStart={startQuiz}
        onBack={reset}
      />
    );
  }

  // ─── Quiz Phase ───────────────────────────────────────────────────────────────

  if (phase === "quiz" && selectedCategory) {
    const q = selectedCategory.questions[currentIndex];
    const isCorrect = selected === q.correct;
    const progress = (currentIndex + 1) / selectedCategory.questions.length;

    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quizHeader}>
          <Pressable onPress={reset} style={styles.backBtn}>
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
          <Text style={[styles.quizCategory, { color: selectedCategory.color }]}>{selectedCategory.title}</Text>
          <Text style={[styles.quizProgress, { color: colors.mutedForeground }]}>
            {currentIndex + 1}/{selectedCategory.questions.length}
          </Text>
        </View>

        <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` as any, backgroundColor: selectedCategory.color }]} />
        </View>

        <View style={[styles.questionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.questionText, { color: colors.text }]}>{q.question}</Text>
        </View>

        <View style={styles.optionsWrap}>
          {q.options.map((opt, i) => {
            let bg = colors.card;
            let border = colors.border;
            let textColor = colors.text;
            if (selected !== null) {
              if (i === q.correct) { bg = colors.successBg; border = colors.success; textColor = colors.success; }
              else if (i === selected && selected !== q.correct) { bg = colors.errorBg; border = colors.destructive; textColor = colors.destructive; }
            }
            return (
              <Pressable key={i} style={[styles.option, { backgroundColor: bg, borderColor: border }]} onPress={() => handleAnswer(i)}>
                <View style={[styles.optionLetter, { backgroundColor: border + "30" }]}>
                  <Text style={[styles.optionLetterText, { color: textColor }]}>{["A", "B", "C", "D"][i]}</Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {selected !== null && i === q.correct && <Feather name="check-circle" size={18} color={colors.success} style={{ marginLeft: "auto" as any }} />}
                {selected !== null && i === selected && i !== q.correct && <Feather name="x-circle" size={18} color={colors.destructive} style={{ marginLeft: "auto" as any }} />}
              </Pressable>
            );
          })}
        </View>

        {showExplanation && (
          <View style={[styles.explanationCard, { backgroundColor: isCorrect ? colors.successBg : colors.errorBg, borderColor: isCorrect ? colors.success : colors.destructive }]}>
            <View style={styles.explanationHeader}>
              <Feather name={isCorrect ? "check-circle" : "x-circle"} size={16} color={isCorrect ? colors.success : colors.destructive} />
              <Text style={[styles.explanationTitle, { color: isCorrect ? colors.success : colors.destructive }]}>
                {isCorrect ? "Correto!" : "Incorreto"}
              </Text>
            </View>
            <Text style={[styles.explanationText, { color: colors.text }]}>{q.explanation}</Text>
          </View>
        )}

        {selected !== null && (
          <Pressable style={[styles.nextBtn, { backgroundColor: selectedCategory.color }]} onPress={handleNext}>
            <Text style={styles.nextBtnText}>
              {currentIndex < selectedCategory.questions.length - 1 ? "Próxima" : "Ver resultado"}
            </Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        )}
      </ScrollView>
    );
  }

  // ─── Result Phase ─────────────────────────────────────────────────────────────

  if (phase === "result" && selectedCategory) {
    const correct = answers.filter((a, i) => a === selectedCategory.questions[i]?.correct).length;
    const total = selectedCategory.questions.length;
    const pct = Math.round((correct / total) * 100);
    const color = pct >= 80 ? colors.success : pct >= 60 ? colors.warning : colors.destructive;

    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 24, paddingBottom: 48, alignItems: "center" }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.resultCircle, { borderColor: color }]}>
          <Text style={[styles.resultPct, { color }]}>{pct}%</Text>
          <Text style={[styles.resultFraction, { color: colors.mutedForeground }]}>{correct}/{total}</Text>
        </View>
        <Text style={[styles.resultTitle, { color: colors.text }]}>
          {pct >= 80 ? "Excelente!" : pct >= 60 ? "Bom trabalho!" : "Continue praticando!"}
        </Text>
        <Text style={[styles.resultSub, { color: colors.mutedForeground }]}>
          {selectedCategory.title} — {correct} de {total} acertos
        </Text>

        {pct < 80 && selectedCategory.lesson && (
          <Pressable
            style={[styles.reviewLessonBtn, { backgroundColor: colors.infoBg, borderColor: colors.primary + "40" }]}
            onPress={() => { setPhase("lesson"); }}
          >
            <Feather name="book-open" size={14} color={colors.primary} />
            <Text style={[styles.reviewLessonText, { color: colors.primary }]}>Revisar a aula antes de refazer</Text>
            <Feather name="arrow-right" size={14} color={colors.primary} />
          </Pressable>
        )}

        <View style={styles.resultActions}>
          <Pressable style={[styles.retryBtn, { borderColor: selectedCategory.color }]} onPress={startQuiz}>
            <Feather name="refresh-cw" size={15} color={selectedCategory.color} />
            <Text style={[styles.retryBtnText, { color: selectedCategory.color }]}>Refazer</Text>
          </Pressable>
          <Pressable style={[styles.doneBtn, { backgroundColor: selectedCategory.color }]} onPress={reset}>
            <Text style={styles.doneBtnText}>Outros tópicos</Text>
          </Pressable>
        </View>

        <Text style={[styles.reviewTitle, { color: colors.text }]}>Revisão das respostas</Text>
        {selectedCategory.questions.map((q, i) => {
          const wasCorrect = answers[i] === q.correct;
          return (
            <View key={q.id} style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: wasCorrect ? colors.success : colors.destructive }]}>
              <View style={styles.reviewTop}>
                <Feather name={wasCorrect ? "check-circle" : "x-circle"} size={16} color={wasCorrect ? colors.success : colors.destructive} />
                <Text style={[styles.reviewQ, { color: colors.text }]}>{q.question}</Text>
              </View>
              <Text style={[styles.reviewAnswer, { color: wasCorrect ? colors.success : colors.destructive }]}>
                ✓ {q.options[q.correct]}
              </Text>
              <Text style={[styles.reviewExp, { color: colors.mutedForeground }]}>{q.explanation}</Text>
            </View>
          );
        })}
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 8 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6, lineHeight: 18 },
  catCard: { flexDirection: "row", alignItems: "center", gap: 14, borderRadius: 14, borderWidth: 1, padding: 16 },
  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catMeta: { flex: 1, gap: 3 },
  catTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  catTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  catDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  lessonBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lessonBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  questBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  questCount: { fontSize: 12, fontFamily: "Inter_700Bold" },
  // Lesson
  lessonHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 6 },
  lessonIconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  lessonTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  lessonSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  lessonSection: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  lessonSectionHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  lessonSectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  ruleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21 },
  exampleItem: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  exampleNum: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 2, flexShrink: 0 },
  exampleNumText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  exampleSentence: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  exampleNote: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  mistakeRow: { gap: 6 },
  mistakeWrong: { fontSize: 14, fontFamily: "Inter_500Medium" },
  mistakeRight: { fontSize: 14, fontFamily: "Inter_500Medium" },
  mistakeReason: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 2 },
  tipText: { fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  startQuizBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, borderRadius: 14, marginTop: 4 },
  startQuizBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  // Quiz
  quizHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  quizCategory: { fontSize: 14, fontFamily: "Inter_700Bold" },
  quizProgress: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  questionCard: { borderRadius: 14, borderWidth: 1, padding: 18 },
  questionText: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 23 },
  optionsWrap: { gap: 10 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1.5, padding: 14 },
  optionLetter: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 19 },
  explanationCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  explanationTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  explanationText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  nextBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 15, borderRadius: 12 },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  // Result
  resultCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 4, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  resultPct: { fontSize: 32, fontFamily: "Inter_700Bold" },
  resultFraction: { fontSize: 14, fontFamily: "Inter_400Regular" },
  resultTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  resultSub: { fontSize: 14, fontFamily: "Inter_400Regular" },
  reviewLessonBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, alignSelf: "stretch" },
  reviewLessonText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  resultActions: { flexDirection: "row", gap: 12, marginTop: 4, alignSelf: "stretch" },
  retryBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  retryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  doneBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, padding: 12 },
  doneBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reviewTitle: { fontSize: 16, fontFamily: "Inter_700Bold", alignSelf: "flex-start", marginTop: 8 },
  reviewCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 6, alignSelf: "stretch" },
  reviewTop: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  reviewQ: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 19 },
  reviewAnswer: { fontSize: 13, fontFamily: "Inter_700Bold" },
  reviewExp: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
