import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type VocabWord } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type Rating = "again" | "hard" | "good" | "easy";

const RATING_COLORS: Record<Rating, string> = {
  again: "#D85A30",
  hard: "#BA7517",
  good: "#185FA5",
  easy: "#1D9E75",
};
const RATING_LABELS: Record<Rating, string> = {
  again: "Errei",
  hard: "Difícil",
  good: "Bom",
  easy: "Fácil",
};

function nextReviewDate(easeLevel: number, rating: Rating): string {
  const intervals: Record<Rating, Record<number, number>> = {
    again: { 0: 0, 1: 0, 2: 0, 3: 1, 4: 1, 5: 2 },
    hard: { 0: 1, 1: 1, 2: 2, 3: 3, 4: 5, 5: 7 },
    good: { 0: 1, 1: 3, 2: 7, 3: 14, 4: 21, 5: 30 },
    easy: { 0: 3, 1: 7, 2: 14, 3: 21, 4: 30, 5: 60 },
  };
  const level = Math.min(5, Math.max(0, easeLevel));
  const days = intervals[rating][level as 0|1|2|3|4|5] ?? 1;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function newStatus(currentStatus: VocabWord["status"], rating: Rating): VocabWord["status"] {
  if (rating === "again") return "learning";
  if (rating === "easy") return "mastered";
  if (rating === "good" && currentStatus === "learning") return "review";
  return currentStatus;
}

function newEaseLevel(current: number, rating: Rating): number {
  if (rating === "again") return Math.max(0, current - 1);
  if (rating === "hard") return current;
  if (rating === "good") return Math.min(5, current + 1);
  return Math.min(5, current + 2);
}

export default function ReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vocabWords, updateVocabWord } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const dueWords = useMemo(() =>
    vocabWords.filter((w) =>
      w.status === "learning" || w.status === "review"
    ).slice(0, 20),
    [vocabWords]
  );

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  const flipValue = useSharedValue(0);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipValue.value, [0, 1], [0, 180])}deg` }],
    backfaceVisibility: "hidden",
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${interpolate(flipValue.value, [0, 1], [180, 360])}deg` }],
    backfaceVisibility: "hidden",
  }));

  const handleFlip = () => {
    const toFlipped = !flipped;
    flipValue.value = withTiming(toFlipped ? 1 : 0, { duration: 350 });
    setFlipped(toFlipped);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleRate = useCallback(async (rating: Rating) => {
    const word = dueWords[index];
    if (!word) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await updateVocabWord(word.id, {
      status: newStatus(word.status, rating),
      easeLevel: newEaseLevel(word.easeLevel, rating),
      timesReviewed: word.timesReviewed + 1,
      nextReview: nextReviewDate(word.easeLevel, rating),
    });

    setReviewed((r) => r + 1);
    flipValue.value = withTiming(0, { duration: 200 });
    setFlipped(false);

    if (index + 1 >= dueWords.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
    }
  }, [index, dueWords]);

  if (dueWords.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="check-circle" size={48} color={colors.success} />
        <Text style={[styles.doneTitle, { color: colors.text }]}>Nenhuma palavra para revisar!</Text>
        <Text style={[styles.doneDesc, { color: colors.mutedForeground }]}>Adicione palavras no vocabulário para começar a revisar.</Text>
        <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Text style={styles.doneBtnText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="award" size={48} color={colors.success} />
        <Text style={[styles.doneTitle, { color: colors.text }]}>Revisão concluída!</Text>
        <Text style={[styles.doneDesc, { color: colors.mutedForeground }]}>{reviewed} palavras revisadas nesta sessão.</Text>
        <Pressable style={[styles.doneBtn, { backgroundColor: colors.primary }]} onPress={() => router.back()}>
          <Feather name="check" size={16} color="#fff" />
          <Text style={styles.doneBtnText}>Ótimo!</Text>
        </Pressable>
      </View>
    );
  }

  const current = dueWords[index];

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <Text style={[styles.progress, { color: colors.text }]}>
          {index + 1} / {dueWords.length}
        </Text>
        <View style={{ width: 22 }} />
      </View>

      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { width: `${((index) / dueWords.length) * 100}%` as any, backgroundColor: colors.primary }]} />
      </View>

      <View style={styles.cardArea}>
        <Pressable onPress={handleFlip} style={styles.cardPressable}>
          <Animated.View style={[styles.card, styles.cardFront, frontStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardHint, { color: colors.mutedForeground }]}>Toque para revelar</Text>
            <Text style={[styles.wordText, { color: colors.text }]}>{current.word}</Text>
            <Text style={[styles.posText, { color: colors.purple }]}>{current.partOfSpeech}</Text>
            {current.register !== "neutro" && (
              <View style={[styles.registerPill, { backgroundColor: colors.infoBg }]}>
                <Text style={[styles.registerText, { color: colors.primary }]}>{current.register}</Text>
              </View>
            )}
          </Animated.View>
          <Animated.View style={[styles.card, styles.cardBack, backStyle, { backgroundColor: colors.primary + "08", borderColor: colors.primary + "40" }]}>
            <Text style={[styles.wordSmall, { color: colors.primary }]}>{current.word}</Text>
            <Text style={[styles.defText, { color: colors.text }]}>{current.definition}</Text>
            {current.example ? (
              <View style={[styles.exBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.exText, { color: colors.mutedForeground }]}>"{current.example}"</Text>
              </View>
            ) : null}
          </Animated.View>
        </Pressable>
      </View>

      {flipped && (
        <View style={[styles.ratingRow, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
          {(["again", "hard", "good", "easy"] as Rating[]).map((r) => (
            <Pressable
              key={r}
              onPress={() => handleRate(r)}
              style={[styles.ratingBtn, { backgroundColor: RATING_COLORS[r] + "18", borderColor: RATING_COLORS[r] + "40", borderWidth: 1 }]}
            >
              <Text style={[styles.ratingLabel, { color: RATING_COLORS[r] }]}>{RATING_LABELS[r]}</Text>
            </Pressable>
          ))}
        </View>
      )}

      {!flipped && (
        <View style={[styles.flipHint, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}>
          <Text style={[styles.flipHintText, { color: colors.mutedForeground }]}>Toque no cartão para ver a definição</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  progress: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  progressTrack: { height: 4, width: "100%" },
  progressFill: { height: 4 },
  cardArea: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  cardPressable: { width: "100%" },
  card: { borderRadius: 20, borderWidth: 1.5, padding: 28, alignItems: "center", justifyContent: "center", minHeight: 280, gap: 12, position: "absolute", width: "100%" },
  cardFront: {},
  cardBack: {},
  cardHint: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 8 },
  wordText: { fontSize: 32, fontFamily: "Inter_700Bold", textAlign: "center" },
  posText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  registerPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 4 },
  registerText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  wordSmall: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  defText: { fontSize: 18, fontFamily: "Inter_500Medium", textAlign: "center", lineHeight: 26 },
  exBox: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 8 },
  exText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", textAlign: "center", lineHeight: 18 },
  ratingRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, paddingTop: 16 },
  ratingBtn: { flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 12 },
  ratingLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
  flipHint: { alignItems: "center", paddingTop: 16, paddingBottom: 24 },
  flipHintText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  doneTitle: { fontSize: 22, fontFamily: "Inter_700Bold", textAlign: "center" },
  doneDesc: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center" },
  doneBtn: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
