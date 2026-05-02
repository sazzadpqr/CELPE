import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useEffect, useState } from "react";
import {
  ActivityIndicator,
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

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

const LEVEL_LABELS: Record<string, string> = {
  A2: "A2 — Básico",
  B1: "B1 — Intermediário",
  B2: "B2 — Intermediário Superior",
  C1: "C1 — Avançado",
};

const QUICK_ACTIONS = [
  { label: "Praticar", icon: "edit-3" as const, route: "/practice", color: "#185FA5" },
  { label: "Vocabulário", icon: "book-open" as const, route: "/vocab", color: "#1D9E75" },
  { label: "Gramática", icon: "git-branch" as const, route: "/grammar", color: "#6B21A8" },
  { label: "Progresso", icon: "bar-chart-2" as const, route: "/progress", color: "#BA7517" },
  { label: "Provas", icon: "archive" as const, route: "/exams", color: "#D85A30" },
  { label: "Plano", icon: "calendar" as const, route: "/study", color: "#1D9E75" },
];

interface WotdWord {
  word: string;
  pos: string;
  definition: string;
  example: string;
}

function getDayOfYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function WordOfTheDay() {
  const colors = useColors();
  const [wordData, setWordData] = useState<WotdWord | null>(null);
  const [wotdLoading, setWotdLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/content/wotd"))
      .then((r) => r.json())
      .then((data: Array<{ word: string; pos: string; definition: string; example: string }>) => {
        if (data.length > 0) {
          const idx = getDayOfYear() % data.length;
          const w = data[idx];
          setWordData({ word: w.word, pos: w.pos, definition: w.definition, example: w.example });
        }
      })
      .catch(() => {})
      .finally(() => setWotdLoading(false));
  }, []);

  if (wotdLoading) {
    return (
      <View style={[styles.wotdCard, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "center", justifyContent: "center", minHeight: 80 }]}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (!wordData) return null;
  const word = { word: wordData.word, pos: wordData.pos, def: wordData.definition, example: wordData.example };

  return (
    <View style={[styles.wotdCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.wotdHeader}>
        <View style={styles.wotdHeaderLeft}>
          <Feather name="star" size={14} color="#BA7517" />
          <Text style={[styles.wotdLabel, { color: "#BA7517" }]}>Palavra do Dia</Text>
        </View>
        <Pressable onPress={() => router.push("/vocab")} style={styles.wotdLink}>
          <Text style={[styles.wotdLinkText, { color: colors.primary }]}>Ver vocabulário</Text>
        </Pressable>
      </View>
      <View style={styles.wotdBody}>
        <Text style={[styles.wotdWord, { color: colors.text }]}>{word.word}</Text>
        <View style={[styles.wotdPosBadge, { backgroundColor: "#BA751718" }]}>
          <Text style={[styles.wotdPos, { color: "#BA7517" }]}>{word.pos}</Text>
        </View>
      </View>
      <Text style={[styles.wotdDef, { color: colors.text }]}>{word.def}</Text>
      <View style={[styles.wotdExampleWrap, { borderLeftColor: colors.primary, backgroundColor: colors.infoBg }]}>
        <Text style={[styles.wotdExample, { color: colors.mutedForeground }]}>
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>"</Text>
          {word.example}
          <Text style={{ fontFamily: "Inter_600SemiBold", color: colors.text }}>"</Text>
        </Text>
      </View>
    </View>
  );
}

function DaysUntilExam({ examDate }: { examDate: string | null }) {
  const colors = useColors();
  if (!examDate) return null;
  const diff = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
  if (diff < 0) return null;
  return (
    <View style={[styles.examBanner, { backgroundColor: colors.infoBg, borderColor: colors.primary }]}>
      <Feather name="clock" size={14} color={colors.primary} />
      <Text style={[styles.examBannerText, { color: colors.primary }]}>
        {diff === 0 ? "Prova hoje!" : `${diff} dias para a prova`}
      </Text>
    </View>
  );
}

function StreakCard({ streak, best }: { streak: number; best: number }) {
  const colors = useColors();
  return (
    <View style={[styles.streakCard, { backgroundColor: colors.primary }]}>
      <View style={styles.streakRow}>
        <View>
          <Text style={styles.streakLabel}>Sequência atual</Text>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakUnit}>dias</Text>
        </View>
        <View style={styles.streakDivider} />
        <View>
          <Text style={styles.streakLabel}>Melhor sequência</Text>
          <Text style={styles.streakNumber}>{best}</Text>
          <Text style={styles.streakUnit}>dias</Text>
        </View>
        <View style={styles.streakIcon}>
          <Feather name="zap" size={36} color="rgba(255,255,255,0.3)" />
        </View>
      </View>
    </View>
  );
}

function AICreditsBar({ used, total }: { used: number; total: number }) {
  const colors = useColors();
  const pct = total > 0 ? Math.min(1, used / total) : 0;
  const remaining = Math.max(0, total - used);
  return (
    <View style={[styles.creditsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.creditsHeader}>
        <View style={styles.creditsLeft}>
          <Feather name="cpu" size={14} color={colors.primary} />
          <Text style={[styles.creditsTitle, { color: colors.text }]}>Créditos IA</Text>
        </View>
        <Text style={[styles.creditsCount, { color: remaining === 0 ? colors.destructive : colors.primary }]}>
          {remaining}/{total}
        </Text>
      </View>
      <View style={[styles.creditsTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.creditsFill, { width: `${pct * 100}%` as any, backgroundColor: remaining === 0 ? colors.destructive : colors.primary }]} />
      </View>
      {remaining === 0 && (
        <Pressable onPress={() => router.push("/profile")} style={styles.upgradeBtn}>
          <Text style={[styles.upgradeText, { color: colors.primary }]}>Assinar Premium para ilimitado</Text>
        </Pressable>
      )}
    </View>
  );
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, attempts } = useApp();

  const recentAttempts = useMemo(() => attempts.slice(0, 3), [attempts]);
  const avgScore = useMemo(() => {
    if (attempts.length === 0) return null;
    return (attempts.reduce((s, a) => s + a.overallScore, 0) / attempts.length).toFixed(1);
  }, [attempts]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>Olá,</Text>
          <Text style={[styles.userName, { color: colors.text }]}>
            {profile.name || "Estudante"}
          </Text>
          <Text style={[styles.level, { color: colors.primary }]}>
            {LEVEL_LABELS[profile.level]}
          </Text>
        </View>
        <Pressable
          onPress={() => router.push("/profile")}
          style={[styles.avatar, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.avatarText}>
            {(profile.name || "E")[0].toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <DaysUntilExam examDate={profile.examDate} />
      <StreakCard streak={profile.streakDays} best={profile.bestStreak} />
      <AICreditsBar used={profile.aiCreditsUsed} total={profile.aiCreditsTotal} />

      <WordOfTheDay />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Acesso rápido</Text>
      <View style={styles.quickGrid}>
        {QUICK_ACTIONS.map((a) => (
          <Pressable
            key={a.label}
            style={({ pressed }) => [
              styles.quickCard,
              { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={() => router.push(a.route as any)}
          >
            <View style={[styles.quickIcon, { backgroundColor: a.color + "18" }]}>
              <Feather name={a.icon} size={22} color={a.color} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.text }]}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {avgScore && (
        <Pressable
          style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push("/progress")}
        >
          <View style={styles.statsTitleRow}>
            <Text style={[styles.statsTitle, { color: colors.text }]}>Seu progresso</Text>
            <View style={styles.statsChevron}>
              <Text style={[styles.statsViewAll, { color: colors.primary }]}>Ver análise</Text>
              <Feather name="chevron-right" size={14} color={colors.primary} />
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.primary }]}>{attempts.length}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Práticas</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>{avgScore}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Média</Text>
            </View>
            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: colors.purple }]}>{profile.streakDays}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Sequência</Text>
            </View>
          </View>
        </Pressable>
      )}

      {recentAttempts.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Práticas recentes</Text>
          {recentAttempts.map((a) => (
            <View key={a.id} style={[styles.attemptCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.attemptLeft}>
                <Text style={[styles.attemptTask, { color: colors.text }]}>{a.taskType}</Text>
                <Text style={[styles.attemptDate, { color: colors.mutedForeground }]}>
                  {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                </Text>
              </View>
              <View style={[styles.scorePill, {
                backgroundColor: a.overallScore >= 3 ? colors.successBg : a.overallScore >= 2 ? colors.warningBg : colors.errorBg
              }]}>
                <Text style={[styles.scoreText, {
                  color: a.overallScore >= 3 ? colors.success : a.overallScore >= 2 ? colors.warning : colors.destructive
                }]}>
                  {a.overallScore.toFixed(1)}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {attempts.length === 0 && (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="edit-3" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Comece a praticar</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Faça sua primeira prática e receba avaliação da IA
          </Text>
          <Pressable
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/practice")}
          >
            <Text style={styles.startBtnText}>Começar agora</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  greeting: { fontSize: 13, fontFamily: "Inter_400Regular" },
  userName: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 2 },
  level: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 18, fontFamily: "Inter_700Bold" },
  examBanner: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  examBannerText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  streakCard: { borderRadius: 16, padding: 20 },
  streakRow: { flexDirection: "row", alignItems: "center", gap: 20 },
  streakLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" },
  streakNumber: { color: "#fff", fontSize: 40, fontFamily: "Inter_700Bold", lineHeight: 44 },
  streakUnit: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: "Inter_400Regular" },
  streakDivider: { width: 1, height: 50, backgroundColor: "rgba(255,255,255,0.2)" },
  streakIcon: { marginLeft: "auto" as any },
  creditsCard: { borderRadius: 12, padding: 14, borderWidth: 1, gap: 8 },
  creditsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  creditsLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  creditsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  creditsCount: { fontSize: 13, fontFamily: "Inter_700Bold" },
  creditsTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  creditsFill: { height: 6, borderRadius: 3 },
  upgradeBtn: { paddingTop: 4 },
  upgradeText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  wotdCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  wotdHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wotdHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  wotdLabel: { fontSize: 12, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  wotdLink: {},
  wotdLinkText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  wotdBody: { flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" },
  wotdWord: { fontSize: 22, fontFamily: "Inter_700Bold" },
  wotdPosBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  wotdPos: { fontSize: 11, fontFamily: "Inter_500Medium" },
  wotdDef: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  wotdExampleWrap: { borderLeftWidth: 3, paddingLeft: 10, paddingVertical: 4 },
  wotdExample: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19, fontStyle: "italic" },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  quickCard: { width: "30%", flexGrow: 1, borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  quickIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  statsTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statsTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  statsChevron: { flexDirection: "row", alignItems: "center", gap: 2 },
  statsViewAll: { fontSize: 12, fontFamily: "Inter_500Medium" },
  statsRow: { flexDirection: "row", alignItems: "center" },
  statItem: { flex: 1, alignItems: "center", gap: 2 },
  statNumber: { fontSize: 26, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  statDivider: { width: 1, height: 36 },
  attemptCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, padding: 14 },
  attemptLeft: { gap: 2 },
  attemptTask: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  attemptDate: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scorePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 10, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  startBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  startBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
