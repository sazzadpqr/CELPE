import { Feather } from "@expo/vector-icons";
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

type LibraryItem = {
  id: string;
  title: string;
  description: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: string;
  badge?: string;
};

type LibrarySection = {
  title: string;
  items: LibraryItem[];
};

const SECTIONS: LibrarySection[] = [
  {
    title: "Habilidades Escritas",
    items: [
      {
        id: "writing",
        title: "Redação e Escrita",
        description: "Pratique os 4 tipos de tarefa do Celpe-Bras com feedback de IA.",
        icon: "edit-3",
        color: "#185FA5",
        route: "/practice",
        badge: "IA",
      },
      {
        id: "grammar",
        title: "Gramática",
        description: "Concordância, subjuntivo, regência e muito mais.",
        icon: "git-branch",
        color: "#6B21A8",
        route: "/grammar",
      },
      {
        id: "vocab",
        title: "Vocabulário",
        description: "Flashcards SRS, palavras do dia e fraseologia avançada.",
        icon: "book-open",
        color: "#1D9E75",
        route: "/vocab",
      },
    ],
  },
  {
    title: "Habilidades Orais",
    items: [
      {
        id: "oral",
        title: "Simulador Oral",
        description: "Timer de preparação (1 min) + resposta (5 min) para cada tarefa oral.",
        icon: "mic",
        color: "#D85A30",
        route: "/oral",
        badge: "Timer",
      },
      {
        id: "pronunciation",
        title: "Pronúncia",
        description: "Pratique sons difíceis do PT-BR: nasais, sibilantes, RR e LH.",
        icon: "volume-2",
        color: "#BA7517",
        route: "/pronunciation",
      },
      {
        id: "conversation",
        title: "Conversação com IA",
        description: "Converse em PT-BR com uma IA em 5 cenários diferentes.",
        icon: "message-circle",
        color: "#6B21A8",
        route: "/conversation",
        badge: "IA",
      },
    ],
  },
  {
    title: "Leitura e Escuta",
    items: [
      {
        id: "exams",
        title: "Provas Anteriores",
        description: "Edições passadas do Celpe-Bras com tarefas completas.",
        icon: "archive",
        color: "#D85A30",
        route: "/exams",
      },
      {
        id: "listening",
        title: "Compreensão Auditiva",
        description: "Exercícios com áudio e transcrição para treinar escuta.",
        icon: "headphones",
        color: "#185FA5",
        route: "/listening",
      },
    ],
  },
  {
    title: "Planejamento e Progresso",
    items: [
      {
        id: "study",
        title: "Plano de Estudo",
        description: "Cronograma personalizado baseado no seu nível e data do exame.",
        icon: "calendar",
        color: "#1D9E75",
        route: "/study",
      },
      {
        id: "progress",
        title: "Meu Progresso",
        description: "Histórico de avaliações, evolução por critério e XP acumulado.",
        icon: "bar-chart-2",
        color: "#BA7517",
        route: "/progress",
      },
      {
        id: "diagnostic",
        title: "Diagnóstico de Nível",
        description: "Teste adaptativo para identificar seu nível atual (A2–C1).",
        icon: "flask",
        color: "#1D9E75",
        route: "/diagnostic",
      },
    ],
  },
];

export default function LibraryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: 40 }]}
      showsVerticalScrollIndicator={false}
    >
      <Pressable onPress={() => router.back()} style={styles.backBtn}>
        <Feather name="arrow-left" size={20} color={colors.text} />
      </Pressable>
      <Text style={[styles.title, { color: colors.text }]}>Biblioteca</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
        Todos os recursos de estudo para o Celpe-Bras em um só lugar.
      </Text>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
            {section.title.toUpperCase()}
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {section.items.map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                <Pressable
                  onPress={() => router.push(item.route as any)}
                  style={({ pressed }) => [styles.item, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <View style={[styles.itemIcon, { backgroundColor: item.color + "18" }]}>
                    <Feather name={item.icon} size={20} color={item.color} />
                  </View>
                  <View style={styles.itemMeta}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>
                      {item.badge && (
                        <View style={[styles.badge, { backgroundColor: item.color + "20" }]}>
                          <Text style={[styles.badgeText, { color: item.color }]}>{item.badge}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.itemDesc, { color: colors.mutedForeground }]}>
                      {item.description}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 20, gap: 6 },
  backBtn: { padding: 4, alignSelf: "flex-start", marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: -2, marginBottom: 8 },
  section: { gap: 6 },
  sectionTitle: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1.5, paddingHorizontal: 4 },
  sectionCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  divider: { height: 1, marginHorizontal: 16 },
  item: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 16, paddingVertical: 14 },
  itemIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  itemMeta: { flex: 1, gap: 2 },
  itemTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  itemTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  itemDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
