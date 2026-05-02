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

// ─── Activity Heatmap ──────────────────────────────────────────────────────────

function ActivityHeatmap({ attempts }: { attempts: PracticeAttempt[] }) {
  const colors = useColors();

  const { days, weeks } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Build a Set of date strings that had at least one attempt
    const datesWithPractice: Map<string, number> = new Map();
    attempts.forEach((a) => {
      const d = new Date(a.createdAt);
      d.setHours(0, 0, 0, 0);
      const key = d.toISOString().slice(0, 10);
      datesWithPractice.set(key, (datesWithPractice.get(key) ?? 0) + 1);
    });

    // Go back 34 days from today (5 weeks × 7 days - 1)
    const start = new Date(today);
    start.setDate(start.getDate() - 34);

    const allDays: { date: Date; count: number; key: string }[] = [];
    for (let i = 0; i <= 34; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      allDays.push({ date: d, count: datesWithPractice.get(key) ?? 0, key });
    }

    // Group into weeks
    const weeks: typeof allDays[] = [];
    for (let w = 0; w < 5; w++) {
      weeks.push(allDays.slice(w * 7, w * 7 + 7));
    }

    return { days: allDays, weeks };
  }, [attempts]);

  const activeDays = days.filter((d) => d.count > 0).length;
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  const cellColor = (count: number) => {
    if (count === 0) return colors.muted;
    if (count === 1) return "#86EFAC";
    if (count >= 2) return "#22C55E";
    return colors.muted;
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.heatmapTitleRow}>
        <Text style={[styles.cardTitle, { color: colors.text }]}>Calendário de Atividade</Text>
        <View style={[styles.activeBadge, { backgroundColor: colors.successBg }]}>
          <Text style={[styles.activeBadgeText, { color: colors.success }]}>{activeDays} dias ativos</Text>
        </View>
      </View>
      <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>Últimas 5 semanas</Text>

      {/* Day labels */}
      <View style={styles.heatmapDayRow}>
        {dayNames.map((d) => (
          <Text key={d} style={[styles.heatmapDayLabel, { color: colors.mutedForeground }]}>{d}</Text>
        ))}
      </View>

      {/* Weeks grid */}
      <View style={{ gap: 4 }}>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.heatmapWeek}>
            {week.map((day, di) => {
              const isToday = day.date.toISOString().slice(0, 10) === new Date().toISOString().slice(0, 10);
              return (
                <View
                  key={di}
                  style={[
                    styles.heatmapCell,
                    { backgroundColor: cellColor(day.count) },
                    isToday && { borderWidth: 1.5, borderColor: colors.primary },
                  ]}
                />
              );
            })}
          </View>
        ))}
      </View>

      {/* Legend */}
      <View style={styles.heatmapLegend}>
        <Text style={[styles.heatmapLegendLabel, { color: colors.mutedForeground }]}>Menos</Text>
        {[colors.muted, "#BBF7D0", "#86EFAC", "#22C55E"].map((c, i) => (
          <View key={i} style={[styles.heatmapLegendCell, { backgroundColor: c }]} />
        ))}
        <Text style={[styles.heatmapLegendLabel, { color: colors.mutedForeground }]}>Mais</Text>
      </View>
    </View>
  );
}

// ─── Score Trend ───────────────────────────────────────────────────────────────

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

