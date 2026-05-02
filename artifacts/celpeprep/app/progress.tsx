import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type PracticeAttempt } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function scoreColor(score: number, colors: ReturnType<typeof import("@/hooks/useColors").useColors>) {
  if (score >= 3.5) return colors.success;
  if (score >= 2.5) return colors.warning;
  return colors.destructive;
}

function ScoreBar({ label, value, max = 5, color }: { label: string; value: number; max?: number; color: string }) {
  const colors = useColors();
  const pct = Math.min(1, value / max);
  return (
    <View style={styles.rubricRow}>
      <Text style={[styles.rubricLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <View style={[styles.rubricTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.rubricFill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={[styles.rubricValue, { color }]}>{value.toFixed(1)}</Text>
    </View>
  );
}

function ScoreTrend({ attempts }: { attempts: PracticeAttempt[] }) {
  const colors = useColors();
  const recent = attempts.slice(0, 10).reverse();
  if (recent.length < 2) return null;
  const max = 5;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>Evolução das notas</Text>
      <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Últimas {recent.length} práticas</Text>
      <View style={styles.chartWrap}>
        {recent.map((a, i) => {
          const h = Math.max(0.08, a.overallScore / max);
          const col = scoreColor(a.overallScore, colors);
          return (
            <View key={a.id} style={styles.barCol}>
              <Text style={[styles.barScore, { color: col }]}>{a.overallScore.toFixed(1)}</Text>
              <View style={styles.barArea}>
                <View style={[styles.bar, { flex: 1 - h, backgroundColor: "transparent" }]} />
                <View style={[styles.bar, { flex: h, backgroundColor: col, borderRadius: 4 }]} />
              </View>
              <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>{i + 1}</Text>
            </View>
          );
        })}
      </View>
      {recent.length >= 3 && (() => {
        const first3 = recent.slice(0, 3).reduce((s, a) => s + a.overallScore, 0) / 3;
        const last3 = recent.slice(-3).reduce((s, a) => s + a.overallScore, 0) / 3;
        const diff = last3 - first3;
        return (
          <View style={[styles.trendBadge, { backgroundColor: diff >= 0 ? colors.successBg : colors.errorBg }]}>
            <Feather name={diff >= 0 ? "trending-up" : "trending-down"} size={13} color={diff >= 0 ? colors.success : colors.destructive} />
            <Text style={[styles.trendText, { color: diff >= 0 ? colors.success : colors.destructive }]}>
              {diff >= 0 ? "+" : ""}{diff.toFixed(1)} pontos vs. início
            </Text>
          </View>
        );
      })()}
    </View>
  );
}

export default function ProgressScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { attempts, profile } = useApp();

  const stats = useMemo(() => {
    if (attempts.length === 0) return null;
    const avg = attempts.reduce((s, a) => s + a.overallScore, 0) / attempts.length;
    const best = Math.max(...attempts.map((a) => a.overallScore));
    const recent10 = attempts.slice(0, 10);
    const avgTema = recent10.reduce((s, a) => s + a.rubricTema, 0) / recent10.length;
    const avgGenero = recent10.reduce((s, a) => s + a.rubricGenero, 0) / recent10.length;
    const avgCoesao = recent10.reduce((s, a) => s + a.rubricCoesao, 0) / recent10.length;
    const avgGramatica = recent10.reduce((s, a) => s + a.rubricGramatica, 0) / recent10.length;

    const taskCounts: Record<string, number> = {};
    attempts.forEach((a) => {
      const key = a.taskType.split(" —")[0];
      taskCounts[key] = (taskCounts[key] || 0) + 1;
    });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const thisWeek = attempts.filter((a) => new Date(a.createdAt) >= weekStart).length;

    return { avg, best, avgTema, avgGenero, avgCoesao, avgGramatica, taskCounts, thisWeek };
  }, [attempts]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={colors.text} />
      </Pressable>
      <Text style={[styles.screenTitle, { color: colors.text }]}>Meu Progresso</Text>
      <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
        Análise detalhada das suas práticas
      </Text>

      {attempts.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="bar-chart-2" size={36} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>Sem dados ainda</Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Faça sua primeira prática para ver as estatísticas aqui.
          </Text>
          <Pressable
            style={[styles.startBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.push("/practice")}
          >
            <Text style={styles.startBtnText}>Começar a praticar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={[styles.summaryRow]}>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryValue, { color: colors.primary }]}>{attempts.length}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Práticas</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryValue, { color: scoreColor(stats!.avg, colors) }]}>
                {stats!.avg.toFixed(1)}
              </Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Média</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryValue, { color: colors.success }]}>{stats!.best.toFixed(1)}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Melhor</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.summaryValue, { color: colors.purple }]}>{stats!.thisWeek}</Text>
              <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>Esta semana</Text>
            </View>
          </View>

          <ScoreTrend attempts={attempts} />

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Desempenho por critério</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Média das últimas 10 práticas</Text>
            <View style={styles.rubricsWrap}>
              <ScoreBar label="Tema" value={stats!.avgTema} color={scoreColor(stats!.avgTema, colors)} />
              <ScoreBar label="Gênero" value={stats!.avgGenero} color={scoreColor(stats!.avgGenero, colors)} />
              <ScoreBar label="Coesão" value={stats!.avgCoesao} color={scoreColor(stats!.avgCoesao, colors)} />
              <ScoreBar label="Gramática" value={stats!.avgGramatica} color={scoreColor(stats!.avgGramatica, colors)} />
            </View>
            {(() => {
              const rubrics = [
                { name: "Tema", val: stats!.avgTema },
                { name: "Gênero", val: stats!.avgGenero },
                { name: "Coesão", val: stats!.avgCoesao },
                { name: "Gramática", val: stats!.avgGramatica },
              ];
              const weakest = rubrics.reduce((a, b) => (a.val < b.val ? a : b));
              return (
                <View style={[styles.insightBadge, { backgroundColor: colors.infoBg, borderColor: colors.primary + "40" }]}>
                  <Feather name="target" size={13} color={colors.primary} />
                  <Text style={[styles.insightText, { color: colors.primary }]}>
                    Foque em <Text style={{ fontFamily: "Inter_700Bold" }}>{weakest.name}</Text> — seu ponto mais fraco
                  </Text>
                </View>
              );
            })()}
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Tarefas praticadas</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Distribuição por tipo</Text>
            <View style={styles.taskList}>
              {Object.entries(stats!.taskCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([task, count]) => {
                  const pct = count / attempts.length;
                  return (
                    <View key={task} style={styles.taskRow}>
                      <Text style={[styles.taskLabel, { color: colors.text }]} numberOfLines={1}>{task}</Text>
                      <View style={[styles.taskTrack, { backgroundColor: colors.muted }]}>
                        <View style={[styles.taskFill, { width: `${pct * 100}%` as any, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.taskCount, { color: colors.mutedForeground }]}>{count}x</Text>
                    </View>
                  );
                })}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Histórico completo</Text>
            {attempts.map((a) => (
              <View
                key={a.id}
                style={[styles.historyRow, { borderBottomColor: colors.border }]}
              >
                <View style={styles.historyLeft}>
                  <Text style={[styles.historyTask, { color: colors.text }]}>{a.taskType}</Text>
                  <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                    {new Date(a.createdAt).toLocaleDateString("pt-BR")}
                  </Text>
                </View>
                <View style={[styles.scorePill, { backgroundColor: scoreColor(a.overallScore, colors) + "20" }]}>
                  <Text style={[styles.scoreText, { color: scoreColor(a.overallScore, colors) }]}>
                    {a.overallScore.toFixed(1)}
                  </Text>
                </View>
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
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  summaryRow: { flexDirection: "row", gap: 10 },
  summaryCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 12, alignItems: "center", gap: 4 },
  summaryValue: { fontSize: 24, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -6 },
  chartWrap: { flexDirection: "row", gap: 6, height: 120, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barScore: { fontSize: 9, fontFamily: "Inter_700Bold" },
  barArea: { flex: 1, width: "100%", flexDirection: "column" },
  bar: { width: "100%" },
  barLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  trendBadge: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8 },
  trendText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  rubricsWrap: { gap: 10 },
  rubricRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rubricLabel: { width: 68, fontSize: 12, fontFamily: "Inter_500Medium" },
  rubricTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  rubricFill: { height: 8, borderRadius: 4 },
  rubricValue: { width: 28, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  insightBadge: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  insightText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  taskList: { gap: 10 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskLabel: { width: 90, fontSize: 12, fontFamily: "Inter_500Medium" },
  taskTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  taskFill: { height: 8, borderRadius: 4 },
  taskCount: { width: 26, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  historyRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1 },
  historyLeft: { gap: 2 },
  historyTask: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  historyDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  scoreText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 10, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  startBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  startBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
