import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
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
import { GuestGate } from "@/components/GuestGate";

const TIMER_SECONDS = 1500;

const SAMPLE_PROMPTS: Record<string, { source: string; prompt: string }> = {
  "Tarefa 1": {
    source: "O vídeo mostra uma entrevista com uma pesquisadora que descobriu uma nova espécie de abelha sem ferrão no Cerrado brasileiro. Ela explica a importância das abelhas para a polinização e comenta sobre os riscos da destruição do bioma.",
    prompt: "Com base no vídeo, escreva uma carta a um amigo que mora em outra cidade contando sobre a descoberta e explicando por que você acha importante preservar o Cerrado.",
  },
  "Tarefa 2": {
    source: "O áudio apresenta um debate entre dois especialistas sobre o uso de smartphones por crianças menores de 10 anos. Um defende restrições rigorosas; o outro acredita no uso supervisionado com propósito educativo.",
    prompt: "Com base no áudio, escreva uma resenha do debate, apresentando os dois pontos de vista e dando sua opinião fundamentada.",
  },
  "Tarefa 3": {
    source: "Texto: 'A desigualdade educacional no Brasil ainda é um dos maiores desafios para o desenvolvimento do país. Enquanto escolas particulares oferecem infraestrutura completa e professores bem remunerados, grande parte das escolas públicas enfrenta falta de recursos, superlotação e alta rotatividade de docentes. Estudos apontam que o investimento por aluno na rede privada é até quatro vezes maior do que na rede pública.'",
    prompt: "Escreva um artigo de 170 a 250 palavras discutindo as causas e consequências da desigualdade educacional no Brasil e propondo medidas para reduzi-la.",
  },
  "Tarefa 4": {
    source: "Gráfico: 'Taxa de desmatamento na Amazônia Legal (km²/ano) — 2015: 6.207 | 2016: 7.893 | 2017: 6.947 | 2018: 7.536 | 2019: 11.088 | 2020: 10.851 | 2021: 13.235 | 2022: 11.568 | 2023: 5.500 (estimativa)'",
    prompt: "Com base nos dados do gráfico, escreva uma análise sobre a evolução do desmatamento na Amazônia, destacando as tendências observadas e propondo ações para reverter o cenário.",
  },
  "Prática IA — Escrita": {
    source: "Tema gerado pela IA: O trabalho remoto transformou a relação das pessoas com as cidades. Enquanto alguns profissionais aproveitam a liberdade de morar longe dos grandes centros, outros sentem falta da interação social do ambiente de trabalho presencial.",
    prompt: "Escreva um artigo de opinião de 170 a 250 palavras discutindo as vantagens e desvantagens do trabalho remoto para trabalhadores e para as cidades.",
  },
  "Prática IA — Áudio/Gráfico": {
    source: "Dado: No Brasil, o consumo de ultraprocessados aumentou 30% na última década. A pesquisa 'Alimentação dos Brasileiros' (2024) mostra que 57% dos jovens entre 15 e 24 anos consomem ultraprocessados diariamente, contra 38% em 2014.",
    prompt: "Com base nos dados apresentados, escreva uma análise sobre o crescimento do consumo de ultraprocessados no Brasil e seus impactos na saúde pública.",
  },
};

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function PracticeSessionScreen() {
  const params = useLocalSearchParams<{ taskType: string; genre: string; title: string; subtitle: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, addAttempt, updateProfile, serverLimits } = useApp();

  const taskType = params.taskType || "Tarefa 3";
  const genre = params.genre || "Artigo";

  const promptData = SAMPLE_PROMPTS[taskType] || SAMPLE_PROMPTS["Tarefa 3"];
  const timerSeconds = serverLimits.practiceTimerSeconds || TIMER_SECONDS;

  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timerStartedAt] = useState(() => Date.now());
  const [remaining, setRemaining] = useState(timerSeconds);
  const [timeExpired, setTimeExpired] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const draftKey = `celpeprep_draft_${timerStartedAt}`;

  useEffect(() => {
    const restoreDraft = async () => {
      const saved = await AsyncStorage.getItem(draftKey);
      if (saved) setText(saved);
    };
    restoreDraft();
  }, []);

  useEffect(() => {
    const createSession = async () => {
      try {
        const domain = process.env.EXPO_PUBLIC_DOMAIN;
        const url = domain ? `https://${domain}/api/sessions` : "/api/sessions";
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskType, durationSeconds: timerSeconds }),
        });
        const data = (await res.json()) as { sessionId?: string };
        if (data.sessionId) sessionIdRef.current = data.sessionId;
      } catch {}
    };
    createSession();
  }, []);

  useEffect(() => {
    const sync = setInterval(async () => {
      const sid = sessionIdRef.current;
      if (!sid) return;
      try {
        const domain = process.env.EXPO_PUBLIC_DOMAIN;
        const url = domain ? `https://${domain}/api/sessions/${sid}` : `/api/sessions/${sid}`;
        const res = await fetch(url);
        const data = (await res.json()) as { remaining?: number; elapsed?: number; isExpired?: boolean };
        if (data.remaining !== undefined) {
          const clientElapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
          const drift = Math.abs(clientElapsed - (data.elapsed ?? 0));
          if (drift > 15) setRemaining(data.remaining);
        }
      } catch {}
    }, 30000);
    return () => clearInterval(sync);
  }, [timerStartedAt]);

  useEffect(() => {
    const autoSave = setInterval(async () => {
      if (text.trim()) await AsyncStorage.setItem(draftKey, text);
    }, 30000);
    return () => clearInterval(autoSave);
  }, [text]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
      const rem = Math.max(0, timerSeconds - elapsed);
      setRemaining(rem);
      if (rem === 0) {
        clearInterval(intervalRef.current!);
        setTimeExpired(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        handleExpired();
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const handleExpired = useCallback(async () => {
    const currentText = text;
    if (!currentText.trim()) {
      await saveAttempt({ text: "", score: 0, tema: 0, genero: 0, coesao: 0, gramatica: 0, commentary: "Tempo esgotado sem resposta enviada.", expired: true });
    } else {
      await submitForReview(currentText, true);
    }
  }, [text]);

  const saveAttempt = async (data: { text: string; score: number; tema: number; genero: number; coesao: number; gramatica: number; commentary: string; expired: boolean }) => {
    const feedbackData = {
      taskType,
      genre,
      responseText: data.text,
      overallScore: data.score,
      rubricTema: data.tema,
      rubricGenero: data.genero,
      rubricCoesao: data.coesao,
      rubricGramatica: data.gramatica,
      commentary: data.commentary,
      timeExpired: data.expired,
    };
    await addAttempt(feedbackData);
    await updateProfile({ aiCreditsUsed: Math.min(profile.aiCreditsTotal, profile.aiCreditsUsed + 1) });
    await AsyncStorage.setItem("celpeprep_last_feedback", JSON.stringify(feedbackData));
    await AsyncStorage.removeItem(draftKey);
    router.replace("/practice/feedback");
  };

  const submitForReview = async (responseText: string, expired = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const remaining2 = profile.aiCreditsTotal - profile.aiCreditsUsed;
    if (remaining2 <= 0 && !profile.isPremium) {
      Alert.alert(
        "Créditos esgotados",
        "Você usou todos os seus créditos gratuitos. Assine o Premium para avaliações ilimitadas.",
        [{ text: "OK", onPress: () => setIsSubmitting(false) }]
      );
      return;
    }

    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      const apiUrl = domain ? `https://${domain}/api/ai/feedback` : "/api/ai/feedback";

      const res = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: responseText, task_type: taskType, genre, time_expired: expired }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      await saveAttempt({
        text: responseText,
        score: data.overall_score,
        tema: data.rubric_tema,
        genero: data.rubric_genero,
        coesao: data.rubric_coesao,
        gramatica: data.rubric_gramatica,
        commentary: data.commentary,
        expired,
      });
    } catch (_) {
      const wc = wordCount(responseText);
      const fallbackScore = expired ? 1.5 : Math.min(5, Math.max(1, wc / 50));
      await saveAttempt({
        text: responseText,
        score: Number(fallbackScore.toFixed(1)),
        tema: Number((fallbackScore * 0.9).toFixed(1)),
        genero: Number((fallbackScore * 1.0).toFixed(1)),
        coesao: Number((fallbackScore * 0.95).toFixed(1)),
        gramatica: Number((fallbackScore * 1.05).toFixed(1)),
        commentary: expired
          ? "Tempo esgotado. Não foi possível avaliar automaticamente. Revise seu texto e tente novamente."
          : "Avaliação automática indisponível no momento. Pontuação estimada com base na quantidade de palavras.",
        expired,
      });
    }
  };

  const handleSubmit = () => {
    const wc = wordCount(text);
    if (wc < 50) {
      Alert.alert("Texto muito curto", "Recomendamos pelo menos 150 palavras. Deseja enviar mesmo assim?", [
        { text: "Continuar escrevendo", style: "cancel" },
        { text: "Enviar", onPress: () => submitForReview(text) },
      ]);
      return;
    }
    Alert.alert("Enviar resposta?", `${wc} palavras serão avaliadas pela IA.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Enviar", onPress: () => submitForReview(text) },
    ]);
  };

  const wc = wordCount(text);
  const isWarning = remaining < 300;
  const timerColor = timeExpired ? colors.destructive : isWarning ? colors.warning : colors.primary;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (profile.isGuest) return <GuestGate feature="Prática com IA" />;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.topBar, { paddingTop: topPad + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => {
          Alert.alert("Abandonar prática?", "Seu progresso será perdido.", [
            { text: "Continuar praticando", style: "cancel" },
            { text: "Sair", style: "destructive", onPress: () => router.back() },
          ]);
        }}>
          <Feather name="x" size={22} color={colors.mutedForeground} />
        </Pressable>
        <View style={styles.taskLabel}>
          <Text style={[styles.taskTypeText, { color: colors.text }]}>{params.title}</Text>
          <Text style={[styles.taskSubText, { color: colors.mutedForeground }]}>{params.subtitle}</Text>
        </View>
        <View style={[styles.timerPill, { backgroundColor: timerColor + "18" }]}>
          <Feather name="clock" size={12} color={timerColor} />
          <Text style={[styles.timerText, { color: timerColor }]}>{formatTime(remaining)}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.sourceBox, { backgroundColor: colors.infoBg, borderColor: colors.primary + "30" }]}>
          <Text style={[styles.sourceLabel, { color: colors.primary }]}>Material de apoio</Text>
          <Text style={[styles.sourceText, { color: colors.text }]}>{promptData.source}</Text>
        </View>

        <View style={[styles.promptBox, { backgroundColor: colors.warningBg, borderColor: colors.warning + "40" }]}>
          <Text style={[styles.promptLabel, { color: colors.warning }]}>Tarefa</Text>
          <Text style={[styles.promptText, { color: colors.text }]}>{promptData.prompt}</Text>
        </View>

        <View style={[styles.editorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TextInput
            style={[styles.editor, { color: colors.text }]}
            multiline
            placeholder="Escreva sua resposta aqui..."
            placeholderTextColor={colors.mutedForeground}
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
            editable={!timeExpired && !isSubmitting}
          />
        </View>

        <View style={styles.footer}>
          <View style={styles.wordCountArea}>
            <Text style={[styles.wordCountText, { color: wc < 150 ? colors.warning : colors.accent }]}>
              {wc} palavras
            </Text>
            {wc < 150 && (
              <Text style={[styles.wordCountHint, { color: colors.mutedForeground }]}>
                (recomendado: 150+)
              </Text>
            )}
          </View>
          <Pressable
            style={[styles.submitBtn, { backgroundColor: isSubmitting || timeExpired ? colors.muted : colors.primary }]}
            onPress={handleSubmit}
            disabled={isSubmitting || timeExpired || text.trim().length === 0}
          >
            {isSubmitting ? (
              <Text style={[styles.submitText, { color: colors.mutedForeground }]}>Avaliando...</Text>
            ) : (
              <>
                <Text style={styles.submitText}>Enviar</Text>
                <Feather name="send" size={14} color="#fff" />
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, gap: 12 },
  taskLabel: { flex: 1, alignItems: "center" },
  taskTypeText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  taskSubText: { fontSize: 11, fontFamily: "Inter_400Regular" },
  timerPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  timerText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 32 },
  sourceBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  sourceLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  sourceText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  promptBox: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 6 },
  promptLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  promptText: { fontSize: 14, fontFamily: "Inter_600SemiBold", lineHeight: 21 },
  editorCard: { borderRadius: 14, borderWidth: 1, padding: 14, minHeight: 240 },
  editor: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 22, flex: 1, minHeight: 220 },
  footer: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4 },
  wordCountArea: { flex: 1, gap: 2 },
  wordCountText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  wordCountHint: { fontSize: 11, fontFamily: "Inter_400Regular" },
  submitBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  submitText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
