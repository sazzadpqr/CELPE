import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type VocabWord } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function calculateNextReview(
  word: VocabWord,
  rating: "hard" | "good" | "easy"
): Partial<VocabWord> {
  const now = Date.now();
  if (rating === "hard") {
    return {
      nextReview: new Date(now + 12 * 3600000).toISOString(),
      easeLevel: Math.max(0, word.easeLevel - 1),
      timesReviewed: word.timesReviewed + 1,
      status: "learning",
    };
  }
  if (rating === "good") {
    const INTERVALS_DAYS = [1, 3, 7, 14, 21];
    const days = INTERVALS_DAYS[Math.min(word.easeLevel, INTERVALS_DAYS.length - 1)];
    const newEase = Math.min(word.easeLevel + 1, 5);
    return {
      nextReview: new Date(now + days * 86400000).toISOString(),
      easeLevel: newEase,
      timesReviewed: word.timesReviewed + 1,
      status: newEase >= 3 ? "review" : "learning",
    };
  }
  return {
    nextReview: new Date(now + 30 * 86400000).toISOString(),
    easeLevel: Math.min(word.easeLevel + 2, 5),
    timesReviewed: word.timesReviewed + 1,
    status: "mastered",
  };
}

function FlashCard({
  word,
  onRate,
  index,
  total,
}: {
  word: VocabWord;
  onRate: (rating: "hard" | "good" | "easy") => void;
  index: number;
  total: number;
}) {
  const colors = useColors();
  const flipAnim = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const flip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.spring(flipAnim, {
      toValue: flipped ? 0 : 1,
      useNativeDriver: true,
      tension: 80,
      friction: 8,
    }).start();
    setFlipped(!flipped);
  };

  const handleRate = (rating: "hard" | "good" | "easy") => {
    Haptics.impactAsync(
      rating === "easy"
        ? Haptics.ImpactFeedbackStyle.Light
        : rating === "good"
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Heavy
    );
    onRate(rating);
    flipAnim.setValue(0);
    setFlipped(false);
  };

  return (
    <View style={styles.cardContainer}>
      <View style={styles.progressRow}>
        <Text style={[styles.progressText, { color: colors.mutedForeground }]}>
          {index + 1} / {total}
        </Text>
        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${((index) / total) * 100}%` as any,
              },
            ]}
          />
        </View>
      </View>

      <Pressable onPress={flip} style={styles.cardWrapper}>
        <Animated.View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border },
            { transform: [{ rotateY: frontRotate }], backfaceVisibility: "hidden" },
          ]}
        >
          <Text style={[styles.posText, { color: colors.primary }]}>
            {word.partOfSpeech}
          </Text>
          <Text style={[styles.wordText, { color: colors.text }]}>
            {word.word}
          </Text>
          <View style={styles.tapHint}>
            <Feather name="rotate-cw" size={14} color={colors.mutedForeground} />
            <Text style={[styles.tapHintText, { color: colors.mutedForeground }]}>
              Toque para ver o significado
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { backgroundColor: colors.card, borderColor: colors.primary },
            { transform: [{ rotateY: backRotate }], backfaceVisibility: "hidden" },
          ]}
        >
          <Text style={[styles.defLabel, { color: colors.primary }]}>
            Definição
          </Text>
          <Text style={[styles.defText, { color: colors.text }]}>
            {word.definition}
          </Text>
          {word.example ? (
            <View
              style={[
                styles.exampleBox,
                { backgroundColor: colors.infoBg, borderLeftColor: colors.primary },
              ]}
            >
              <Text style={[styles.exampleText, { color: colors.mutedForeground }]}>
                "{word.example}"
              </Text>
            </View>
          ) : null}
        </Animated.View>
      </Pressable>

      {flipped ? (
        <View style={styles.ratingRow}>
          <Pressable
            style={[styles.ratingBtn, { backgroundColor: "#FEE2E2", borderColor: "#F87171" }]}
            onPress={() => handleRate("hard")}
          >
            <Text style={[styles.ratingBtnText, { color: "#DC2626" }]}>Difícil</Text>
            <Text style={[styles.ratingInterval, { color: "#DC2626" }]}>12h</Text>
          </Pressable>
          <Pressable
            style={[styles.ratingBtn, { backgroundColor: colors.infoBg, borderColor: colors.primary }]}
            onPress={() => handleRate("good")}
          >
            <Text style={[styles.ratingBtnText, { color: colors.primary }]}>Bom</Text>
            <Text style={[styles.ratingInterval, { color: colors.primary }]}>7d</Text>
          </Pressable>
          <Pressable
            style={[styles.ratingBtn, { backgroundColor: "#D1FAE5", borderColor: "#34D399" }]}
            onPress={() => handleRate("easy")}
          >
            <Text style={[styles.ratingBtnText, { color: "#059669" }]}>Fácil</Text>
            <Text style={[styles.ratingInterval, { color: "#059669" }]}>30d</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.flipPrompt}>
          <Text style={[styles.flipPromptText, { color: colors.mutedForeground }]}>
            Você lembra o significado?
          </Text>
        </View>
      )}
    </View>
  );
}

export default function FlashcardsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const { vocabWords, updateVocabWord } = useApp();

  const dueWords = vocabWords.filter(
    (w) => w.status !== "mastered" || new Date(w.nextReview) <= new Date()
  );

  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [done, setDone] = useState(false);

  const handleRate = async (rating: "hard" | "good" | "easy") => {
    const word = dueWords[currentIndex];
    const updates = calculateNextReview(word, rating);
    await updateVocabWord(word.id, updates);
    setReviewed((r) => r + 1);
    if (currentIndex + 1 >= dueWords.length) {
      setDone(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  if (dueWords.length === 0) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Flashcards SRS</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.emptyState}>
          <Feather name="check-circle" size={52} color={colors.success} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Tudo em dia!
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            Nenhuma palavra para revisar agora.{"\n"}Continue adicionando novas palavras.
          </Text>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Voltar ao vocabulário</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (done) {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Flashcards SRS</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.emptyState}>
          <Feather name="zap" size={52} color="#BA7517" />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            Sessão concluída!
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
            {reviewed} palavra{reviewed !== 1 ? "s" : ""} revisada{reviewed !== 1 ? "s" : ""}.{"\n"}
            Continue estudando amanhã!
          </Text>
          <Pressable
            style={[styles.doneBtn, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={styles.doneBtnText}>Concluir</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Flashcards SRS</Text>
        <View style={{ width: 22 }} />
      </View>
      <FlashCard
        word={dueWords[currentIndex]}
        onRate={handleRate}
        index={currentIndex}
        total={dueWords.length}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 17, fontFamily: "Inter_700Bold" },
  cardContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 8 },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  progressText: { fontSize: 13, fontFamily: "Inter_600SemiBold", minWidth: 36 },
  progressTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  progressFill: { height: 6, borderRadius: 3 },
  cardWrapper: { flex: 1 },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  cardBack: { gap: 16 },
  posText: { fontSize: 12, fontFamily: "Inter_600SemiBold", textTransform: "uppercase", letterSpacing: 0.5 },
  wordText: { fontSize: 32, fontFamily: "Inter_700Bold", textAlign: "center" },
  tapHint: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16 },
  tapHintText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  defLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5, alignSelf: "flex-start" },
  defText: { fontSize: 16, fontFamily: "Inter_500Medium", lineHeight: 24, textAlign: "center" },
  exampleBox: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 8, borderRadius: 4, alignSelf: "stretch" },
  exampleText: { fontSize: 13, fontFamily: "Inter_400Regular", fontStyle: "italic", lineHeight: 20 },
  ratingRow: { flexDirection: "row", gap: 10, paddingTop: 16, paddingBottom: Platform.OS === "web" ? 32 : 80 },
  ratingBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    gap: 2,
  },
  ratingBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  ratingInterval: { fontSize: 11, fontFamily: "Inter_500Medium" },
  flipPrompt: { alignItems: "center", paddingTop: 16, paddingBottom: Platform.OS === "web" ? 32 : 80 },
  flipPromptText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 16 },
  emptyTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  doneBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  doneBtnText: { color: "#fff", fontSize: 15, fontFamily: "Inter_600SemiBold" },
});