// ─── Main Screen ───────────────────────────────────────────────────────────────

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
          <Pressable style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={() => router.push("/practice")}>
            <Text style={styles.startBtnText}>Começar a praticar</Text>
          </Pressable>
        </View>
      ) : (
        <>
          {/* Summary cards */}
          <View style={styles.summaryRow}>
            {[
              { label: "Práticas", value: String(attempts.length), color: colors.primary },
              { label: "Média", value: stats!.avg.toFixed(1), color: scoreColor(stats!.avg, colors) },
              { label: "Melhor", value: stats!.best.toFixed(1), color: colors.success },
              { label: "Esta semana", value: String(stats!.thisWeek), color: colors.purple },
            ].map((item) => (
              <View key={item.label} style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.summaryValue, { color: item.color }]}>{item.value}</Text>
                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Heatmap */}
          <ActivityHeatmap attempts={attempts} />

          {/* Score trend */}
          <ScoreTrend attempts={attempts} />

          {/* Rubric breakdown */}
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
              const strongest = rubrics.reduce((a, b) => (a.val > b.val ? a : b));
              return (
                <View style={{ gap: 8 }}>
                  <View style={[styles.insightBadge, { backgroundColor: colors.errorBg, borderColor: colors.destructive + "30" }]}>
                    <Feather name="target" size={13} color={colors.destructive} />
                    <Text style={[styles.insightText, { color: colors.destructive }]}>
                      Priorize <Text style={{ fontFamily: "Inter_700Bold" }}>{weakest.name}</Text> — {weakest.val.toFixed(1)}/5.0 · maior gap
                    </Text>
                  </View>
                  <View style={[styles.insightBadge, { backgroundColor: colors.successBg, borderColor: colors.success + "30" }]}>
                    <Feather name="star" size={13} color={colors.success} />
                    <Text style={[styles.insightText, { color: colors.success }]}>
                      Ponto forte: <Text style={{ fontFamily: "Inter_700Bold" }}>{strongest.name}</Text> — {strongest.val.toFixed(1)}/5.0
                    </Text>
                  </View>
                </View>
              );
            })()}
          </View>

          {/* Task distribution */}
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

          {/* Full history */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Histórico completo</Text>
            {attempts.map((a) => (
              <View key={a.id} style={[styles.historyRow, { borderBottomColor: colors.border }]}>
                <View style={styles.historyLeft}>
                  <Text style={[styles.historyTask, { color: colors.text }]}>{a.taskType}</Text>
                  <Text style={[styles.historyDate, { color: colors.mutedForeground }]}>
                    {new Date(a.createdAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                  </Text>
                </View>
                <View style={styles.historyRubrics}>
                  {[a.rubricTema, a.rubricGenero, a.rubricCoesao, a.rubricGramatica].map((r, i) => (
                    <View key={i} style={[styles.rubricDot, { backgroundColor: scoreColor(r, colors) + "30" }]}>
                      <Text style={[styles.rubricDotText, { color: scoreColor(r, colors) }]}>{r.toFixed(0)}</Text>
                    </View>
                  ))}
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
  summaryValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryLabel: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: -6 },
  // Heatmap
  heatmapTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  activeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  activeBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  heatmapDayRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 0 },
  heatmapDayLabel: { fontSize: 9, fontFamily: "Inter_500Medium", width: "13%", textAlign: "center" },
  heatmapWeek: { flexDirection: "row", justifyContent: "space-between", gap: 3 },
  heatmapCell: { flex: 1, aspectRatio: 1, borderRadius: 3 },
  heatmapLegend: { flexDirection: "row", alignItems: "center", gap: 4, justifyContent: "flex-end" },
  heatmapLegendLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  heatmapLegendCell: { width: 12, height: 12, borderRadius: 2 },
  // Trend
  chartWrap: { flexDirection: "row", gap: 6, height: 120, alignItems: "flex-end" },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barScore: { fontSize: 9, fontFamily: "Inter_700Bold" },
  barArea: { flex: 1, width: "100%", flexDirection: "column" },
  bar: { width: "100%" },
  barLabel: { fontSize: 9, fontFamily: "Inter_400Regular" },
  trendBadge: { flexDirection: "row", alignItems: "center", gap: 6, padding: 8, borderRadius: 8 },
  trendText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  // Rubrics
  rubricsWrap: { gap: 10 },
  rubricRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rubricLabel: { width: 68, fontSize: 12, fontFamily: "Inter_500Medium" },
  rubricTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  rubricFill: { height: 8, borderRadius: 4 },
  rubricValue: { width: 28, fontSize: 12, fontFamily: "Inter_700Bold", textAlign: "right" },
  insightBadge: { flexDirection: "row", alignItems: "center", gap: 6, padding: 10, borderRadius: 8, borderWidth: 1 },
  insightText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 17 },
  // Tasks
  taskList: { gap: 10 },
  taskRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  taskLabel: { width: 90, fontSize: 12, fontFamily: "Inter_500Medium" },
  taskTrack: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  taskFill: { height: 8, borderRadius: 4 },
  taskCount: { width: 26, fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "right" },
  // History
  historyRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, borderBottomWidth: 1 },
  historyLeft: { flex: 1, gap: 2 },
  historyTask: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  historyDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historyRubrics: { flexDirection: "row", gap: 3 },
  rubricDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  rubricDotText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  scorePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16 },
  scoreText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  // Empty
  emptyCard: { borderRadius: 16, borderWidth: 1, padding: 28, alignItems: "center", gap: 10, marginTop: 8 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  startBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  startBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
