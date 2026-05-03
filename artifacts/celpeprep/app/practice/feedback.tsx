import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import { AdService } from "@/services/AdService";

interface FeedbackData {
  taskType: string;
  genre: string;
  responseText: string;
  overallScore: number;
  rubricTema: number;
  rubricGenero: number;
  rubricCoesao: number;
  rubricGramatica: number;
  commentary: string;
  timeExpired: boolean;
}

const RUBRIC_LABELS = [
  { key: "rubricTema" as const, label: "Tema e Propósito", icon: "target" as const },
  { key: "rubricGenero" as const, label: "Gênero Discursivo", icon: "layers" as const },
  { key: "rubricCoesao" as const, label: "Coesão e Coerência", icon: "link" as const },
  { key: "rubricGramatica" as const, label: "Gramática e Léxico", icon: "code" as const },
];

function ScoreRing({ score, max = 5 }: { score: number; max?: number }) {
  const colors = useColors();
  const pct = score / max;
  const color = score >= 4 ? colors.success : score >= 2.5 ? colors.warning : colors.destructive;
  return (
    <View style={[styles.ring, { borderColor: color + "30" }]}>
      <View style={[styles.ringFill, { backgroundColor: color + "18" }]}>
        <Text style={[styles.ringScore, { color }]}>{score.toFixed(1)}</Text>
        <Text style={[styles.ringMax, { color: colors.mutedForeground }]}>/ {max}</Text>
      </View>
    </View>
  );
}

function RubricBar({ label, icon, score }: { label: string; icon: keyof typeof Feather.glyphMap; score: number }) {
  const colors = useColors();
  const pct = Math.min(1, score / 5);
  const barColor = score >= 4 ? colors.success : score >= 2.5 ? colors.warning : colors.destructive;
  return (
    <View style={styles.rubricItem}>
      <View style={styles.rubricHeader}>
        <View style={styles.rubricLeft}>
          <Feather name={icon} size={14} color={barColor} />
          <Text style={[styles.rubricLabel, { color: colors.text }]}>{label}</Text>
        </View>
        <Text style={[styles.rubricScore, { color: barColor }]}>{score.toFixed(1)}</Text>
      </View>
      <View style={[styles.rubricTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.rubricFill, { width: `${pct * 100}%` as any, backgroundColor: barColor }]} />
      </View>
    </View>
  );
}

