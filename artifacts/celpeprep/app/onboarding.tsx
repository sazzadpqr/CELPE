import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const LEVELS = [
  { value: "A2", label: "A2 — Básico", desc: "Conheço palavras simples e frases básicas." },
  { value: "B1", label: "B1 — Intermediário", desc: "Consigo me comunicar em situações cotidianas." },
  { value: "B2", label: "B2 — Intermediário Superior", desc: "Falo com certa fluência sobre temas variados." },
  { value: "C1", label: "C1 — Avançado", desc: "Uso o português com eficácia e naturalidade." },
] as const;

const DAILY_GOALS = [15, 30, 45, 60];

const STEPS = [
  { title: "Bem-vindo ao CelpePrep", subtitle: "Sua preparação completa para o Celpe-Bras" },
  { title: "Como você se chama?", subtitle: "Personalizamos seu plano de estudo" },
  { title: "Qual é seu nível atual?", subtitle: "Isso ajusta a dificuldade das práticas" },
  { title: "Meta diária de estudo", subtitle: "Consistência é a chave para o sucesso" },
];

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { updateProfile } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [level, setLevel] = useState<"A2" | "B1" | "B2" | "C1">("B1");
  const [dailyGoal, setDailyGoal] = useState(30);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom + 16;

  const handleNext = () => {
    if (step === 1 && !name.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    await updateProfile({ name: name.trim() || "Estudante", level, dailyGoalMinutes: dailyGoal, onboardingDone: true });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace("/(tabs)");
  };

  const canNext = step === 1 ? name.trim().length > 0 : true;

  return (
    <View style={[styles.root, { backgroundColor: colors.background, paddingTop: topPad }]}>
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, { backgroundColor: i <= step ? colors.primary : colors.muted }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: botPad + 100 }]} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <View style={styles.heroStep}>
            <View style={[styles.logoBox, { backgroundColor: colors.primary }]}>
              <Feather name="book-open" size={36} color="#fff" />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>CelpePrep</Text>
            <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
              Prepare-se para o Celpe-Bras com práticas cronometradas, avaliação por IA e vocabulário com repetição espaçada.
            </Text>
            {[
              { icon: "edit-3" as const, text: "Práticas de 25 minutos com timer real" },
              { icon: "cpu" as const, text: "Feedback detalhado por Inteligência Artificial" },
              { icon: "book-open" as const, text: "Vocabulário com flashcards SRS" },
              { icon: "calendar" as const, text: "Plano de estudo personalizado" },
            ].map((f) => (
              <View key={f.icon} style={[styles.featureRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.featureIcon, { backgroundColor: colors.primary + "18" }]}>
                  <Feather name={f.icon} size={18} color={colors.primary} />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
              </View>
            ))}
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{STEPS[step].title}</Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{STEPS[step].subtitle}</Text>
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="Seu nome"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={40}
            />
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{STEPS[step].title}</Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{STEPS[step].subtitle}</Text>
            {LEVELS.map((l) => (
              <Pressable
                key={l.value}
                onPress={() => { setLevel(l.value); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[styles.levelCard, { backgroundColor: level === l.value ? colors.primary + "10" : colors.card, borderColor: level === l.value ? colors.primary : colors.border, borderWidth: level === l.value ? 2 : 1 }]}
              >
                <View style={[styles.levelCheck, { borderColor: level === l.value ? colors.primary : colors.border, backgroundColor: level === l.value ? colors.primary : "transparent" }]}>
                  {level === l.value && <Feather name="check" size={12} color="#fff" />}
                </View>
                <View style={styles.levelMeta}>
                  <Text style={[styles.levelLabel, { color: colors.text }]}>{l.label}</Text>
                  <Text style={[styles.levelDesc, { color: colors.mutedForeground }]}>{l.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={[styles.stepTitle, { color: colors.text }]}>{STEPS[step].title}</Text>
            <Text style={[styles.stepSubtitle, { color: colors.mutedForeground }]}>{STEPS[step].subtitle}</Text>
            <View style={styles.goalGrid}>
              {DAILY_GOALS.map((g) => (
                <Pressable
                  key={g}
                  onPress={() => { setDailyGoal(g); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[styles.goalCard, { backgroundColor: dailyGoal === g ? colors.primary : colors.card, borderColor: dailyGoal === g ? colors.primary : colors.border }]}
                >
                  <Text style={[styles.goalNum, { color: dailyGoal === g ? "#fff" : colors.text }]}>{g}</Text>
                  <Text style={[styles.goalMin, { color: dailyGoal === g ? "rgba(255,255,255,0.8)" : colors.mutedForeground }]}>min/dia</Text>
                </Pressable>
              ))}
            </View>
            <View style={[styles.goalNote, { backgroundColor: colors.successBg, borderColor: colors.accent + "40" }]}>
              <Feather name="info" size={14} color={colors.success} />
              <Text style={[styles.goalNoteText, { color: colors.success }]}>
                Estudar {dailyGoal} minutos por dia é suficiente para uma preparação sólida!
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad, borderTopColor: colors.border, backgroundColor: colors.background }]}>
        {step > 0 && (
          <Pressable
            style={[styles.backBtn, { backgroundColor: colors.muted }]}
            onPress={() => { setStep(step - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          >
            <Feather name="arrow-left" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}
        <Pressable
          style={[styles.nextBtn, { backgroundColor: canNext ? colors.primary : colors.muted, flex: step === 0 ? 1 : undefined }]}
          onPress={handleNext}
          disabled={!canNext}
        >
          <Text style={[styles.nextText, { color: canNext ? "#fff" : colors.mutedForeground }]}>
            {step === STEPS.length - 1 ? "Começar a estudar" : "Continuar"}
          </Text>
          <Feather name={step === STEPS.length - 1 ? "check" : "arrow-right"} size={16} color={canNext ? "#fff" : colors.mutedForeground} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, paddingVertical: 16 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  content: { paddingHorizontal: 24 },
  heroStep: { gap: 16, alignItems: "center", paddingTop: 16 },
  logoBox: { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  heroTitle: { fontSize: 28, fontFamily: "Inter_700Bold" },
  heroSubtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, width: "100%" },
  featureIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  featureText: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
  stepContent: { gap: 14, paddingTop: 24 },
  stepTitle: { fontSize: 24, fontFamily: "Inter_700Bold" },
  stepSubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: -6 },
  nameInput: { borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 16, fontSize: 18, fontFamily: "Inter_400Regular" },
  levelCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 14, padding: 14 },
  levelCheck: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  levelMeta: { flex: 1 },
  levelLabel: { fontSize: 15, fontFamily: "Inter_700Bold" },
  levelDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  goalGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  goalCard: { width: "47%", alignItems: "center", paddingVertical: 20, borderRadius: 16, borderWidth: 1.5, gap: 4 },
  goalNum: { fontSize: 32, fontFamily: "Inter_700Bold" },
  goalMin: { fontSize: 12, fontFamily: "Inter_500Medium" },
  goalNote: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  goalNoteText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1 },
  backBtn: { width: 48, height: 52, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  nextBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 14 },
  nextText: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
});
