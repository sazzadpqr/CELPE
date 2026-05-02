import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
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

interface Category {
  id: string;
  title: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  description: string;
  questions: Question[];
}

const CATEGORIES: Category[] = [
  {
    id: "subjuntivo",
    title: "Subjuntivo",
    icon: "git-branch",
    color: "#185FA5",
    description: "Presente, pretérito imperfeito e futuro do subjuntivo",
    questions: [
      {
        id: "s1",
        question: "Escolha a forma correta: \"Espero que ele ___ amanhã.\"",
        options: ["vem", "venha", "viesse", "veio"],
        correct: 1,
        explanation: "Após verbos de desejo como 'esperar que', usa-se o presente do subjuntivo: 'venha'.",
      },
      {
        id: "s2",
        question: "\"Se eu ___ rico, viajaria pelo mundo.\"",
        options: ["fosse", "seria", "fui", "sou"],
        correct: 0,
        explanation: "Em orações condicionais contrárias à realidade, usa-se o imperfeito do subjuntivo: 'fosse'.",
      },
      {
        id: "s3",
        question: "\"Quando você ___ ao Brasil, avise-me.\"",
        options: ["veio", "venha", "vier", "vem"],
        correct: 2,
        explanation: "Com 'quando' referindo-se ao futuro, usa-se o futuro do subjuntivo: 'vier'.",
      },
      {
        id: "s4",
        question: "\"É importante que todos ___ às reuniões.\"",
        options: ["comparecem", "compareçam", "compareceram", "compareceriam"],
        correct: 1,
        explanation: "Após expressões impessoais como 'é importante que', usa-se o presente do subjuntivo.",
      },
      {
        id: "s5",
        question: "\"Embora ele ___ cansado, continuou trabalhando.\"",
        options: ["está", "esteve", "esteja", "estivesse"],
        correct: 3,
        explanation: "Após 'embora' (concessiva), usa-se o imperfeito do subjuntivo: 'estivesse'.",
      },
    ],
  },
  {
    id: "concordancia",
    title: "Concordância",
    icon: "link",
    color: "#1D9E75",
    description: "Nominal e verbal: regras e casos especiais",
    questions: [
      {
        id: "c1",
        question: "\"___ muita gente nas ruas ontem.\"",
        options: ["Haviam", "Havia", "Houveram", "Tem"],
        correct: 1,
        explanation: "'Haver' com sentido de existir é impessoal e fica sempre no singular: 'Havia'.",
      },
      {
        id: "c2",
        question: "\"A maioria dos alunos ___ à aula.\"",
        options: ["faltaram", "faltou", "Ambas estão corretas", "falta"],
        correct: 2,
        explanation: "Com 'a maioria de', o verbo pode concordar com o núcleo ('maioria' → singular) ou com o complemento ('alunos' → plural).",
      },
      {
        id: "c3",
        question: "\"Os meninos e a menina ___ muito espertos.\"",
        options: ["é", "são", "foi", "estava"],
        correct: 1,
        explanation: "Sujeito composto com pessoas diferentes exige o verbo no plural.",
      },
      {
        id: "c4",
        question: "\"Vende-___ casas neste bairro.\"",
        options: ["se", "m", "nos", "lhe"],
        correct: 0,
        explanation: "Com sujeito no singular ('casas' seria o sujeito, mas com voz passiva sintética usa-se 'Vendem-se casas'). Aqui, 'Vende-se' com 'casas' como objeto direto é a alternativa correta no estilo formal.",
      },
      {
        id: "c5",
        question: "\"Três quartos do bolo ___ comido.\"",
        options: ["foi", "foram", "seja", "ser"],
        correct: 0,
        explanation: "Com expressão partitiva ('três quartos de'), o verbo concorda com o núcleo do sujeito: 'bolo' (singular) → 'foi'.",
      },
    ],
  },
  {
    id: "preposicoes",
    title: "Preposições",
    icon: "arrow-right",
    color: "#6B21A8",
    description: "Regência verbal, regência nominal e crase",
    questions: [
      {
        id: "p1",
        question: "\"Ele aspira ___ uma vida melhor.\"",
        options: ["a", "à", "de", "por"],
        correct: 1,
        explanation: "'Aspirar' no sentido de 'desejar' é transitivo indireto e rege a preposição 'a'. Com artigo feminino, forma-se crase: 'à'.",
      },
      {
        id: "p2",
        question: "\"Vou ___ São Paulo amanhã.\"",
        options: ["à", "a", "para", "em"],
        correct: 1,
        explanation: "Nomes de cidades sem artigo não admitem crase. Portanto, usa-se 'a' sem acento.",
      },
      {
        id: "p3",
        question: "\"Ele se lembrou ___ viagem.\"",
        options: ["de a", "da", "à", "de"],
        correct: 1,
        explanation: "'Lembrar-se' rege 'de' + artigo 'a' → contrai-se em 'da': 'lembrou-se da viagem'.",
      },
      {
        id: "p4",
        question: "\"Este produto é diferente ___ outros.\"",
        options: ["de os", "dos", "a", "às"],
        correct: 1,
        explanation: "'Diferente de' + artigo 'os' → contração 'dos'.",
      },
      {
        id: "p5",
        question: "\"Ele insistiu ___ que eu fosse.\"",
        options: ["a", "em", "de", "para"],
        correct: 1,
        explanation: "'Insistir' rege a preposição 'em': 'insistiu em que'.",
      },
    ],
  },
  {
    id: "pronomes",
    title: "Pronomes",
    icon: "user",
    color: "#BA7517",
    description: "Colocação pronominal e uso de pronomes",
    questions: [
      {
        id: "pr1",
        question: "\"Não ___ disseram nada.\"",
        options: ["me", "-me", "lhe", "te"],
        correct: 0,
        explanation: "Com palavra negativa antes do verbo, o pronome deve ficar antes (próclise): 'Não me disseram'.",
      },
      {
        id: "pr2",
        question: "\"___ telefonou ontem?\" (referindo-se a você)",
        options: ["Lhe", "Te", "Quem", "O"],
        correct: 0,
        explanation: "'Lhe' é pronome oblíquo de 3ª pessoa que substitui 'a você/a ele/a ela'.",
      },
      {
        id: "pr3",
        question: "Após verbo no futuro, o pronome deve ficar:",
        options: ["antes do verbo", "depois do verbo com hífen", "intercalado no verbo", "qualquer posição"],
        correct: 2,
        explanation: "No futuro do presente ou do pretérito, o pronome é intercalado: 'dar-lhe-ei', 'fá-lo-emos'.",
      },
      {
        id: "pr4",
        question: "\"Eu ___ vi ontem.\" (objeto direto de 3ª pessoa masculino)",
        options: ["lhe", "o", "lhes", "me"],
        correct: 1,
        explanation: "'O/a' são os pronomes de objeto direto de 3ª pessoa. 'Lhe' é objeto indireto.",
      },
      {
        id: "pr5",
        question: "\"Quando ___ chamar, responda logo.\"",
        options: ["te", "lhe", "o", "me"],
        correct: 0,
        explanation: "Com conjunção subordinativa antes do verbo, usa-se próclise: 'Quando te chamar'.",
      },
    ],
  },
  {
    id: "ortografia",
    title: "Ortografia",
    icon: "type",
    color: "#D85A30",
    description: "Acordo ortográfico, acentuação e grafia correta",
    questions: [
      {
        id: "o1",
        question: "Qual a grafia correta após o Acordo Ortográfico de 2009?",
        options: ["idéia", "idea", "ideia", "idêia"],
        correct: 2,
        explanation: "Com o Acordo Ortográfico, o acento diferencial foi eliminado de 'ideia'. A grafia correta é 'ideia'.",
      },
      {
        id: "o2",
        question: "\"O ônibus ___ as 8h.\" Qual palavra completa corretamente?",
        options: ["chega", "chéga", "chegá", "chegà"],
        correct: 0,
        explanation: "'Chega' não leva acento. O acento agudo em 'e' aberto só ocorre em palavras paroxítonas ou oxítonas específicas.",
      },
      {
        id: "o3",
        question: "Qual dessas palavras está grafada corretamente?",
        options: ["excessão", "exceção", "exeção", "excessão"],
        correct: 1,
        explanation: "A grafia correta é 'exceção' — com 'c' cedilhado antes de 'o'.",
      },
      {
        id: "o4",
        question: "\"___ obrigado.\" Como se escreve corretamente?",
        options: ["Muito", "Muinto", "Muinto", "Muyto"],
        correct: 0,
        explanation: "A grafia correta é 'Muito obrigado'. Não há 'n' antes do 't'.",
      },
      {
        id: "o5",
        question: "Qual palavra leva acento circunflexo?",
        options: ["voce", "vocé", "você", "vocè"],
        correct: 2,
        explanation: "'Você' leva acento circunflexo no 'e'. É uma oxítona terminada em 'e', portanto acentuada.",
      },
    ],
  },
];

