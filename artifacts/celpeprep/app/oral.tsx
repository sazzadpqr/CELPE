import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { GuestGate } from "@/components/GuestGate";

type OralTask = {
  id: string;
  title: string;
  description: string;
  instructions: string[];
  durationSeconds: number;
  icon: string;
  color: string;
};

const FALLBACK_TASKS: OralTask[] = [
  {
    id: "oral1",
    title: "Tarefa Oral 1 — Narrativa",
    description: "Descreva e interprete imagens em sequência, construindo uma narrativa coerente.",
    instructions: [
      "Observe as imagens com atenção antes de começar.",
      "Construa uma narrativa coerente conectando as cenas.",
      "Use conectivos temporais: primeiro, depois, em seguida, por fim.",
      "Demonstre vocabulário variado e precisão gramatical.",
      "Tempo sugerido: 5 minutos.",
    ],
    durationSeconds: 300,
    icon: "image",
    color: "#185FA5",
  },
  {
    id: "oral2",
    title: "Tarefa Oral 2 — Diálogo Situacional",
    description: "Interação com avaliador em situação comunicativa específica.",
    instructions: [
      "Leia atentamente o enunciado da situação.",
      "Mantenha a adequação ao contexto comunicativo.",
      "Use registro formal ou informal conforme indicado.",
      "Demonstre fluência e naturalidade na interação.",
      "Responda plenamente às perguntas do avaliador.",
    ],
    durationSeconds: 300,
    icon: "message-circle",
    color: "#1D9E75",
  },
  {
    id: "oral3",
    title: "Tarefa Oral 3 — Exposição de Ponto de Vista",
    description: "Apresente e defenda seu ponto de vista sobre um tema contemporâneo.",
    instructions: [
      "Leia o tema e organize seus argumentos mentalmente.",
      "Apresente sua posição claramente na abertura.",
      "Desenvolva no mínimo 2 argumentos com exemplos.",
      "Antecipe e refute o ponto de vista contrário.",
      "Conclua retomando sua posição de forma assertiva.",
    ],
    durationSeconds: 300,
    icon: "mic",
    color: "#6B21A8",
  },
  {
    id: "oral4",
    title: "Tarefa Oral 4 — Resolução de Problema",
    description: "Propor soluções para um problema apresentado em texto ou vídeo.",
    instructions: [
      "Identifique claramente o problema apresentado.",
      "Proponha soluções viáveis e justifique cada uma.",
      "Considere diferentes perspectivas e stakeholders.",
      "Use vocabulário técnico adequado ao tema.",
      "Organize sua fala em: problema → causas → soluções → conclusão.",
    ],
    durationSeconds: 300,
    icon: "tool",
    color: "#BA7517",
  },
];

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${pad(m)}:${pad(s)}`;
}

export default function OralSimulatorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [tasks, setTasks] = useState<OralTask[]>(FALLBACK_TASKS);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [phase, setPhase] = useState<"select" | "prep" | "recording" | "done">("select");
  const [selectedTask, setSelectedTask] = useState<OralTask | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [prepRemaining, setPrepRemaining] = useState(60);
  const startedAt = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetch(getApiUrl("/api/content/oral-tasks"))
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data && data.length > 0) setTasks(data); })
      .catch(() => {})
      .finally(() => setLoadingTasks(false));
  }, []);

  const clearTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startPrep = (task: OralTask) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedTask(task);
    setPrepRemaining(60);
    setPhase("prep");
    const start = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const rem = Math.max(0, 60 - elapsed);
      setPrepRemaining(rem);
      if (rem === 0) {
        clearTimer();
        startRecording(task);
      }
    }, 500);
  };

  const startRecording = useCallback((task: OralTask) => {
    clearTimer();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setRemaining(task.durationSeconds);
    startedAt.current = Date.now();
    setPhase("recording");
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt.current) / 1000);
      const rem = Math.max(0, task.durationSeconds - elapsed);
      setRemaining(rem);
      if (rem === 0) {
        clearTimer();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setPhase("done");
      }
    }, 500);
  }, []);

  const skipPrep = () => {
    clearTimer();
    if (selectedTask) startRecording(selectedTask);
  };

  const stopRecording = () => {
    clearTimer();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setPhase("done");
  };

  const reset = () => {
    clearTimer();
    setPhase("select");
    setSelectedTask(null);
  };

  useEffect(() => () => clearTimer(), []);

  const pct = selectedTask ? 1 - remaining / selectedTask.durationSeconds : 0;
  const isWarning = remaining > 0 && remaining <= 60;

  if (profile.isGuest) return <GuestGate feature="Simulador Oral" />;

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
        <Text style={[styles.title, { color: colors.text }]}>Simulador Oral</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Pratique as tarefas orais do Celpe-Bras com timer de 5 minutos e preparação de 1 minuto.
        </Text>

        <View style={[styles.infoCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "40" }]}>
          <Feather name="info" size={14} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.primary }]}>
            Cada tarefa oral tem 1 min de preparação + 5 min de resposta. Grave com o microfone do seu dispositivo para praticar de forma autêntica.
          </Text>
        </View>

        {loadingTasks ? (
          <View style={{ alignItems: "center", paddingVertical: 32 }}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : (
          tasks.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => startPrep(task)}
              style={({ pressed }) => [
                styles.taskCard,
                { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <View style={[styles.taskIcon, { backgroundColor: task.color + "18" }]}>
                <Feather name={task.icon as any} size={22} color={task.color} />
              </View>
              <View style={styles.taskMeta}>
                <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>{task.description}</Text>
                <View style={styles.taskBadges}>
                  <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                    <Feather name="clock" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>1 min prep</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: colors.muted }]}>
                    <Feather name="mic" size={10} color={colors.mutedForeground} />
                    <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                      {Math.floor(task.durationSeconds / 60)} min resposta
                    </Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </Pressable>
          ))
        )}
      </ScrollView>
    );
  }

  if (phase === "prep" && selectedTask) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.phaseHeader, { backgroundColor: "#BA7517" + "15", borderColor: "#BA7517" + "40" }]}>
          <Feather name="eye" size={16} color="#BA7517" />
          <Text style={[styles.phaseLabel, { color: "#BA7517" }]}>Tempo de Preparação</Text>
          <Text style={[styles.prepTimer, { color: "#BA7517" }]}>{pad(0)}:{pad(prepRemaining)}</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>{selectedTask.title}</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Leia as instruções e organize suas ideias antes do tempo acabar.
        </Text>

        <View style={[styles.instructionsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.instructionsTitle, { color: colors.text }]}>Instruções</Text>
          {selectedTask.instructions.map((inst, i) => (
            <View key={i} style={styles.instructionRow}>
              <View style={[styles.instNum, { backgroundColor: selectedTask.color + "20" }]}>
                <Text style={[styles.instNumText, { color: selectedTask.color }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.instText, { color: colors.text }]}>{inst}</Text>
            </View>
          ))}
        </View>

        <Pressable style={[styles.primaryBtn, { backgroundColor: selectedTask.color }]} onPress={skipPrep}>
          <Feather name="mic" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Começar Agora</Text>
        </Pressable>
      </ScrollView>
    );
  }

  if (phase === "recording" && selectedTask) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.recordingContent, { paddingTop: topPad + 24 }]}>
          <View style={[styles.timerRing, { borderColor: isWarning ? colors.destructive : selectedTask.color }]}>
            <Text style={[styles.timerText, { color: isWarning ? colors.destructive : selectedTask.color }]}>
              {formatTime(remaining)}
            </Text>
            <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>restante</Text>
          </View>

          <View style={[styles.recordingIndicator, { backgroundColor: "#D85A30" + "20" }]}>
            <View style={[styles.recordingDot, { backgroundColor: "#D85A30" }]} />
            <Text style={[styles.recordingLabel, { color: "#D85A30" }]}>GRAVANDO</Text>
          </View>

          <Text style={[styles.recordingTask, { color: colors.text }]}>{selectedTask.title}</Text>
          <Text style={[styles.recordingHint, { color: colors.mutedForeground }]}>
            Fale com clareza e organize seu discurso. O timer não pode ser pausado.
          </Text>

          {isWarning && (
            <View style={[styles.warningBanner, { backgroundColor: colors.destructive + "15" }]}>
              <Feather name="alert-triangle" size={14} color={colors.destructive} />
              <Text style={[styles.warningText, { color: colors.destructive }]}>Menos de 1 minuto restante!</Text>
            </View>
          )}

          <Pressable style={[styles.stopBtn, { borderColor: "#D85A30" }]} onPress={stopRecording}>
            <Feather name="square" size={18} color="#D85A30" />
            <Text style={[styles.stopBtnText, { color: "#D85A30" }]}>Encerrar</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (phase === "done" && selectedTask) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={[styles.content, { paddingTop: topPad + 32, paddingBottom: 40, alignItems: "center" }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.doneIcon, { backgroundColor: colors.success + "20", borderColor: colors.success + "40" }]}>
          <Feather name="check" size={40} color={colors.success} />
        </View>
        <Text style={[styles.doneTitle, { color: colors.text }]}>Prática Concluída!</Text>
        <Text style={[styles.doneSubtitle, { color: colors.mutedForeground }]}>{selectedTask.title}</Text>

        <View style={[styles.doneCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.doneTip, { color: colors.text }]}>
            Para melhorar ainda mais, grave-se com um aplicativo de voz, ouça a gravação e compare com exemplos do nível B2/C1.
          </Text>
        </View>

        <View style={styles.doneActions}>
          <Pressable style={[styles.outlineBtn, { borderColor: selectedTask.color }]} onPress={() => startPrep(selectedTask)}>
            <Feather name="refresh-cw" size={15} color={selectedTask.color} />
            <Text style={[styles.outlineBtnText, { color: selectedTask.color }]}>Repetir tarefa</Text>
          </Pressable>
          <Pressable style={[styles.primaryBtn, { backgroundColor: selectedTask.color }]} onPress={reset}>
            <Text style={styles.primaryBtnText}>Outras tarefas</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: -6 },
  infoCard: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 14, borderRadius: 12, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  taskCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 14, borderWidth: 1 },
  taskIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  taskMeta: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  taskDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  taskBadges: { flexDirection: "row", gap: 6, marginTop: 4 },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  phaseHeader: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  phaseLabel: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold" },
  prepTimer: { fontSize: 22, fontFamily: "Inter_700Bold" },
  instructionsCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 12 },
  instructionsTitle: { fontSize: 15, fontFamily: "Inter_700Bold", marginBottom: 4 },
  instructionRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  instNum: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  instNumText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  instText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 19 },
  primaryBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  primaryBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#fff" },
  recordingContent: { flex: 1, alignItems: "center", paddingHorizontal: 24, gap: 20 },
  timerRing: { width: 200, height: 200, borderRadius: 100, borderWidth: 6, alignItems: "center", justifyContent: "center" },
  timerText: { fontSize: 48, fontFamily: "Inter_700Bold" },
  timerLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  recordingIndicator: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  recordingDot: { width: 10, height: 10, borderRadius: 5 },
  recordingLabel: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2 },
  recordingTask: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  recordingHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  warningBanner: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
  warningText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  stopBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, borderWidth: 2 },
  stopBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  doneIcon: { width: 96, height: 96, borderRadius: 48, borderWidth: 2, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  doneSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular" },
  doneCard: { alignSelf: "stretch", borderRadius: 14, borderWidth: 1, padding: 16 },
  doneTip: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  doneActions: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  outlineBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
