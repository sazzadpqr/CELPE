import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  FlatList,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

interface ExamEdition {
  id: string;
  year: number;
  edition: string;
  title: string;
  description: string;
  tasks: ExamTask[];
}

interface ExamTask {
  id: string;
  type: string;
  title: string;
  genre: string;
  description: string;
  linkUrl?: string;
}

const EXAMS: ExamEdition[] = [
  {
    id: "2023-2",
    year: 2023,
    edition: "2023/2",
    title: "Celpe-Bras Novembro 2023",
    description: "Segunda edição de 2023. Provas aplicadas em novembro.",
    tasks: [
      { id: "2023-2-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "Carta", description: "Baseada em vídeo sobre tecnologia e sociedade." },
      { id: "2023-2-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Resenha", description: "Texto baseado em áudio sobre questões ambientais." },
      { id: "2023-2-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Artigo", description: "Produção textual sobre impactos do trabalho remoto." },
      { id: "2023-2-t4", type: "Tarefa 4", title: "Tarefa 4 — Gráfico", genre: "Análise", description: "Análise de dados sobre o mercado de trabalho no Brasil." },
    ],
  },
  {
    id: "2023-1",
    year: 2023,
    edition: "2023/1",
    title: "Celpe-Bras Abril 2023",
    description: "Primeira edição de 2023. Provas aplicadas em abril.",
    tasks: [
      { id: "2023-1-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "E-mail", description: "Baseada em vídeo sobre alimentação saudável." },
      { id: "2023-1-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Relatório", description: "Baseada em áudio sobre migração no Brasil." },
      { id: "2023-1-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Crônica", description: "Tema: memória e identidade cultural." },
      { id: "2023-1-t4", type: "Tarefa 4", title: "Tarefa 4 — Tabela", genre: "Proposta", description: "Dados sobre uso de redes sociais por faixa etária." },
    ],
  },
  {
    id: "2022-2",
    year: 2022,
    edition: "2022/2",
    title: "Celpe-Bras Novembro 2022",
    description: "Segunda edição de 2022.",
    tasks: [
      { id: "2022-2-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "Carta", description: "Vídeo sobre desigualdade social urbana." },
      { id: "2022-2-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Resumo", description: "Debate sobre saúde mental e trabalho." },
      { id: "2022-2-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Artigo", description: "Texto sobre impacto da pandemia na educação." },
      { id: "2022-2-t4", type: "Tarefa 4", title: "Tarefa 4 — Gráfico", genre: "Análise", description: "Índices de vacinação no Brasil por região." },
    ],
  },
  {
    id: "2022-1",
    year: 2022,
    edition: "2022/1",
    title: "Celpe-Bras Abril 2022",
    description: "Primeira edição de 2022.",
    tasks: [
      { id: "2022-1-t1", type: "Tarefa 1", title: "Tarefa 1 — Vídeo", genre: "Carta Aberta", description: "Baseada em vídeo sobre sustentabilidade." },
      { id: "2022-1-t2", type: "Tarefa 2", title: "Tarefa 2 — Áudio", genre: "Resenha", description: "Podcast sobre empreendedorismo feminino." },
      { id: "2022-1-t3", type: "Tarefa 3", title: "Tarefa 3 — Texto", genre: "Conto", description: "Texto literário sobre identidade e pertencimento." },
      { id: "2022-1-t4", type: "Tarefa 4", title: "Tarefa 4 — Infográfico", genre: "Análise", description: "Dados sobre desmatamento no cerrado." },
    ],
  },
  {
    id: "inep",
    year: 0,
    edition: "INEP Oficial",
    title: "Materiais Oficiais — INEP",
    description: "Acesse provas, gabaritos e materiais oficiais do Celpe-Bras no site do INEP.",
    tasks: [
      { id: "inep-link", type: "Link Externo", title: "Site oficial INEP — Celpe-Bras", genre: "Portal", description: "Provas anteriores, edital e informações oficiais.", linkUrl: "https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/celpe-bras" },
    ],
  },
];

const TASK_COLORS: Record<string, string> = {
  "Tarefa 1": "#185FA5",
  "Tarefa 2": "#1D9E75",
  "Tarefa 3": "#6B21A8",
  "Tarefa 4": "#BA7517",
  "Link Externo": "#D85A30",
};

export default function ExamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const handleTaskPress = async (task: ExamTask) => {
    if (task.linkUrl) {
      const url = task.linkUrl;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) Linking.openURL(url);
    }
  };

  return (
    <FlatList
      style={[{ backgroundColor: colors.background }]}
      contentContainerStyle={[styles.content, { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
      showsVerticalScrollIndicator={false}
      ListHeaderComponent={
        <>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Provas Anteriores</Text>
          <Text style={[styles.screenSubtitle, { color: colors.mutedForeground }]}>
            Acesse questões, temas e materiais de edições anteriores do Celpe-Bras.
          </Text>
        </>
      }
      data={EXAMS}
      keyExtractor={(e) => e.id}
      renderItem={({ item: exam }) => (
        <View style={[styles.examCard, { backgroundColor: colors.card, borderColor: expanded === exam.id ? colors.primary : colors.border }]}>
          <Pressable
            style={styles.examHeader}
            onPress={() => setExpanded(expanded === exam.id ? null : exam.id)}
          >
            <View style={[styles.yearBadge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[styles.yearText, { color: colors.primary }]}>
                {exam.year > 0 ? exam.year : "INEP"}
              </Text>
            </View>
            <View style={styles.examMeta}>
              <Text style={[styles.examTitle, { color: colors.text }]}>{exam.title}</Text>
              <Text style={[styles.examDesc, { color: colors.mutedForeground }]}>{exam.description}</Text>
            </View>
            <Feather
              name={expanded === exam.id ? "chevron-up" : "chevron-down"}
              size={18}
              color={colors.mutedForeground}
            />
          </Pressable>

          {expanded === exam.id && (
            <View style={[styles.taskList, { borderTopColor: colors.border }]}>
              {exam.tasks.map((task) => (
                <Pressable
                  key={task.id}
                  onPress={() => handleTaskPress(task)}
                  style={({ pressed }) => [
                    styles.taskRow,
                    { borderTopColor: colors.border, opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <View style={[styles.taskIconBox, { backgroundColor: (TASK_COLORS[task.type] || colors.primary) + "18" }]}>
                    <Feather
                      name={task.type === "Link Externo" ? "external-link" : task.type === "Tarefa 1" ? "video" : task.type === "Tarefa 2" ? "headphones" : task.type === "Tarefa 3" ? "file-text" : "bar-chart-2"}
                      size={14}
                      color={TASK_COLORS[task.type] || colors.primary}
                    />
                  </View>
                  <View style={styles.taskMeta}>
                    <Text style={[styles.taskTitle, { color: colors.text }]}>{task.title}</Text>
                    <Text style={[styles.taskDesc, { color: colors.mutedForeground }]}>{task.description}</Text>
                    <View style={[styles.genrePill, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.genreText, { color: colors.mutedForeground }]}>{task.genre}</Text>
                    </View>
                  </View>
                  {task.linkUrl && <Feather name="external-link" size={14} color={colors.primary} />}
                </Pressable>
              ))}
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 12 },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginBottom: 4 },
  screenSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginBottom: 8 },
  examCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  examHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  yearBadge: { width: 52, height: 52, borderRadius: 12, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  yearText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  examMeta: { flex: 1 },
  examTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  examDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  taskList: { borderTopWidth: 1 },
  taskRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, padding: 12, borderTopWidth: 1 },
  taskIconBox: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 },
  taskMeta: { flex: 1, gap: 4 },
  taskTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  taskDesc: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  genrePill: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  genreText: { fontSize: 11, fontFamily: "Inter_500Medium" },
});
