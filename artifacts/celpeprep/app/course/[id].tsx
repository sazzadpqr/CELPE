import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

function getApiUrl(path: string) {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  return domain ? `https://${domain}${path}` : path;
}

type Lesson = {
  id: string;
  title: string;
  content: string;
  type: string;
  mediaUrl: string | null;
  durationMinutes: number;
  order: number;
  active: boolean;
};

type CourseDetail = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  category: string;
  totalLessons: number;
  estimatedHours: number;
  lessons: Lesson[];
};

const TYPE_ICON: Record<string, keyof typeof Feather.glyphMap> = {
  youtube: "youtube",
  video: "video",
  audio: "headphones",
  text: "file-text",
  interactive: "zap",
  quiz: "help-circle",
};

const LEVEL_COLORS: Record<string, string> = {
  A2: "#1D9E75",
  B1: "#185FA5",
  B2: "#6B21A8",
  C1: "#D85A30",
};

export default function CourseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(getApiUrl(`/api/content/courses/${id}`))
      .then((r) => r.json())
      .then((data: CourseDetail) => setCourse(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const accent = course ? (LEVEL_COLORS[course.level] ?? "#185FA5") : "#185FA5";

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!course) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Curso não encontrado.</Text>
        <Pressable onPress={() => router.back()} style={[styles.backPill, { backgroundColor: colors.card }]}>
          <Text style={[styles.backPillText, { color: colors.text }]}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const activeLessons = course.lessons.filter((l) => l.active);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: accent + "18", borderBottomColor: accent + "30" }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerBadges}>
          <View style={[styles.badge, { backgroundColor: accent + "25" }]}>
            <Text style={[styles.badgeText, { color: accent }]}>{course.level}</Text>
          </View>
          {course.category ? (
            <View style={[styles.badge, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{course.category}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.courseHero, { backgroundColor: accent + "12", borderBottomColor: accent + "25", borderBottomWidth: 1 }]}>
          <View style={[styles.heroIcon, { backgroundColor: accent + "20" }]}>
            <Feather name="play-circle" size={36} color={accent} />
          </View>
          <Text style={[styles.courseTitle, { color: colors.text }]}>{course.title}</Text>
          {course.subtitle ? (
            <Text style={[styles.courseSubtitle, { color: accent }]}>{course.subtitle}</Text>
          ) : null}
          {course.description ? (
            <Text style={[styles.courseDesc, { color: colors.mutedForeground }]}>{course.description}</Text>
          ) : null}
          <View style={styles.courseStats}>
            <View style={styles.stat}>
              <Feather name="layers" size={13} color={colors.mutedForeground} />
              <Text style={[styles.statText, { color: colors.mutedForeground }]}>{activeLessons.length} aulas</Text>
            </View>
            {course.estimatedHours > 0 && (
              <View style={styles.stat}>
                <Feather name="clock" size={13} color={colors.mutedForeground} />
                <Text style={[styles.statText, { color: colors.mutedForeground }]}>{course.estimatedHours}h</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.lessonsSection}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>AULAS DO CURSO</Text>
          {activeLessons.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="inbox" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Nenhuma aula disponível ainda.</Text>
            </View>
          ) : (
            activeLessons.map((lesson, idx) => {
              const typeIcon = TYPE_ICON[lesson.type] ?? "file-text";
              const isVideo = lesson.type === "youtube" || lesson.type === "video";
              return (
                <Pressable
                  key={lesson.id}
                  onPress={() =>
                    router.push({
                      pathname: "/course/[id]/lesson/[lessonId]",
                      params: { id: course.id, lessonId: lesson.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.lessonRow,
                    { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <View style={[styles.lessonNum, { backgroundColor: accent + "18" }]}>
                    <Text style={[styles.lessonNumText, { color: accent }]}>{idx + 1}</Text>
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={[styles.lessonTitle, { color: colors.text }]} numberOfLines={2}>
                      {lesson.title}
                    </Text>
                    <View style={styles.lessonMeta}>
                      <Feather name={typeIcon} size={11} color={colors.mutedForeground} />
                      <Text style={[styles.lessonType, { color: colors.mutedForeground }]}>{lesson.type}</Text>
                      <Text style={[styles.lessonDur, { color: colors.mutedForeground }]}>· {lesson.durationMinutes}min</Text>
                    </View>
                  </View>
                  {isVideo ? (
                    <View style={[styles.playBtn, { backgroundColor: accent + "18" }]}>
                      <Feather name="play" size={14} color={accent} />
                    </View>
                  ) : (
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  )}
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  backPill: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, marginTop: 8 },
  backPillText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 6 },
  headerBadges: { flexDirection: "row", gap: 6 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  scroll: { gap: 0 },
  courseHero: { padding: 20, gap: 6 },
  heroIcon: { width: 60, height: 60, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  courseTitle: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 28 },
  courseSubtitle: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  courseDesc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20, marginTop: 4 },
  courseStats: { flexDirection: "row", gap: 16, marginTop: 8 },
  stat: { flexDirection: "row", alignItems: "center", gap: 5 },
  statText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  lessonsSection: { padding: 16, gap: 8 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  emptyCard: { borderRadius: 12, borderWidth: 1, padding: 24, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  lessonNum: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  lessonNumText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  lessonInfo: { flex: 1 },
  lessonTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 20 },
  lessonMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  lessonType: { fontSize: 11, fontFamily: "Inter_400Regular" },
  lessonDur: { fontSize: 11, fontFamily: "Inter_400Regular" },
  playBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});