function InterstitialModal({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const colors = useColors();
  if (Platform.OS === "web") return null;
  /**
   * In a native EAS build, replace this with the real Interstitial from
   * react-native-google-mobile-ads. Load it at component mount, show it
   * via interstitial.show() when the user taps the dismiss button.
   *
   * unitId = AdService.getInterstitialUnitId()
   */
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={interStyles.overlay}>
        <View style={[interStyles.box, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[interStyles.label, { color: colors.mutedForeground }]}>Anúncio</Text>
          <View style={[interStyles.placeholder, { backgroundColor: colors.muted }]} />
          <Pressable style={[interStyles.closeBtn, { backgroundColor: colors.primary }]} onPress={onDismiss}>
            <Text style={interStyles.closeTxt}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const interStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", alignItems: "center", justifyContent: "center" },
  box: { width: "90%", borderRadius: 16, borderWidth: 1, padding: 20, gap: 14, alignItems: "center" },
  label: { fontSize: 11, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  placeholder: { width: "100%", height: 250, borderRadius: 10 },
  closeBtn: { paddingHorizontal: 32, paddingVertical: 12, borderRadius: 10 },
  closeTxt: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

export default function FeedbackScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [feedback, setFeedback] = useState<FeedbackData | null>(null);
  const [loading, setLoading] = useState(true);
  const [interstitialVisible, setInterstitialVisible] = useState(false);
  const interstitialChecked = useRef(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    const load = async () => {
      const data = await AsyncStorage.getItem("celpeprep_last_feedback");
      if (data) setFeedback(JSON.parse(data));
      setLoading(false);

      if (!interstitialChecked.current) {
        interstitialChecked.current = true;
        const canShow = await AdService.canShowInterstitial();
        if (canShow) {
          await AdService.recordInterstitialShown();
          setTimeout(() => setInterstitialVisible(true), 1200);
        }
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>Carregando avaliação...</Text>
      </View>
    );
  }

  if (!feedback) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Feather name="alert-circle" size={36} color={colors.destructive} />
        <Text style={[styles.errorText, { color: colors.text }]}>Erro ao carregar avaliação</Text>
        <Pressable onPress={() => router.replace("/(tabs)/practice")} style={[styles.backBtn, { backgroundColor: colors.primary }]}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  const overallColor = feedback.overallScore >= 4 ? colors.success : feedback.overallScore >= 2.5 ? colors.warning : colors.destructive;

  return (
    <>
    <InterstitialModal visible={interstitialVisible} onDismiss={() => setInterstitialVisible(false)} />
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <Pressable onPress={() => router.replace("/(tabs)/practice")} style={[styles.closeBtn, { backgroundColor: colors.muted }]}>
          <Feather name="x" size={18} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.headerMeta}>
          <Text style={[styles.headerTask, { color: colors.text }]}>{feedback.taskType}</Text>
          <Text style={[styles.headerGenre, { color: colors.mutedForeground }]}>{feedback.genre}</Text>
        </View>
      </View>

      {feedback.timeExpired && (
        <View style={[styles.expiredBanner, { backgroundColor: colors.errorBg, borderColor: colors.destructive + "40" }]}>
          <Feather name="clock" size={14} color={colors.destructive} />
          <Text style={[styles.expiredText, { color: colors.destructive }]}>Tempo esgotado — texto avaliado automaticamente</Text>
        </View>
      )}

      <View style={[styles.overallCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.overallTitle, { color: colors.text }]}>Pontuação Geral</Text>
        <View style={styles.overallContent}>
          <ScoreRing score={feedback.overallScore} />
          <View style={styles.overallRight}>
            <Text style={[styles.overallGrade, { color: overallColor }]}>
              {feedback.overallScore >= 4.5 ? "Excelente" :
               feedback.overallScore >= 3.5 ? "Bom" :
               feedback.overallScore >= 2.5 ? "Regular" :
               feedback.overallScore >= 1.5 ? "Fraco" : "Muito fraco"}
            </Text>
            <Text style={[styles.overallDesc, { color: colors.mutedForeground }]}>
              {feedback.overallScore >= 3.5
                ? "Continue praticando para atingir excelência."
                : feedback.overallScore >= 2.5
                ? "Há pontos a melhorar. Revise o feedback."
                : "Concentre-se nos critérios mais fracos."}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Critérios de Avaliação</Text>
      <View style={[styles.rubricCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {RUBRIC_LABELS.map(({ key, label, icon }) => (
          <RubricBar key={key} label={label} icon={icon} score={feedback[key]} />
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.text }]}>Comentário da IA</Text>
      <View style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="message-square" size={16} color={colors.primary} />
        <Text style={[styles.commentText, { color: colors.text }]}>{feedback.commentary}</Text>
      </View>

      {feedback.responseText && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Sua resposta</Text>
          <View style={[styles.responseCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.responseText, { color: colors.text }]}>{feedback.responseText}</Text>
          </View>
        </>
      )}

      <View style={styles.actions}>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.replace("/(tabs)/practice")}
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text style={styles.actionBtnText}>Nova prática</Text>
        </Pressable>
        <Pressable
          style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
          onPress={() => router.replace("/(tabs)")}
        >
          <Feather name="home" size={16} color={colors.text} />
          <Text style={[styles.actionBtnText, { color: colors.text }]}>Início</Text>
        </Pressable>
      </View>
    </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular" },
  errorText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  backBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  backBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  closeBtn: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  headerMeta: { flex: 1 },
  headerTask: { fontSize: 18, fontFamily: "Inter_700Bold" },
  headerGenre: { fontSize: 12, fontFamily: "Inter_400Regular" },
  expiredBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  expiredText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  overallCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 14 },
  overallTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  overallContent: { flexDirection: "row", alignItems: "center", gap: 16 },
  ring: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  ringFill: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
  ringScore: { fontSize: 28, fontFamily: "Inter_700Bold" },
  ringMax: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: -4 },
  overallRight: { flex: 1, gap: 6 },
  overallGrade: { fontSize: 20, fontFamily: "Inter_700Bold" },
  overallDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 4 },
  rubricCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 14 },
  rubricItem: { gap: 6 },
  rubricHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rubricLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  rubricLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  rubricScore: { fontSize: 14, fontFamily: "Inter_700Bold" },
  rubricTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  rubricFill: { height: 6, borderRadius: 3 },
  commentCard: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  commentText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22 },
  responseCard: { borderRadius: 14, borderWidth: 1, padding: 14 },
  responseText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  actions: { flexDirection: "row", gap: 12 },
  actionBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 12 },
  actionBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
