import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator, Linking, Platform, Pressable, ScrollView,
  StyleSheet, Text, View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

type Resource = {
  id: string;
  title: string;
  source: string;
  description: string;
  url: string;
  icon: string;
  color: string;
  type: "podcast" | "video" | "radio" | "exercise";
};

type Tip = { id: string; text: string };

type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Exercise = {
  id: string;
  title: string;
  description: string;
  audioUrl: string;
  audioSource: string;
  level: string;
  durationLabel: string;
  questions: Question[];
  transcript: string;
};

const FALLBACK_RESOURCES: Resource[] = [
  { id: "r1", title: "Rádio MEC", source: "Rádio MEC", description: "Emissora pública com programação jornalística e cultural em PT-BR formal.", url: "https://radiomec.com.br", icon: "radio", color: "#185FA5", type: "radio" },
  { id: "r2", title: "CBN — Central Brasileira de Notícias", source: "CBN", description: "Radiojornalismo 24h. Ideal para treinar escuta em contexto formal.", url: "https://cbn.globoradio.globo.com", icon: "radio", color: "#1D9E75", type: "radio" },
  { id: "r3", title: "Café Brasil (Podcast)", source: "Rodrigo Vianna", description: "Episódios sobre cultura, filosofia e comportamento. Sotaque neutro.", url: "https://open.spotify.com/show/0JvAChNwIjkjLAfhUeEOaA", icon: "headphones", color: "#6B21A8", type: "podcast" },
  { id: "r4", title: "Nexo Jornal — Áudios", source: "Nexo", description: "Podcasts de análise jornalística com vocabulário avançado e formal.", url: "https://www.nexojornal.com.br/podcasts", icon: "headphones", color: "#D85A30", type: "podcast" },
  { id: "r5", title: "TV Cultura", source: "TV Cultura", description: "Programação educativa e cultural. Ótimo para escuta com suporte visual.", url: "https://tvcultura.com.br", icon: "tv", color: "#BA7517", type: "video" },
  { id: "r6", title: "Canal Futura", source: "Canal Futura", description: "Conteúdo educativo produzido no Brasil. Linguagem clara e formal.", url: "https://www.futura.org.br", icon: "tv", color: "#185FA5", type: "video" },
];

const FALLBACK_TIPS: Tip[] = [
  { id: "t1", text: "Ouça sem ver a transcrição primeiro — tente entender o contexto geral." },
  { id: "t2", text: "Ouça novamente anotando palavras desconhecidas." },
  { id: "t3", text: "Identifique o gênero discursivo: notícia, entrevista, debate, reportagem." },
  { id: "t4", text: "Preste atenção em marcadores discursivos: 'entretanto', 'por sua vez', 'diante disso'." },
  { id: "t5", text: "Pratique pelo menos 20 minutos por dia para desenvolver a escuta." },
];

const TYPE_LABELS: Record<string, string> = {
  podcast: "Podcast",
  video: "Vídeo",
  radio: "Rádio Online",
  exercise: "Exercício",
};

const LEVEL_COLORS: Record<string, string> = {
  A2: "#1D9E75",
  B1: "#185FA5",
  B2: "#6B21A8",
  C1: "#BA7517",
};

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

type ExerciseState = {
  answers: Record<string, number>;
  showTranscript: boolean;
  submitted: boolean;
};

