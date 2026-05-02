import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
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

type Course = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  level: string;
  category: string;
  totalLessons: number;
  estimatedHours: number;
  thumbnailUrl: string | null;
};

const LEVEL_COLORS: Record<string, string> = {
  A2: "#1D9E75",
  B1: "#185FA5",
  B2: "#6B21A8",
  C1: "#D85A30",
};

const CATEGORY_COLORS = ["#185FA5", "#1D9E75", "#6B21A8", "#D85A30", "#BA7517"];

function courseColor(course: Course): string {
  const lvl = LEVEL_COLORS[course.level];
  if (lvl) return lvl;
  const hash = course.id.charCodeAt(0) % CATEGORY_COLORS.length;
  return CATEGORY_COLORS[hash]!;
}

export default function CoursesScreen() {
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("Todos");

  useEffect(() => {
    fetch(getApiUrl("/api/content/courses"))
      .then((r) => r.json())
      .then((data: Course[]) => setCourses(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const levels = ["Todos", "A2", "B1", "B2", "C1"];
  const filtered = filter === "Todos" ? courses : courses.filter((c) => c.level === filter);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text }]}>Cursos</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Aulas de português para o Celpe-Bras</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          {levels.map((lvl) => (
            <Pressable
              key={lvl}
              onPress={() => setFilter(lvl)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === lvl ? colors.primary : colors.card,
                  borderColor: filter === lvl ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterChipText, { color: filter === lvl ? "#fff" : colors.text }]}>{lvl}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Carregando cursos...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.center}>
            <Feather name="video-off" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {courses.length === 0 ? "Nenhum curso disponível ainda." : "Nenhum curso neste nível."}
            </Text>
          </View>
        ) : (
          filtered.map((course) => {
            const accent = courseColor(course);
            return (
              <Pressable
                key={course.id}
                onPress={() => router.push({ pathname: "/course/[id]", params: { id: course.id } })}
                style={({ pressed }) => [styles.card, { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[styles.cardBanner, { backgroundColor: accent + "22", borderBottomColor: accent + "30" }]}>
                  <View style={styles.cardBannerInner}>
                    <Feather name="play-circle" size={28} color={accent} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.badges}>
                        <View style={[styles.badge, { backgroundColor: accent + "22" }]}>
                          <Text style={[styles.badgeText, { color: accent }]}>{course.level}</Text>
                        </View>
                        {course.category ? (
                          <View style={[styles.badge, { backgroundColor: colors.border }]}>
                            <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>{course.category}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </View>
                </View>
                <View style={styles.cardBody}>
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>{course.title}</Text>
                  {course.subtitle ? (
                    <Text style={[styles.cardSubtitle, { color: accent }]} numberOfLines={1}>{course.subtitle}</Text>
                  ) : null}
                  {course.description ? (
                    <Text style={[styles.cardDesc, { color: colors.mutedForeground }]} numberOfLines={2}>{course.description}</Text>
                  ) : null}
                  <View style={styles.cardFooter}>
                    <View style={styles.stat}>
                      <Feather name="layers" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.statText, { color: colors.mutedForeground }]}>{course.totalLessons} aulas</Text>
                    </View>
                    {course.estimatedHours > 0 && (
                      <View style={styles.stat}>
                        <Feather name="clock" size={12} color={colors.mutedForeground} />
                        <Text style={[styles.statText, { color: colors.mutedForeground }]}>{course.estimatedHours}h estimadas</Text>
                      </View>
                    )}
                    <View style={styles.startBtn}>
                      <Text style={[styles.startBtnText, { color: accent }]}>Ver curso</Text>
                      <Feather name="chevron-right" size={13} color={accent} />
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 6, marginRight: 8 },
  headerText: { flex: 1 },
  title: { fontSize: 20, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  scroll: { padding: 16, gap: 14 },
  filterRow: { marginBottom: 4 },
  filterContent: { paddingHorizontal: 0, gap: 8, paddingVertical: 4 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  center: { alignItems: "center", justifyContent: "center", paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", paddingHorizontal: 32 },
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  cardBanner: { borderBottomWidth: 1, padding: 14 },
  cardBannerInner: { flexDirection: "row", alignItems: "center", gap: 12 },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  cardBody: { padding: 14, gap: 4 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", lineHeight: 22 },
  cardSubtitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  cardFooter: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  stat: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 2, marginLeft: "auto" },
  startBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