type Phase = "select" | "quiz" | "result";

export default function GrammarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [phase, setPhase] = useState<Phase>("select");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const startQuiz = (cat: Category) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedCategory(cat);
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
          Escolha um tópico para praticar
        </Text>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            style={({ pressed }) => [
              styles.catCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
            ]}
            onPress={() => startQuiz(cat)}
          >
            <View style={[styles.catIcon, { backgroundColor: cat.color + "18" }]}>
              <Feather name={cat.icon} size={22} color={cat.color} />
            </View>
            <View style={styles.catMeta}>
              <Text style={[styles.catTitle, { color: colors.text }]}>{cat.title}</Text>
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
          <View
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` as any, backgroundColor: selectedCategory.color },
            ]}
          />
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
              if (i === q.correct) {
                bg = colors.successBg;
                border = colors.success;
                textColor = colors.success;
              } else if (i === selected && selected !== q.correct) {
                bg = colors.errorBg;
                border = colors.destructive;
                textColor = colors.destructive;
              }
            }
            return (
              <Pressable
                key={i}
                style={[styles.option, { backgroundColor: bg, borderColor: border }]}
                onPress={() => handleAnswer(i)}
              >
                <View style={[styles.optionLetter, { backgroundColor: border + "30" }]}>
                  <Text style={[styles.optionLetterText, { color: textColor }]}>
                    {["A", "B", "C", "D"][i]}
                  </Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{opt}</Text>
                {selected !== null && i === q.correct && (
                  <Feather name="check-circle" size={18} color={colors.success} style={{ marginLeft: "auto" as any }} />
                )}
                {selected !== null && i === selected && i !== q.correct && (
                  <Feather name="x-circle" size={18} color={colors.destructive} style={{ marginLeft: "auto" as any }} />
                )}
              </Pressable>
            );
          })}
        </View>

        {showExplanation && (
          <View
            style={[
              styles.explanationCard,
              {
                backgroundColor: isCorrect ? colors.successBg : colors.errorBg,
                borderColor: isCorrect ? colors.success : colors.destructive,
              },
            ]}
          >
            <View style={styles.explanationHeader}>
              <Feather
                name={isCorrect ? "check-circle" : "x-circle"}
                size={16}
                color={isCorrect ? colors.success : colors.destructive}
              />
              <Text style={[styles.explanationTitle, { color: isCorrect ? colors.success : colors.destructive }]}>
                {isCorrect ? "Correto!" : "Incorreto"}
              </Text>
            </View>
            <Text style={[styles.explanationText, { color: colors.text }]}>{q.explanation}</Text>
          </View>
        )}

        {selected !== null && (
          <Pressable
            style={[styles.nextBtn, { backgroundColor: selectedCategory.color }]}
            onPress={handleNext}
          >
            <Text style={styles.nextBtnText}>
              {currentIndex < selectedCategory.questions.length - 1 ? "Próxima" : "Ver resultado"}
            </Text>
            <Feather name="arrow-right" size={16} color="#fff" />
          </Pressable>
        )}
      </ScrollView>
    );
  }

  if (phase === "result" && selectedCategory) {
    const correct = answers.filter((a, i) => a === selectedCategory.questions[i].correct).length;
    const total = selectedCategory.questions.length;
    const pct = Math.round((correct / total) * 100);
    const color = pct >= 80 ? colors.success : pct >= 60 ? colors.warning : colors.destructive;

    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 24, paddingBottom: 40, alignItems: "center" }]}
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

        <View style={styles.resultActions}>
          <Pressable
            style={[styles.retryBtn, { borderColor: selectedCategory.color }]}
            onPress={() => startQuiz(selectedCategory)}
          >
            <Feather name="refresh-cw" size={15} color={selectedCategory.color} />
            <Text style={[styles.retryBtnText, { color: selectedCategory.color }]}>Refazer</Text>
          </Pressable>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: selectedCategory.color }]}
            onPress={reset}
          >
            <Text style={styles.doneBtnText}>Outros tópicos</Text>
          </Pressable>
        </View>

        <Text style={[styles.reviewTitle, { color: colors.text }]}>Revisão das respostas</Text>
        {selectedCategory.questions.map((q, i) => {
          const wasCorrect = answers[i] === q.correct;
          return (
            <View
              key={q.id}
              style={[
                styles.reviewCard,
                {
                  backgroundColor: colors.card,
                  borderColor: wasCorrect ? colors.success : colors.destructive,
                },
              ]}
            >
              <View style={styles.reviewTop}>
                <Feather
                  name={wasCorrect ? "check-circle" : "x-circle"}
                  size={16}
                  color={wasCorrect ? colors.success : colors.destructive}
                />
                <Text style={[styles.reviewQ, { color: colors.text }]}>{q.question}</Text>
              </View>
              <Text style={[styles.reviewAnswer, { color: wasCorrect ? colors.success : colors.destructive }]}>
                Resposta correta: {q.options[q.correct]}
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
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  catCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  catIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catMeta: { flex: 1, gap: 3 },
  catTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  catDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  questBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  questCount: { fontSize: 12, fontFamily: "Inter_700Bold" },
  quizHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  quizCategory: { fontSize: 14, fontFamily: "Inter_700Bold" },
  quizProgress: { fontSize: 13, fontFamily: "Inter_400Regular" },
  progressBar: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  progressFill: { height: 6, borderRadius: 3 },
  questionCard: { borderRadius: 14, borderWidth: 1, padding: 18 },
  questionText: { fontSize: 16, fontFamily: "Inter_600SemiBold", lineHeight: 23 },
  optionsWrap: { gap: 10 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
  },
  optionLetter: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", lineHeight: 19 },
  explanationCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  explanationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  explanationTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  explanationText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  nextBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
  resultCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  resultPct: { fontSize: 36, fontFamily: "Inter_700Bold" },
  resultFraction: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resultTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  resultSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  resultActions: { flexDirection: "row", gap: 12, width: "100%" },
  retryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 13,
  },
  retryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  doneBtn: { flex: 1, alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 13 },
  doneBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  reviewTitle: { fontSize: 16, fontFamily: "Inter_700Bold", alignSelf: "flex-start", marginTop: 8 },
  reviewCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 6, width: "100%" },
  reviewTop: { flexDirection: "row", gap: 8, alignItems: "flex-start" },
  reviewQ: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", lineHeight: 18 },
  reviewAnswer: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  reviewExp: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
