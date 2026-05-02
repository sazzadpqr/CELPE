import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
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

import { router } from "expo-router";

import { useApp, type PracticeAttempt, type StudyTask } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const RUBRIC_INFO = {
  rubricTema: {
    label: "Tema e Propósito",
    icon: "target" as const,
    color: "#185FA5",
    suggestion: "Pratique leitura crítica e compreensão das tarefas",
    action: "/practice",
  },
  rubricGenero: {
    label: "Gênero Discursivo",
    icon: "file-text" as const,
    color: "#6B21A8",
    suggestion: "Estude os diferentes gêneros textuais do Celpe-Bras",
    action: "/exams",
  },
  rubricCoesao: {
    label: "Coesão e Coerência",
    icon: "link" as const,
    color: "#1D9E75",
    suggestion: "Revise conectivos e organização textual na gramática",
    action: "/grammar",
  },
  rubricGramatica: {
    label: "Gramática e Léxico",
    icon: "code" as const,
    color: "#D85A30",
    suggestion: "Faça exercícios de gramática e vocabulário",
    action: "/grammar",
  },
} as const;

type RubricKey = keyof typeof RUBRIC_INFO;

function WeaknessDashboard({ attempts }: { attempts: PracticeAttempt[] }) {
  const colors = useColors();
  if (attempts.length < 3) return null;

  const last10 = attempts.slice(0, 10);
  const avg = (key: RubricKey) =>
    last10.reduce((s, a) => s + a[key], 0) / last10.length;

  const rubrics: { key: RubricKey; avg: number }[] = (
    ["rubricTema", "rubricGenero", "rubricCoesao", "rubricGramatica"] as RubricKey[]
  ).map((key) => ({ key, avg: avg(key) }));

  rubrics.sort((a, b) => a.avg - b.avg);
  const weakest = rubrics[0];
  const info = RUBRIC_INFO[weakest.key];

  return (
    <View style={[wStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={wStyles.cardHeader}>
        <Feather name="alert-triangle" size={14} color="#BA7517" />
        <Text style={[wStyles.cardTitle, { color: colors.text }]}>Área para melhorar</Text>
      </View>

      <View style={[wStyles.weakArea, { backgroundColor: info.color + "12", borderColor: info.color + "30" }]}>
        <View style={[wStyles.weakIcon, { backgroundColor: info.color + "20" }]}>
          <Feather name={info.icon} size={18} color={info.color} />
        </View>
        <View style={wStyles.weakMeta}>
          <Text style={[wStyles.weakLabel, { color: info.color }]}>{info.label}</Text>
          <Text style={[wStyles.weakScore, { color: colors.mutedForeground }]}>
            Média: {weakest.avg.toFixed(1)} / 5.0
          </Text>
        </View>
      </View>

      <View style={wStyles.barsSection}>
        {rubrics.map(({ key, avg: a }) => {
          const i = RUBRIC_INFO[key];
          return (
            <View key={key} style={wStyles.barRow}>
              <Text style={[wStyles.barLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
                {i.label}
              </Text>
              <View style={[wStyles.barTrack, { backgroundColor: colors.muted }]}>
                <View
                  style={[wStyles.barFill, { width: `${(a / 5) * 100}%` as any, backgroundColor: i.color }]}
                />
              </View>
              <Text style={[wStyles.barNum, { color: i.color }]}>{a.toFixed(1)}</Text>
            </View>
          );
        })}
      </View>

      <Pressable
        style={[wStyles.suggestionBtn, { backgroundColor: info.color + "12", borderColor: info.color + "30" }]}
        onPress={() => router.push(info.action as any)}
      >
        <Text style={[wStyles.suggestionText, { color: info.color }]}>{info.suggestion}</Text>
        <Feather name="arrow-right" size={14} color={info.color} />
      </Pressable>
    </View>
  );
}

const wStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  weakArea: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 10, borderWidth: 1, padding: 12 },
  weakIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  weakMeta: { flex: 1 },
  weakLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  weakScore: { fontSize: 12, fontFamily: "Inter_400Regular" },
  barsSection: { gap: 6 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barLabel: { fontSize: 11, fontFamily: "Inter_400Regular", width: 92 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  barNum: { fontSize: 11, fontFamily: "Inter_700Bold", width: 24, textAlign: "right" },
  suggestionBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  suggestionText: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium", lineHeight: 18 },
});

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const DAY_NAMES_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const TYPE_ICONS: Record<StudyTask["type"], keyof typeof Feather.glyphMap> = {
  practice: "edit-3",
  vocab: "book-open",
  reading: "book",
  listening: "headphones",
  grammar: "code",
};
const TYPE_COLORS: Record<StudyTask["type"], string> = {
  practice: "#185FA5",
  vocab: "#1D9E75",
  reading: "#6B21A8",
  listening: "#BA7517",
  grammar: "#D85A30",
};

export default function StudyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { studyTasks, toggleStudyTask, profile, attempts } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const today = new Date().getDay();

  const tasksByDay = useMemo(() => {
    const map: Record<number, StudyTask[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    studyTasks.forEach((t) => map[t.dayOfWeek].push(t));
    return map;
  }, [studyTasks]);

  const todayTasks = tasksByDay[today] || [];
  const todayCompleted = todayTasks.filter((t) => t.completed).length;
  const weekCompleted = studyTasks.filter((t) => t.completed).length;
  const totalWeekMins = studyTasks.reduce((s, t) => s + t.durationMins, 0);
  const completedMins = studyTasks.filter((t) => t.completed).reduce((s, t) => s + t.durationMins, 0);

  const daysUntilExam = profile.examDate
    ? Math.ceil((new Date(profile.examDate).getTime() - Date.now()) / 86400000)
    : null;

  const handleToggle = async (id: string) => {
    await toggleStudyTask(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>Plano de Estudo</Text>

      <View style={[styles.summaryCard, { backgroundColor: colors.primary }]}>
        <View style={styles.summaryRow}>
          <View>
            <Text style={styles.summaryLabel}>Esta semana</Text>
            <Text style={styles.summaryBig}>{weekCompleted}/{studyTasks.length}</Text>
            <Text style={styles.summarySmall}>tarefas concluídas</Text>
          </View>
          <View style={[styles.summaryDivider]} />
          <View>
            <Text style={styles.summaryLabel}>Tempo de estudo</Text>
            <Text style={styles.summaryBig}>{completedMins}m</Text>
            <Text style={styles.summarySmall}>de {totalWeekMins}m planejados</Text>
          </View>
          {daysUntilExam !== null && daysUntilExam >= 0 && (
            <>
              <View style={[styles.summaryDivider]} />
              <View>
                <Text style={styles.summaryLabel}>Para a prova</Text>
                <Text style={styles.summaryBig}>{daysUntilExam}</Text>
                <Text style={styles.summarySmall}>dias</Text>
              </View>
            </>
          )}
        </View>
        <View style={[styles.progressTrack, { backgroundColor: "rgba(255,255,255,0.25)" }]}>
          <View style={[styles.progressFill, { width: `${studyTasks.length > 0 ? (weekCompleted / studyTasks.length) * 100 : 0}%` as any }]} />
        </View>
      </View>

      <WeaknessDashboard attempts={attempts} />

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Hoje — {DAY_NAMES_FULL[today]}</Text>

      {todayTasks.length === 0 ? (
        <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="coffee" size={24} color={colors.mutedForeground} />
          <Text style={[styles.emptyDayText, { color: colors.mutedForeground }]}>Sem tarefas hoje — descanse ou revise!</Text>
        </View>
      ) : (
        <View style={styles.taskGroup}>
          {todayTasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => handleToggle(task.id)}
              style={[styles.taskCard, { backgroundColor: colors.card, borderColor: task.completed ? colors.accent : colors.border }]}
            >
              <View style={[styles.taskCheck, { borderColor: task.completed ? colors.accent : colors.border, backgroundColor: task.completed ? colors.accent : "transparent" }]}>
                {task.completed && <Feather name="check" size={12} color="#fff" />}
              </View>
              <View style={[styles.taskIcon, { backgroundColor: TYPE_COLORS[task.type] + "18" }]}>
                <Feather name={TYPE_ICONS[task.type]} size={16} color={TYPE_COLORS[task.type]} />
              </View>
              <View style={styles.taskMeta}>
                <Text style={[styles.taskTitle, { color: task.completed ? colors.mutedForeground : colors.text, textDecorationLine: task.completed ? "line-through" : "none" }]}>
                  {task.title}
                </Text>
                <Text style={[styles.taskDuration, { color: colors.mutedForeground }]}>{task.durationMins} min</Text>
              </View>
            </Pressable>
          ))}
          <Text style={[styles.todayProgress, { color: colors.mutedForeground }]}>
            {todayCompleted}/{todayTasks.length} concluído{todayCompleted !== 1 ? "s" : ""} hoje
          </Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Semana completa</Text>

      {[1, 2, 3, 4, 5, 6, 0].map((day) => {
        const dayTasks = tasksByDay[day] || [];
        const done = dayTasks.filter((t) => t.completed).length;
        const isToday = day === today;
        return (
          <View key={day} style={[styles.dayBlock, { backgroundColor: colors.card, borderColor: isToday ? colors.primary : colors.border, borderWidth: isToday ? 2 : 1 }]}>
            <View style={styles.dayHeader}>
              <Text style={[styles.dayName, { color: isToday ? colors.primary : colors.text }]}>
                {DAY_NAMES_FULL[day]}
                {isToday ? " (Hoje)" : ""}
              </Text>
              <Text style={[styles.dayCount, { color: done === dayTasks.length && dayTasks.length > 0 ? colors.accent : colors.mutedForeground }]}>
                {done}/{dayTasks.length}
              </Text>
            </View>
            {dayTasks.length === 0 ? (
              <Text style={[styles.noTasks, { color: colors.mutedForeground }]}>Descanso</Text>
            ) : (
              dayTasks.map((t) => (
                <View key={t.id} style={styles.miniTask}>
                  <Feather name={TYPE_ICONS[t.type]} size={12} color={TYPE_COLORS[t.type]} />
                  <Text style={[styles.miniTaskText, { color: t.completed ? colors.mutedForeground : colors.text, textDecorationLine: t.completed ? "line-through" : "none" }]}>
                    {t.title}
                  </Text>
                  <Text style={[styles.miniTaskDur, { color: colors.mutedForeground }]}>{t.durationMins}m</Text>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  summaryCard: { borderRadius: 16, padding: 20, gap: 14 },
  summaryRow: { flexDirection: "row", gap: 16, alignItems: "center" },
  summaryLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryBig: { color: "#fff", fontSize: 28, fontFamily: "Inter_700Bold" },
  summarySmall: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" },
  summaryDivider: { width: 1, height: 44, backgroundColor: "rgba(255,255,255,0.2)" },
  progressTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: "#fff", borderRadius: 3 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  taskGroup: { gap: 8 },
  taskCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14 },
  taskCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  taskIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  taskMeta: { flex: 1 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  taskDuration: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  todayProgress: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 4 },
  emptyDay: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", gap: 8 },
  emptyDayText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dayBlock: { borderRadius: 14, padding: 14, gap: 8 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dayCount: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  noTasks: { fontSize: 13, fontFamily: "Inter_400Regular" },
  miniTask: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniTaskText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  miniTaskDur: { fontSize: 11, fontFamily: "Inter_400Regular" },
});
