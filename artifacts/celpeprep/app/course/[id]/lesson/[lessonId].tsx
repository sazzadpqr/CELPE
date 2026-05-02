import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
  level: string;
  lessons: Lesson[];
};

const LEVEL_COLORS: Record<string, string> = {
  A2: "#1D9E75",
  B1: "#185FA5",
  B2: "#6B21A8",
  C1: "#D85A30",
};

function extractYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\n?#]{11})/);
  return match?.[1] ?? null;
}

function VideoPlayer({ lesson, accent }: { lesson: Lesson; accent: string }) {
  const colors = useColors();

  if (lesson.type === "youtube" && lesson.mediaUrl) {
    const videoId = extractYouTubeId(lesson.mediaUrl);
    const embedUrl = videoId
      ? `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`
      : lesson.mediaUrl;

    if (Platform.OS === "web") {
      return (
        <View style={styles.playerContainer}>
          {/* @ts-ignore */}
          <iframe
            src={embedUrl}
            style={{ width: "100%", height: "100%", border: "none" }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </View>
      );
    }

    return (
      <View style={[styles.playerContainer, { backgroundColor: "#000", alignItems: "center", justifyContent: "center" }]}>
        <Pressable
          onPress={() => Linking.openURL(lesson.mediaUrl!)}
          style={[styles.openBtn, { backgroundColor: "#FF0000" }]}
        >
          <Feather name="youtube" size={20} color="#fff" />
          <Text style={styles.openBtnText}>Assistir no YouTube</Text>
        </Pressable>
      </View>
    );
  }

  if (lesson.type === "video" && lesson.mediaUrl) {
    if (Platform.OS === "web") {
      return (
        <View style={styles.playerContainer}>
          {/* @ts-ignore */}
          <video
            src={lesson.mediaUrl}
            controls
            style={{ width: "100%", height: "100%", objectFit: "contain", backgroundColor: "#000" }}
          />
        </View>
      );
    }
    return (
      <View style={[styles.playerContainer, { backgroundColor: "#000", alignItems: "center", justifyContent: "center" }]}>
        <Pressable
          onPress={() => Linking.openURL(lesson.mediaUrl!)}
          style={[styles.openBtn, { backgroundColor: accent }]}
        >
          <Feather name="play-circle" size={20} color="#fff" />
          <Text style={styles.openBtnText}>Abrir Vídeo</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

export default function LessonPlayerScreen() {
  const { id: courseId, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    fetch(getApiUrl(`/api/content/courses/${courseId}`))
      .then((r) => r.json())
      .then((data: CourseDetail) => setCourse(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [courseId]);

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
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Aula não encontrada.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[{ color: colors.primary, fontSize: 14, fontFamily: "Inter_500Medium" }]}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const activeLessons = course.lessons.filter((l) => l.active);
  const currentIdx = activeLessons.findIndex((l) => l.id === lessonId);
  const lesson = activeLessons[currentIdx] ?? null;
  const prevLesson = currentIdx > 0 ? activeLessons[currentIdx - 1] : null;
  const nextLesson = currentIdx < activeLessons.length - 1 ? activeLessons[currentIdx + 1] : null;

  const accent = LEVEL_COLORS[course.level] ?? "#185FA5";
  const isMedia = lesson && (lesson.type === "youtube" || lesson.type === "video") && lesson.mediaUrl;

  if (!lesson) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.mutedForeground }]}>Aula não encontrada.</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={[{ color: colors.primary, fontSize: 14, fontFamily: "Inter_500Medium" }]}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.topBar, { paddingTop: insets.top + 10, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </Pressable>
        <View style={styles.topBarText}>
          <Text style={[styles.topBarCourse, { color: colors.mutedForeground }]} numberOfLines={1}>{course.title}</Text>
          <Text style={[styles.topBarLesson, { color: colors.text }]} numberOfLines={1}>{lesson.title}</Text>
        </View>
        <View style={[styles.lessonCounter, { backgroundColor: accent + "18" }]}>
          <Text style={[styles.lessonCounterText, { color: accent }]}>{currentIdx + 1}/{activeLessons.length}</Text>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {isMedia && <VideoPlayer lesson={lesson} accent={accent} />}

        <View style={styles.body}>
          <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
          <View style={styles.lessonMeta}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{lesson.durationMinutes} min</Text>
            <View style={[styles.typeBadge, { backgroundColor: accent + "18" }]}>
              <Text style={[styles.typeText, { color: accent }]}>{lesson.type}</Text>
            </View>
          </View>

          {lesson.content ? (
            <View style={[styles.contentBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.contentText, { color: colors.text }]}>{lesson.content}</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.navRow, { borderTopColor: colors.border }]}>
          {prevLesson ? (
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/course/[id]/lesson/[lessonId]",
                  params: { id: courseId!, lessonId: prevLesson.id },
                })
              }
              style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Feather name="arrow-left" size={14} color={colors.text} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.navBtnLabel, { color: colors.mutedForeground }]}>Anterior</Text>
                <Text style={[styles.navBtnTitle, { color: colors.text }]} numberOfLines={1}>{prevLesson.title}</Text>
              </View>
            </Pressable>
          ) : <View style={{ flex: 1 }} />}

          {nextLesson ? (
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: "/course/[id]/lesson/[lessonId]",
                  params: { id: courseId!, lessonId: nextLesson.id },
                })
              }
              style={[styles.navBtn, { backgroundColor: colors.card, borderColor: colors.border, alignItems: "flex-end" }]}
            >
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.navBtnLabel, { color: colors.mutedForeground }]}>Próxima</Text>
                <Text style={[styles.navBtnTitle, { color: colors.text }]} numberOfLines={1}>{nextLesson.title}</Text>
              </View>
              <Feather name="arrow-right" size={14} color={colors.text} />
            </Pressable>
          ) : (
            <Pressable
              onPress={() => router.back()}
              style={[styles.navBtn, { backgroundColor: accent + "18", borderColor: accent + "30", alignItems: "center", justifyContent: "center" }]}
            >
              <Feather name="check-circle" size={16} color={accent} />
              <Text style={[styles.navBtnTitle, { color: accent }]}>Concluir curso</Text>
            </Pressable>
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
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 10 },
  backBtn: { padding: 6, flexShrink: 0 },
  topBarText: { flex: 1 },
  topBarCourse: { fontSize: 11, fontFamily: "Inter_400Regular" },
  topBarLesson: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  lessonCounter: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, flexShrink: 0 },
  lessonCounterText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  scroll: { gap: 0 },
  playerContainer: { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" },
  openBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  openBtnText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  body: { padding: 16, gap: 8 },
  lessonTitle: { fontSize: 20, fontFamily: "Inter_700Bold", lineHeight: 26 },
  lessonMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  contentBox: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 8 },
  contentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  navRow: { flexDirection: "row", gap: 10, padding: 16, borderTopWidth: 1, marginTop: 8 },
  navBtn: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 12 },
  navBtnLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  navBtnTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
