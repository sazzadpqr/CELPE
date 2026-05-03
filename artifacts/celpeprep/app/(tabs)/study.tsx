import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useEffect, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type PracticeAttempt, type StudyTask } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function getApiUrl(path: string) {
  const domain = process.env["EXPO_PUBLIC_DOMAIN"];
  return domain ? `https://${domain}${path}` : path;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DAY_NAMES_FULL = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const DAY_NAMES_SHORT = ["D", "S", "T", "Q", "Q", "S", "S"];

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
const TYPE_ROUTES: Record<StudyTask["type"], string> = {
  practice: "/practice",
  vocab: "/vocab",
  reading: "/library",
  listening: "/listening",
  grammar: "/grammar",
};

type QuickAction = { id: string; label: string; icon: string; color: string; route: string; desc: string; order: number; active: boolean };

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: "practice",  label: "Praticar",    icon: "edit-3",     color: "#185FA5", route: "/practice",  desc: "Tarefas escritas",    order: 0, active: true },
  { id: "grammar",   label: "Gramática",   icon: "code",       color: "#D85A30", route: "/grammar",   desc: "Exercícios e regras", order: 1, active: true },
  { id: "vocab",     label: "Vocabulário", icon: "book-open",  color: "#1D9E75", route: "/vocab",     desc: "Flashcards SRS",      order: 2, active: true },
  { id: "oral",      label: "Oral",        icon: "mic",        color: "#7c3aed", route: "/oral",      desc: "Prática de fala",     order: 3, active: true },
  { id: "listening", label: "Escuta",      icon: "headphones", color: "#BA7517", route: "/listening", desc: "Áudios e questões",   order: 4, active: true },
  { id: "exams",     label: "Simulados",   icon: "clipboard",  color: "#DC2626", route: "/exams",     desc: "Provas anteriores",   order: 5, active: true },
];

const DEFAULT_STUDY_TIPS = [
  "Leia textos autênticos em português todos os dias — jornais, blogs, artigos.",
  "Grave-se falando português e ouça para identificar pontos a melhorar.",
  "Pratique escrever em diferentes gêneros: e-mail, carta, artigo de opinião.",
  "Estude conectivos e operadores argumentativos — são essenciais no Celpe-Bras.",
  "Faça uma redação completa toda semana e revise com o critério do exame.",
  "Assista a programas de TV ou vídeos em português com foco na entonação.",
  "Pratique responder às tarefas no tempo real da prova (90 min total).",
  "Estude temas recorrentes do Celpe-Bras: meio ambiente, tecnologia, cidadania.",
];

const RUBRIC_INFO = {
  rubricTema: { label: "Tema e Propósito", icon: "target" as const, color: "#185FA5", action: "/practice" },
  rubricGenero: { label: "Gênero Discursivo", icon: "file-text" as const, color: "#6B21A8", action: "/exams" },
  rubricCoesao: { label: "Coesão e Coerência", icon: "link" as const, color: "#1D9E75", action: "/grammar" },
  rubricGramatica: { label: "Gramática e Léxico", icon: "code" as const, color: "#D85A30", action: "/grammar" },
} as const;
type RubricKey = keyof typeof RUBRIC_INFO;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StreakRing({ streak, dailyGoalMins, completedMins }: { streak: number; dailyGoalMins: number; completedMins: number }) {
  const colors = useColors();
  const pct = Math.min(1, dailyGoalMins > 0 ? completedMins / dailyGoalMins : 0);
  const isOnFire = streak > 0;

  return (
    <View style={ringStyles.wrap}>
      <View style={[ringStyles.ringOuter, { borderColor: isOnFire ? "#f97316" : colors.border }]}>
        <View style={[ringStyles.ringInner, { backgroundColor: colors.background }]}>
          <Text style={ringStyles.ringIcon}>{isOnFire ? "🔥" : "📚"}</Text>
          <Text style={[ringStyles.ringNum, { color: isOnFire ? "#f97316" : colors.text }]}>{streak}</Text>
          <Text style={[ringStyles.ringLabel, { color: colors.mutedForeground }]}>dias</Text>
        </View>
      </View>
      <View style={[ringStyles.goalBar, { backgroundColor: colors.muted }]}>
        <View style={[ringStyles.goalFill, { width: `${pct * 100}%` as any, backgroundColor: pct >= 1 ? "#22c55e" : colors.primary }]} />
      </View>
      <Text style={[ringStyles.goalText, { color: colors.mutedForeground }]}>
        {completedMins}/{dailyGoalMins}m hoje
      </Text>
    </View>
  );
}