function ExerciseCard({ ex, colors }: { ex: Exercise; colors: ReturnType<typeof useColors> }) {
  const [expanded, setExpanded] = useState(false);
  const [state, setState] = useState<ExerciseState>({ answers: {}, showTranscript: false, submitted: false });
  const levelColor = LEVEL_COLORS[ex.level] ?? "#185FA5";

  const allAnswered = ex.questions.length > 0 && ex.questions.every((q) => state.answers[q.id] !== undefined);
  const score = ex.questions.filter((q) => state.answers[q.id] === q.correctIndex).length;

  const answerQuestion = (qId: string, optIdx: number) => {
    if (state.submitted) return;
    setState((prev) => ({ ...prev, answers: { ...prev.answers, [qId]: optIdx } }));
  };

  const submit = () => setState((prev) => ({ ...prev, submitted: true }));

  const retry = () => setState({ answers: {}, showTranscript: false, submitted: false });

  return (
    <View style={[styles.exCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={({ pressed }) => [styles.exHeader, { opacity: pressed ? 0.7 : 1 }]}
      >
        <View style={styles.exHeaderLeft}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + "20" }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{ex.level}</Text>
          </View>
          <View style={styles.exMeta}>
            <Text style={[styles.exTitle, { color: colors.text }]} numberOfLines={expanded ? undefined : 2}>
              {ex.title}
            </Text>
            <View style={styles.exSubRow}>
              {ex.audioSource ? (
                <View style={styles.exSubItem}>
                  <Feather name="volume-2" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.exSubText, { color: colors.mutedForeground }]}>{ex.audioSource}</Text>
                </View>
              ) : null}
              {ex.durationLabel ? (
                <View style={styles.exSubItem}>
                  <Feather name="clock" size={11} color={colors.mutedForeground} />
                  <Text style={[styles.exSubText, { color: colors.mutedForeground }]}>{ex.durationLabel}</Text>
                </View>
              ) : null}
              <View style={styles.exSubItem}>
                <Feather name="help-circle" size={11} color={colors.mutedForeground} />
                <Text style={[styles.exSubText, { color: colors.mutedForeground }]}>{ex.questions.length} questões</Text>
              </View>
            </View>
          </View>
        </View>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={18} color={colors.mutedForeground} />
      </Pressable>

      {expanded && (
        <View style={[styles.exBody, { borderTopColor: colors.border }]}>
          {ex.description ? (
            <Text style={[styles.exDesc, { color: colors.mutedForeground }]}>{ex.description}</Text>
          ) : null}

          {ex.audioUrl ? (
            <Pressable
              onPress={() => Linking.openURL(ex.audioUrl)}
              style={({ pressed }) => [styles.audioBtn, { backgroundColor: levelColor + "18", borderColor: levelColor + "40", opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name="play-circle" size={18} color={levelColor} />
              <Text style={[styles.audioBtnText, { color: levelColor }]}>Acessar Áudio</Text>
              <Feather name="external-link" size={13} color={levelColor} />
            </Pressable>
          ) : null}

          {state.submitted && (
            <View style={[styles.scoreCard, {
              backgroundColor: score === ex.questions.length ? "#1D9E7520" : score >= ex.questions.length / 2 ? "#BA751720" : "#EF444420",
              borderColor: score === ex.questions.length ? "#1D9E7540" : score >= ex.questions.length / 2 ? "#BA751740" : "#EF444440",
            }]}>
              <Text style={[styles.scoreEmoji]}>
                {score === ex.questions.length ? "🏆" : score >= ex.questions.length / 2 ? "👍" : "📚"}
              </Text>
              <View>
                <Text style={[styles.scoreTitle, { color: colors.text }]}>
                  {score}/{ex.questions.length} corretas
                </Text>
                <Text style={[styles.scoreSubtitle, { color: colors.mutedForeground }]}>
                  {score === ex.questions.length
                    ? "Excelente! Você acertou tudo."
                    : score >= ex.questions.length / 2
                    ? "Bom trabalho! Continue praticando."
                    : "Ouça novamente e tente mais uma vez."}
                </Text>
              </View>
              <Pressable onPress={retry} style={[styles.retryBtn, { backgroundColor: colors.muted }]}>
                <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
              </Pressable>
            </View>
          )}

          {ex.questions.map((q, qi) => {
            const chosen = state.answers[q.id];
            const isAnswered = chosen !== undefined;
            const isCorrect = chosen === q.correctIndex;
            return (
              <View key={q.id} style={styles.questionBlock}>
                <Text style={[styles.questionNum, { color: colors.mutedForeground }]}>Questão {qi + 1}</Text>
                <Text style={[styles.questionText, { color: colors.text }]}>{q.text}</Text>
                <View style={styles.optionsList}>
                  {q.options.map((opt, oi) => {
                    const isSelected = chosen === oi;
                    const isTheCorrect = oi === q.correctIndex;
                    let bg = colors.background;
                    let border = colors.border;
                    let textColor = colors.text;
                    if (state.submitted && isSelected && isCorrect) { bg = "#1D9E7518"; border = "#1D9E75"; textColor = "#1D9E75"; }
                    else if (state.submitted && isSelected && !isCorrect) { bg = "#EF444418"; border = "#EF4444"; textColor = "#EF4444"; }
                    else if (state.submitted && isTheCorrect) { bg = "#1D9E7510"; border = "#1D9E7560"; textColor = "#1D9E75"; }
                    else if (!state.submitted && isSelected) { bg = levelColor + "18"; border = levelColor; textColor = levelColor; }
                    return (
                      <Pressable
                        key={oi}
                        onPress={() => answerQuestion(q.id, oi)}
                        disabled={state.submitted}
                        style={({ pressed }) => [
                          styles.option,
                          { backgroundColor: bg, borderColor: border, opacity: pressed && !state.submitted ? 0.7 : 1 },
                        ]}
                      >
                        <View style={[styles.optionLetter, { borderColor: border }]}>
                          <Text style={[styles.optionLetterText, { color: textColor }]}>
                            {state.submitted && isSelected && !isCorrect ? "✗" : state.submitted && isTheCorrect ? "✓" : String.fromCharCode(65 + oi)}
                          </Text>
                        </View>
                        <Text style={[styles.optionText, { color: textColor, flex: 1 }]}>{opt}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                {state.submitted && q.explanation ? (
                  <View style={[styles.explanationBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Feather name="info" size={13} color={colors.mutedForeground} />
                    <Text style={[styles.explanationText, { color: colors.mutedForeground }]}>{q.explanation}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}

          {allAnswered && !state.submitted && (
            <Pressable
              onPress={submit}
              style={({ pressed }) => [styles.submitBtn, { backgroundColor: levelColor, opacity: pressed ? 0.8 : 1 }]}
            >
              <Text style={styles.submitBtnText}>Ver Resultado</Text>
            </Pressable>
          )}

          {ex.transcript ? (
            <View>
              <Pressable
                onPress={() => setState((prev) => ({ ...prev, showTranscript: !prev.showTranscript }))}
                style={({ pressed }) => [styles.transcriptToggle, { borderColor: colors.border, opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="file-text" size={14} color={colors.mutedForeground} />
                <Text style={[styles.transcriptToggleText, { color: colors.mutedForeground }]}>
                  {state.showTranscript ? "Ocultar Transcrição" : "Ver Transcrição"}
                </Text>
                <Feather name={state.showTranscript ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
              </Pressable>
              {state.showTranscript && (
                <View style={[styles.transcriptBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.transcriptText, { color: colors.text }]}>{ex.transcript}</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      )}
    </View>
  );
}

export default function ListeningScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [resources, setResources] = useState<Resource[]>(FALLBACK_RESOURCES);
  const [tips, setTips] = useState<Tip[]>(FALLBACK_TIPS);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(getApiUrl("/api/content/listening"))
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            if (data.resources?.length > 0) setResources(data.resources);
            if (data.tips?.length > 0) setTips(data.tips);
          }
        })
        .catch(() => {}),
      fetch(getApiUrl("/api/content/listening-exercises"))
        .then((r) => r.ok ? r.json() : null)
        .then((data) => { if (Array.isArray(data)) setExercises(data); })
        .catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>Compreensão Auditiva</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Recursos selecionados e exercícios integrados para treinar escuta em português brasileiro formal.
      </Text>

      {loading ? (
        <View style={{ alignItems: "center", paddingVertical: 32 }}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Tips */}
          <View style={[styles.tipsCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <View style={styles.tipsHeader}>
              <Feather name="zap" size={14} color={colors.primary} />
              <Text style={[styles.tipsTitle, { color: colors.primary }]}>Dicas de Estudo</Text>
            </View>
            {tips.map((tip) => (
              <View key={tip.id} style={styles.tipRow}>
                <View style={[styles.tipDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.tipText, { color: colors.text }]}>{tip.text}</Text>
              </View>
            ))}
          </View>

          {/* Integrated Exercises */}
          {exercises.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>EXERCÍCIOS INTEGRADOS</Text>
              <View style={[styles.exercisesNote, { backgroundColor: "#1D9E7510", borderColor: "#1D9E7530" }]}>
                <Feather name="headphones" size={13} color="#1D9E75" />
                <Text style={[styles.exercisesNoteText, { color: "#1D9E75" }]}>
                  Acesse o áudio externo, ouça com atenção e responda as questões abaixo.
                </Text>
              </View>
              {exercises.map((ex) => (
                <ExerciseCard key={ex.id} ex={ex} colors={colors} />
              ))}
            </>
          )}

          {/* Resources */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>RECURSOS EXTERNOS</Text>
          <View style={[styles.resourcesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {resources.map((r, i) => (
              <View key={r.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <Pressable
                  onPress={() => Linking.openURL(r.url)}
                  style={({ pressed }) => [styles.resourceItem, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.resourceIcon, { backgroundColor: r.color + "18" }]}>
                    <Feather name={r.icon as any} size={20} color={r.color} />
                  </View>
                  <View style={styles.resourceMeta}>
                    <View style={styles.resourceTitleRow}>
                      <Text style={[styles.resourceTitle, { color: colors.text }]}>{r.title}</Text>
                      <View style={[styles.typeBadge, { backgroundColor: r.color + "20" }]}>
                        <Text style={[styles.typeBadgeText, { color: r.color }]}>{TYPE_LABELS[r.type] ?? r.type}</Text>
                      </View>
                    </View>
                    {r.source ? <Text style={[styles.resourceSource, { color: r.color }]}>{r.source}</Text> : null}
                    <Text style={[styles.resourceDesc, { color: colors.mutedForeground }]}>{r.description}</Text>
                  </View>
                  <Feather name="external-link" size={14} color={colors.mutedForeground} />
                </Pressable>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: -6 },
  tipsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  tipsHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  tipText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, paddingHorizontal: 4 },
  exercisesNote: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, marginTop: -6 },
  exercisesNoteText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  exCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  exHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  exHeaderLeft: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: "flex-start" },
  levelText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  exMeta: { flex: 1, gap: 4 },
  exTitle: { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20 },
  exSubRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  exSubItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  exSubText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  exBody: { borderTopWidth: 1, padding: 16, gap: 14 },
  exDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  audioBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  audioBtnText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scoreCard: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  scoreEmoji: { fontSize: 28 },
  scoreTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scoreSubtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  retryBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginLeft: "auto" },
  questionBlock: { gap: 10 },
  questionNum: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  questionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  optionsList: { gap: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5 },
  optionLetter: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  optionText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  explanationBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  explanationText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  submitBtn: { padding: 15, borderRadius: 14, alignItems: "center" },
  submitBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  transcriptToggle: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  transcriptToggleText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  transcriptBox: { padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 6 },
  transcriptText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 21 },
  resourcesCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 16 },
  resourceItem: { flexDirection: "row", alignItems: "flex-start", gap: 14, padding: 16 },
  resourceIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  resourceMeta: { flex: 1, gap: 2 },
  resourceTitleRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  resourceTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  resourceSource: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  resourceDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
