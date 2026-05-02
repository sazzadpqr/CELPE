import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface PracticeType {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  taskType: string;
  genre: string;
  badge?: string;
}

const PRACTICE_TYPES: PracticeType[] = [
  {
    id: "t1",
    title: "Tarefa 1",
    subtitle: "Vídeo",
    description: "Assista a um vídeo e escreva uma carta, e-mail ou texto conforme solicitado.",
    icon: "video",
    color: "#185FA5",
    taskType: "Tarefa 1",
    genre: "Carta/E-mail",
  },
  {
    id: "t2",
    title: "Tarefa 2",
    subtitle: "Áudio",
    description: "Ouça um áudio e escreva o texto pedido, como resenha ou relatório.",
    icon: "headphones",
    color: "#1D9E75",
    taskType: "Tarefa 2",
    genre: "Resenha/Relatório",
  },
  {
    id: "t3",
    title: "Tarefa 3",
    subtitle: "Texto",
    description: "Leia um texto e produza 170–250 palavras: artigo, conto ou dissertação.",
    icon: "file-text",
    color: "#6B21A8",
    taskType: "Tarefa 3",
    genre: "Artigo/Conto/Dissertação",
  },
  {
    id: "t4",
    title: "Tarefa 4",
    subtitle: "Gráfico/Tabela",
    description: "Analise dados visuais e redija um texto de análise ou proposta.",
    icon: "bar-chart-2",
    color: "#BA7517",
    taskType: "Tarefa 4",
    genre: "Análise/Proposta",
  },
  {
    id: "ai1",
    title: "Prática IA",
    subtitle: "Escrita",
    description: "A IA gera um tema inédito e avalia sua produção em tempo real.",
    icon: "cpu",
    color: "#185FA5",
    taskType: "Prática IA — Escrita",
    genre: "Variado",
    badge: "IA",
  },
  {
    id: "ai2",
    title: "Prática IA",
    subtitle: "Áudio/Gráfico",
    description: "Dados e prompts gerados pela IA para simular o Celpe-Bras completo.",
    icon: "zap",
    color: "#D85A30",
    taskType: "Prática IA — Áudio/Gráfico",
    genre: "Simulado",
    badge: "IA",
  },
];

export default function PracticeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleStart = (p: PracticeType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/practice/session",
      params: { taskType: p.taskType, genre: p.genre, title: p.title, subtitle: p.subtitle },
    });
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.screenTitle, { color: colors.text }]}>Central de Prática</Text>
      <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
        25 minutos por sessão — simule o Celpe-Bras real
      </Text>

      {PRACTICE_TYPES.map((p) => (
        <Pressable
          key={p.id}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
          onPress={() => handleStart(p)}
        >
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: p.color + "18" }]}>
              <Feather name={p.icon} size={22} color={p.color} />
            </View>
            <View style={styles.cardMeta}>
              <View style={styles.titleRow}>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{p.title}</Text>
                <Text style={[styles.cardSubtitle, { color: p.color }]}> — {p.subtitle}</Text>
                {p.badge && (
                  <View style={[styles.badge, { backgroundColor: p.color }]}>
                    <Text style={styles.badgeText}>{p.badge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{p.description}</Text>
            </View>
          </View>
          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
            <View style={styles.timerInfo}>
              <Feather name="clock" size={12} color={colors.mutedForeground} />
              <Text style={[styles.timerText, { color: colors.mutedForeground }]}>25 min</Text>
            </View>
            <View style={[styles.startPill, { backgroundColor: p.color }]}>
              <Text style={styles.startPillText}>Iniciar</Text>
              <Feather name="arrow-right" size={13} color="#fff" />
            </View>
          </View>
        </Pressable>
      ))}

      <View style={[styles.tipCard, { backgroundColor: colors.infoBg, borderColor: colors.primary + "40" }]}>
        <Feather name="info" size={14} color={colors.primary} />
        <Text style={[styles.tipText, { color: colors.primary }]}>
          O timer começa ao abrir a sessão e não pode ser pausado, assim como na prova real.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 14 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: -6 },
  card: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  cardTop: { flexDirection: "row", gap: 14, padding: 16 },
  iconWrap: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  cardMeta: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  cardSubtitle: { fontSize: 14, fontFamily: "Inter_500Medium" },
  badge: { marginLeft: 6, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  badgeText: { color: "#fff", fontSize: 10, fontFamily: "Inter_700Bold" },
  cardDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1 },
  timerInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  timerText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  startPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  startPillText: { color: "#fff", fontSize: 13, fontFamily: "Inter_600SemiBold" },
  tipCard: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, alignItems: "flex-start" },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
