import { Feather } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface ExamEdition {
  id: string;
  year: number;
  edition: string;
  title: string;
  description: string;
  tasks: ExamTask[];
}

interface ExamTask {
  id: string;
  type: string;
  title: string;
  genre: string;
  description: string;
  linkUrl?: string;
}

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

function useExams() {
  const [exams, setExams] = useState<ExamEdition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(getApiUrl("/api/content/exams"))
      .then((r) => r.json())
      .then((data: ExamEdition[]) => setExams(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { exams, loading };
}

const TASK_COLORS: Record<string, string> = {
  "Tarefa 1": "#185FA5",
  "Tarefa 2": "#1D9E75",
  "Tarefa 3": "#6B21A8",
  "Tarefa 4": "#BA7517",
  "Link Externo": "#D85A30",
};

const TASK_ICONS: Record<string, string> = {
  "Tarefa 1": "video",
  "Tarefa 2": "headphones",
  "Tarefa 3": "file-text",
  "Tarefa 4": "bar-chart-2",
  "Link Externo": "external-link",
};

function openLink(url: string) {
  Linking.openURL(url).catch(() => {});
}

function TaskRow({ task, colors }: { task: ExamTask; colors: ReturnType<typeof useColors> }) {
  const accentColor = TASK_COLORS[task.type] || colors.primary;
  const iconName = (TASK_ICONS[task.type] || "file-text") as any;
  const hasLink = !!task.linkUrl;

  if (hasLink) {
    return (
      <Pressable
        onPress={() => openLink(task.linkUrl!)}
        style={({ pressed }) => [
          styles.taskRow,
          styles.taskRowLinked,
          {
            backgroundColor: pressed ? accentColor + "10" : accentColor + "06",
            borderColor: accentColor + "30",
          },
        ]}
      >
        {/* Left accent bar */}
        <View style={[styles.taskAccentBar, { backgroundColor: accentColor }]} />

        <View style={[styles.taskIconBox, { backgroundColor: accentColor + "20" }]}>
          <Feather name={iconName} size={15} color={accentColor} />
        </View>

        <View style={styles.taskMeta}>
          <View style={styles.taskTitleRow}>
            <Text style={[styles.taskType, { color: accentColor }]}>{task.type}</Text>
            {task.genre ? (
              <View style={[styles.genrePill, { backgroundColor: accentColor + "18" }]}>
                <Text style={[styles.genreText, { color: accentColor }]}>{task.genre}</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
          {task.description ? (
            <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>{task.description}</Text>
          ) : null}

          {/* Prominent open-link button */}
          <View style={[styles.openLinkBtn, { backgroundColor: accentColor, borderColor: accentColor }]}>
            <Feather name="external-link" size={12} color="#fff" />
            <Text style={styles.openLinkBtnText}>Abrir link</Text>
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.taskRow,
        styles.taskRowPlain,
        { borderTopColor: colors.border },
      ]}
    >
      <View style={[styles.taskIconBox, { backgroundColor: accentColor + "18" }]}>
        <Feather name={iconName} size={14} color={accentColor} />
      </View>
      <View style={styles.taskMeta}>
        <View style={styles.taskTitleRow}>
          <Text style={[styles.taskType, { color: accentColor }]}>{task.type}</Text>
          {task.genre ? (
            <View style={[styles.genrePill, { backgroundColor: colors.muted }]}>
              <Text style={[styles.genreText, { color: colors.mutedForeground }]}>{task.genre}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
        {task.description ? (
          <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>{task.description}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function ExamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { exams, loading } = useExams();

  return (
    <FlatList
      style={[{ backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Provas Anteriores</Text>
          <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
            Acesse questões, temas e materiais de edições anteriores do Celpe-Bras.
          </Text>
          {loading && (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <ActivityIndicator color={colors.primary} />
            </View>
          )}
        </>
      }
      data={exams}
      keyExtractor={(e) => e.id}
      renderItem={({ item: exam }) => {
        const isExpanded = expanded === exam.id;
        const linkedTasksCount = exam.tasks.filter((t) => t.linkUrl).length;
        return (
          <View style={[
            styles.examCard,
            { backgroundColor: colors.card, borderColor: isExpanded ? colors.primary : colors.border },
          ]}>
            <Pressable
              style={({ pressed }) => [styles.examHeader, { opacity: pressed ? 0.7 : 1 }]}
              onPress={() => setExpanded(isExpanded ? null : exam.id)}
            >
              <View style={[styles.yearBadge, { backgroundColor: colors.primary + "18" }]}>
                <Text style={[styles.yearText, { color: colors.primary }]}>
                  {exam.year > 0 ? exam.year : "INEP"}
                </Text>
              </View>
              <View style={styles.examMeta}>
                <Text style={[styles.examTitle, { color: colors.text }]}>{exam.title}</Text>
                <Text style={[styles.examDesc, { color: colors.mutedForeground }]}>{exam.description}</Text>
                {linkedTasksCount > 0 && (
                  <View style={styles.linkCountRow}>
                    <Feather name="link" size={11} color={colors.primary} />
                    <Text style={[styles.linkCountText, { color: colors.primary }]}>
                      {linkedTasksCount} link{linkedTasksCount !== 1 ? "s" : ""} disponível{linkedTasksCount !== 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
              </View>
              <Feather
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.mutedForeground}
              />
            </Pressable>

            {isExpanded && (
              <View style={[styles.taskList, { borderTopColor: colors.border }]}>
                {exam.tasks.map((task) => (
                  <TaskRow key={task.id} task={task} colors={colors} />
                ))}
                {exam.tasks.length === 0 && (
                  <View style={{ padding: 16, alignItems: "center" }}>
                    <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>
                      Nenhum material disponível nesta edição.
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },

  examCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  examHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  yearBadge: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  yearText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  examMeta: { flex: 1, gap: 2 },
  examTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  examDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  linkCountRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  linkCountText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  taskList: { borderTopWidth: 1 },

  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
  },
  taskRowLinked: {
    borderRadius: 0,
    position: "relative",
    paddingLeft: 18,
  },
  taskAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  taskRowPlain: {
    borderTopWidth: 1,
  },

  taskIconBox: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  taskMeta: { flex: 1, gap: 4 },
  taskTitleRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  taskType: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  taskTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", lineHeight: 18 },
  taskDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },

  genrePill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  genreText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  openLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 6,
  },
  openLinkBtnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
});