const ringStyles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  ringOuter: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  ringInner: { width: 68, height: 68, borderRadius: 34, alignItems: "center", justifyContent: "center", gap: 0 },
  ringIcon: { fontSize: 20, lineHeight: 24 },
  ringNum: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 26 },
  ringLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  goalBar: { width: 80, height: 4, borderRadius: 2, overflow: "hidden" },
  goalFill: { height: 4, borderRadius: 2 },
  goalText: { fontSize: 11, fontFamily: "Inter_400Regular" },
});

function ExamCountdown({ examDate, onSet }: { examDate: string | null; onSet: () => void }) {
  const colors = useColors();
  if (!examDate) {
    return (
      <Pressable style={[cdStyles.setDate, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onSet}>
        <Feather name="calendar" size={16} color={colors.primary} />
        <Text style={[cdStyles.setDateText, { color: colors.text }]}>Definir data da prova</Text>
        <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
      </Pressable>
    );
  }
  const days = Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return null;
  const isUrgent = days <= 14;
  const isClose = days <= 30;
  const bg = isUrgent ? "#DC2626" : isClose ? "#D97706" : colors.primary;
  return (
    <View style={[cdStyles.countdown, { backgroundColor: bg }]}>
      <Feather name="clock" size={16} color="#fff" />
      <View style={{ flex: 1 }}>
        <Text style={cdStyles.countdownDays}>{days} dias para o Celpe-Bras</Text>
        <Text style={cdStyles.countdownDate}>
          {new Date(examDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
        </Text>
      </View>
      {isUrgent && <Text style={cdStyles.urgentBadge}>Urgente!</Text>}
    </View>
  );
}

const cdStyles = StyleSheet.create({
  setDate: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 12, borderWidth: 1, padding: 14 },
  setDateText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  countdown: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 16 },
  countdownDays: { color: "#fff", fontSize: 15, fontFamily: "Inter_700Bold" },
  countdownDate: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  urgentBadge: { backgroundColor: "rgba(255,255,255,0.25)", color: "#fff", fontSize: 11, fontFamily: "Inter_700Bold", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});

function WeaknessCard({ attempts }: { attempts: PracticeAttempt[] }) {
  const colors = useColors();
  if (attempts.length < 2) return null;

  const last10 = attempts.slice(0, 10);
  const rubrics = (["rubricTema", "rubricGenero", "rubricCoesao", "rubricGramatica"] as RubricKey[]).map((key) => ({
    key,
    avg: last10.reduce((s, a) => s + a[key], 0) / last10.length,
  })).sort((a, b) => a.avg - b.avg);

  const weakest = rubrics[0]!;
  const info = RUBRIC_INFO[weakest.key];
  const score = weakest.avg;
  const all = rubrics;

  return (
    <View style={[weakStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={weakStyles.header}>
        <Feather name="trending-up" size={14} color={colors.primary} />
        <Text style={[weakStyles.title, { color: colors.text }]}>Análise de Desempenho</Text>
        <Text style={[weakStyles.sub, { color: colors.mutedForeground }]}>{last10.length} avaliações</Text>
      </View>

      <View style={weakStyles.bars}>
        {all.map(({ key, avg }) => {
          const i = RUBRIC_INFO[key];
          const pct = (avg / 5) * 100;
          return (
            <View key={key} style={weakStyles.barRow}>
              <View style={[weakStyles.barIcon, { backgroundColor: i.color + "15" }]}>
                <Feather name={i.icon} size={12} color={i.color} />
              </View>
              <Text style={[weakStyles.barLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{i.label}</Text>
              <View style={[weakStyles.barTrack, { backgroundColor: colors.muted }]}>
                <View style={[weakStyles.barFill, { width: `${pct}%` as any, backgroundColor: i.color }]} />
              </View>
              <Text style={[weakStyles.barNum, { color: i.color }]}>{avg.toFixed(1)}</Text>
            </View>
          );
        })}
      </View>

      <Pressable
        style={[weakStyles.cta, { backgroundColor: info.color + "12", borderColor: info.color + "30" }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(info.action as any); }}
      >
        <View style={[weakStyles.ctaIcon, { backgroundColor: info.color + "20" }]}>
          <Feather name={info.icon} size={14} color={info.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[weakStyles.ctaTitle, { color: info.color }]}>Foco: {info.label}</Text>
          <Text style={[weakStyles.ctaScore, { color: colors.mutedForeground }]}>Média {score.toFixed(1)}/5.0 — clique para praticar</Text>
        </View>
        <Feather name="arrow-right" size={14} color={info.color} />
      </Pressable>
    </View>
  );
}

const weakStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1, fontSize: 14, fontFamily: "Inter_700Bold" },
  sub: { fontSize: 11, fontFamily: "Inter_400Regular" },
  bars: { gap: 8 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  barIcon: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  barLabel: { fontSize: 11, fontFamily: "Inter_400Regular", width: 88 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, borderRadius: 3 },
  barNum: { fontSize: 11, fontFamily: "Inter_700Bold", width: 26, textAlign: "right" },
  cta: { flexDirection: "row", alignItems: "center", gap: 10, borderRadius: 10, borderWidth: 1, padding: 12 },
  ctaIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  ctaTitle: { fontSize: 13, fontFamily: "Inter_700Bold" },
  ctaScore: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 1 },
});

function WeekHeatmap({ tasksByDay, today }: { tasksByDay: Record<number, StudyTask[]>; today: number }) {
  const colors = useColors();
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <View style={[hmStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[hmStyles.title, { color: colors.text }]}>Visão da Semana</Text>
      <View style={hmStyles.days}>
        {order.map((day) => {
          const tasks = tasksByDay[day] || [];
          const done = tasks.filter(t => t.completed).length;
          const isToday = day === today;
          const allDone = tasks.length > 0 && done === tasks.length;
          const partial = done > 0 && done < tasks.length;
          const noTasks = tasks.length === 0;

          let bg = colors.muted;
          let textColor = colors.mutedForeground;
          if (isToday) { bg = colors.primary + "20"; textColor = colors.primary; }
          if (allDone) { bg = "#22c55e"; textColor = "#fff"; }
          else if (partial) { bg = colors.primary + "40"; textColor = colors.primary; }

          return (
            <View key={day} style={hmStyles.dayCol}>
              <Text style={[hmStyles.dayLabel, { color: isToday ? colors.primary : colors.mutedForeground }]}>
                {DAY_NAMES_SHORT[day]}
              </Text>
              <View style={[hmStyles.dayChip, { backgroundColor: bg, borderColor: isToday ? colors.primary : "transparent", borderWidth: isToday ? 1.5 : 0 }]}>
                {noTasks ? (
                  <Feather name="minus" size={10} color={colors.mutedForeground} />
                ) : allDone ? (
                  <Feather name="check" size={11} color="#fff" />
                ) : (
                  <Text style={[hmStyles.chipCount, { color: textColor }]}>{done}/{tasks.length}</Text>
                )}
              </View>
              {isToday && <View style={[hmStyles.todayDot, { backgroundColor: colors.primary }]} />}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const hmStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
  title: { fontSize: 14, fontFamily: "Inter_700Bold" },
  days: { flexDirection: "row", justifyContent: "space-between" },
  dayCol: { alignItems: "center", gap: 5 },
  dayLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  dayChip: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  chipCount: { fontSize: 10, fontFamily: "Inter_700Bold" },
  todayDot: { width: 5, height: 5, borderRadius: 3 },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function StudyScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { studyTasks, toggleStudyTask, loadStudyTasksFromServer, profile, attempts, updateProfile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [quickActions, setQuickActions] = useState<QuickAction[]>(DEFAULT_QUICK_ACTIONS);
  const [studyTips, setStudyTips] = useState<string[]>(DEFAULT_STUDY_TIPS);

  useEffect(() => {
    const fetchServerContent = async () => {
      try {
        const [tasksRes, tipsRes, actionsRes] = await Promise.allSettled([
          fetch(getApiUrl("/api/content/study-tasks")),
          fetch(getApiUrl("/api/content/study-tips")),
          fetch(getApiUrl("/api/content/quick-actions")),
        ]);

        if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
          const tasks = await tasksRes.value.json();
          if (Array.isArray(tasks) && tasks.length > 0) loadStudyTasksFromServer(tasks);
        }
        if (tipsRes.status === "fulfilled" && tipsRes.value.ok) {
          const tips = await tipsRes.value.json() as Array<{ text: string }>;
          if (Array.isArray(tips) && tips.length > 0) setStudyTips(tips.map(t => t.text));
        }
        if (actionsRes.status === "fulfilled" && actionsRes.value.ok) {
          const actions = await actionsRes.value.json();
          if (Array.isArray(actions) && actions.length > 0) setQuickActions(actions);
        }
      } catch {
      }
    };
    fetchServerContent();
  }, []);

  const today = new Date().getDay();
  const todayTip = studyTips[new Date().getDate() % studyTips.length]!;

  const tasksByDay = useMemo(() => {
    const map: Record<number, StudyTask[]> = {};
    for (let d = 0; d < 7; d++) map[d] = [];
    studyTasks.forEach((t) => map[t.dayOfWeek].push(t));
    return map;
  }, [studyTasks]);

  const todayTasks = tasksByDay[today] || [];
  const todayCompleted = todayTasks.filter(t => t.completed).length;
  const weekCompleted = studyTasks.filter(t => t.completed).length;
  const completedMins = studyTasks.filter(t => t.completed && t.dayOfWeek === today).reduce((s, t) => s + t.durationMins, 0);

  const handleToggle = async (id: string) => {
    await toggleStudyTask(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleTaskPress = (task: StudyTask) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(TYPE_ROUTES[task.type] as any);
  };

  const handleSetExamDate = () => {
    Alert.alert(
      "Data da Prova",
      "Vá até Perfil > Editar Perfil para definir a data do seu exame Celpe-Bras.",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Ir para Perfil", onPress: () => router.push("/(tabs)/profile") },
      ]
    );
  };

  const daysUntilExam = profile.examDate
    ? Math.ceil((new Date(profile.examDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 40 : 110 }]}
      showsVerticalScrollIndicator={false}
    >

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Plano de Estudo</Text>
          <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>{DAY_NAMES_FULL[today]}, {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</Text>
        </View>
        <Pressable
          style={[styles.progressBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/progress"); }}
        >
          <Feather name="bar-chart-2" size={16} color={colors.primary} />
          <Text style={[styles.progressBtnText, { color: colors.primary }]}>Progresso</Text>
        </Pressable>
      </View>

      {/* ── Hero card: streak + summary ── */}
      <View style={[styles.heroCard, { backgroundColor: colors.primary }]}>
        <View style={styles.heroRow}>
          <StreakRing
            streak={profile.streakDays}
            dailyGoalMins={profile.dailyGoalMinutes}
            completedMins={completedMins}
          />
          <View style={[styles.heroDivider, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{weekCompleted}</Text>
              <Text style={styles.heroStatLabel}>tarefas esta semana</Text>
            </View>
            <View style={[styles.heroStatDivider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{todayCompleted}/{todayTasks.length}</Text>
              <Text style={styles.heroStatLabel}>tarefas hoje</Text>
            </View>
            {daysUntilExam !== null && daysUntilExam >= 0 && (
              <>
                <View style={[styles.heroStatDivider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
                <View style={styles.heroStat}>
                  <Text style={[styles.heroStatNum, daysUntilExam <= 14 && { color: "#FCD34D" }]}>{daysUntilExam}d</Text>
                  <Text style={styles.heroStatLabel}>para a prova</Text>
                </View>
              </>
            )}
          </View>
        </View>
        <View style={[styles.heroProgress, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
          <View style={[styles.heroProgressFill, { width: `${studyTasks.length > 0 ? (weekCompleted / studyTasks.length) * 100 : 0}%` as any }]} />
        </View>
        <Text style={styles.heroProgressLabel}>{studyTasks.length > 0 ? Math.round((weekCompleted / studyTasks.length) * 100) : 0}% da semana concluído</Text>
      </View>

      {/* ── Exam countdown ── */}
      <ExamCountdown examDate={profile.examDate} onSet={handleSetExamDate} />

      {/* ── Quick actions ── */}
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Começar agora</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable
              key={action.id}
              style={[styles.quickCard, { backgroundColor: action.color + "10", borderColor: action.color + "30" }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(action.route as any);
              }}
            >
              <View style={[styles.quickIcon, { backgroundColor: action.color + "20" }]}>
                <Feather name={action.icon as keyof typeof Feather.glyphMap} size={20} color={action.color} />
              </View>
              <Text style={[styles.quickLabel, { color: action.color }]}>{action.label}</Text>
              <Text style={[styles.quickDesc, { color: colors.mutedForeground }]} numberOfLines={1}>{action.desc}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* ── Today's plan ── */}
      <View>
        <View style={styles.sectionRow}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Hoje — {DAY_NAMES_FULL[today]}</Text>
          {todayTasks.length > 0 && (
            <View style={[styles.todayBadge, { backgroundColor: todayCompleted === todayTasks.length ? "#22c55e18" : colors.muted }]}>
              <Text style={[styles.todayBadgeText, { color: todayCompleted === todayTasks.length ? "#22c55e" : colors.mutedForeground }]}>
                {todayCompleted}/{todayTasks.length}
              </Text>
            </View>
          )}
        </View>

        {todayTasks.length === 0 ? (
          <View style={[styles.emptyDay, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={styles.emptyEmoji}>☕</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Dia livre!</Text>
            <Text style={[styles.emptyDesc, { color: colors.mutedForeground }]}>Sem tarefas hoje. Descanse ou explore uma atividade acima.</Text>
          </View>
        ) : (
          <View style={styles.taskGroup}>
            {todayTasks.map((task) => {
              const color = TYPE_COLORS[task.type];
              return (
                <View
                  key={task.id}
                  style={[styles.taskCard, {
                    backgroundColor: colors.card,
                    borderColor: task.completed ? "#22c55e40" : colors.border,
                    opacity: task.completed ? 0.75 : 1,
                  }]}
                >
                  <Pressable
                    onPress={() => handleToggle(task.id)}
                    style={[styles.taskCheck, {
                      borderColor: task.completed ? "#22c55e" : colors.border,
                      backgroundColor: task.completed ? "#22c55e" : "transparent",
                    }]}
                    hitSlop={8}
                  >
                    {task.completed && <Feather name="check" size={12} color="#fff" />}
                  </Pressable>
                  <Pressable style={styles.taskBody} onPress={() => handleTaskPress(task)}>
                    <View style={[styles.taskIcon, { backgroundColor: color + "18" }]}>
                      <Feather name={TYPE_ICONS[task.type]} size={16} color={color} />
                    </View>
                    <View style={styles.taskMeta}>
                      <Text style={[styles.taskTitle, { color: task.completed ? colors.mutedForeground : colors.text, textDecorationLine: task.completed ? "line-through" : "none" }]}>
                        {task.title}
                      </Text>
                      <View style={styles.taskSubRow}>
                        <Text style={[styles.taskDuration, { color: colors.mutedForeground }]}>
                          <Feather name="clock" size={10} color={colors.mutedForeground} /> {task.durationMins} min
                        </Text>
                        <View style={[styles.taskTypePill, { backgroundColor: color + "15" }]}>
                          <Text style={[styles.taskTypeText, { color }]}>{task.type}</Text>
                        </View>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
                  </Pressable>
                </View>
              );
            })}
            {todayCompleted === todayTasks.length && todayTasks.length > 0 && (
              <View style={[styles.allDone, { backgroundColor: "#22c55e12", borderColor: "#22c55e30" }]}>
                <Text style={styles.allDoneEmoji}>🎉</Text>
                <Text style={[styles.allDoneText, { color: "#22c55e" }]}>Todas as tarefas de hoje concluídas!</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* ── Weakness analysis ── */}
      <WeaknessCard attempts={attempts} />

      {/* ── Weekly heatmap ── */}
      <WeekHeatmap tasksByDay={tasksByDay} today={today} />

      {/* ── Full week tasks ── */}
      <View>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Plano completo</Text>
        {[1, 2, 3, 4, 5, 6, 0].map((day) => {
          const dayTasks = tasksByDay[day] || [];
          const done = dayTasks.filter(t => t.completed).length;
          const isToday = day === today;
          return (
            <View
              key={day}
              style={[styles.dayBlock, {
                backgroundColor: colors.card,
                borderColor: isToday ? colors.primary : colors.border,
                borderWidth: isToday ? 2 : 1,
                marginBottom: 8,
              }]}
            >
              <View style={styles.dayHeader}>
                <View style={styles.dayHeaderLeft}>
                  {isToday && <View style={[styles.todayDot, { backgroundColor: colors.primary }]} />}
                  <Text style={[styles.dayName, { color: isToday ? colors.primary : colors.text }]}>
                    {DAY_NAMES_FULL[day]}{isToday ? " (Hoje)" : ""}
                  </Text>
                </View>
                <Text style={[styles.dayCount, {
                  color: done === dayTasks.length && dayTasks.length > 0 ? "#22c55e" : colors.mutedForeground
                }]}>
                  {done}/{dayTasks.length}
                </Text>
              </View>
              {dayTasks.length === 0 ? (
                <Text style={[styles.noTasks, { color: colors.mutedForeground }]}>Descanso</Text>
              ) : (
                dayTasks.map((t) => {
                  const color = TYPE_COLORS[t.type];
                  return (
                    <Pressable
                      key={t.id}
                      style={styles.miniTask}
                      onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(TYPE_ROUTES[t.type] as any); }}
                    >
                      <View style={[styles.miniDot, { backgroundColor: color + "25" }]}>
                        <Feather name={TYPE_ICONS[t.type]} size={10} color={color} />
                      </View>
                      <Text style={[styles.miniTaskText, { color: t.completed ? colors.mutedForeground : colors.text, textDecorationLine: t.completed ? "line-through" : "none" }]}>
                        {t.title}
                      </Text>
                      <Text style={[styles.miniTaskDur, { color: colors.mutedForeground }]}>{t.durationMins}m</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
          );
        })}
      </View>

      {/* ── Daily tip ── */}
      <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.tipHeader}>
          <Feather name="sun" size={14} color="#D97706" />
          <Text style={[styles.tipTitle, { color: colors.text }]}>Dica do dia</Text>
        </View>
        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{todayTip}</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 18, gap: 16 },

  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  screenTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  screenSub: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  progressBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  progressBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  heroCard: { borderRadius: 20, padding: 20, gap: 14 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  heroDivider: { width: 1, height: 70, alignSelf: "center" },
  heroStats: { flex: 1, gap: 10 },
  heroStat: { gap: 2 },
  heroStatNum: { color: "#fff", fontSize: 20, fontFamily: "Inter_700Bold" },
  heroStatLabel: { color: "rgba(255,255,255,0.7)", fontSize: 11, fontFamily: "Inter_400Regular" },
  heroStatDivider: { height: 1 },
  heroProgress: { height: 6, borderRadius: 3, overflow: "hidden" },
  heroProgressFill: { height: 6, backgroundColor: "#fff", borderRadius: 3 },
  heroProgressLabel: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },

  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },

  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 8 },
  quickCard: { width: "30.5%", borderRadius: 14, borderWidth: 1, padding: 12, gap: 6, alignItems: "center" },
  quickIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  quickDesc: { fontSize: 10, fontFamily: "Inter_400Regular", textAlign: "center" },

  todayBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  todayBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  taskGroup: { gap: 8, marginTop: 8 },
  taskCard: { flexDirection: "row", alignItems: "center", gap: 0, borderRadius: 14, borderWidth: 1, padding: 12 },
  taskCheck: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center", marginRight: 10, flexShrink: 0 },
  taskBody: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  taskIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  taskMeta: { flex: 1, gap: 3 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  taskSubRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  taskDuration: { fontSize: 11, fontFamily: "Inter_400Regular" },
  taskTypePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  taskTypeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  allDone: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, justifyContent: "center" },
  allDoneEmoji: { fontSize: 18 },
  allDoneText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  emptyDay: { borderRadius: 14, borderWidth: 1, padding: 24, alignItems: "center", gap: 8, marginTop: 8 },
  emptyEmoji: { fontSize: 32 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },

  dayBlock: { borderRadius: 14, padding: 14, gap: 10 },
  dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dayHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayDot: { width: 8, height: 8, borderRadius: 4 },
  dayName: { fontSize: 14, fontFamily: "Inter_700Bold" },
  dayCount: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  noTasks: { fontSize: 13, fontFamily: "Inter_400Regular" },
  miniTask: { flexDirection: "row", alignItems: "center", gap: 8 },
  miniDot: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  miniTaskText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  miniTaskDur: { fontSize: 11, fontFamily: "Inter_400Regular" },

  tipCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  tipHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  tipTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  tipText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
});
