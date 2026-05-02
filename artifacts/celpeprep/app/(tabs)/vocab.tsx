import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useApp, type VocabWord } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const STATUS_COLORS: Record<VocabWord["status"], string> = {
  learning: "#BA7517",
  review: "#185FA5",
  mastered: "#1D9E75",
};
const STATUS_LABELS: Record<VocabWord["status"], string> = {
  learning: "Aprendendo",
  review: "Para revisar",
  mastered: "Dominado",
};

function AddWordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { addVocabWord } = useApp();
  const [word, setWord] = useState("");
  const [definition, setDefinition] = useState("");
  const [example, setExample] = useState("");
  const [partOfSpeech, setPartOfSpeech] = useState("substantivo");

  const handleAdd = async () => {
    if (!word.trim() || !definition.trim()) {
      Alert.alert("Campos obrigatórios", "Palavra e definição são obrigatórios.");
      return;
    }
    await addVocabWord({ word: word.trim(), definition: definition.trim(), example: example.trim(), partOfSpeech, register: "neutro" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setWord(""); setDefinition(""); setExample(""); setPartOfSpeech("substantivo");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Text style={[styles.modalCancel, { color: colors.mutedForeground }]}>Cancelar</Text></Pressable>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Nova palavra</Text>
          <Pressable onPress={handleAdd}><Text style={[styles.modalSave, { color: colors.primary }]}>Salvar</Text></Pressable>
        </View>
        <View style={styles.modalBody}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Palavra *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={word} onChangeText={setWord} placeholder="Ex: cotidiano" placeholderTextColor={colors.mutedForeground} autoFocus />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Definição *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={definition} onChangeText={setDefinition} placeholder="Significado em português" placeholderTextColor={colors.mutedForeground} multiline />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Exemplo de uso</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={example} onChangeText={setExample} placeholder="Frase com a palavra" placeholderTextColor={colors.mutedForeground} multiline />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Classe gramatical</Text>
          <View style={styles.posRow}>
            {["substantivo", "verbo", "adjetivo", "advérbio", "outro"].map((pos) => (
              <Pressable key={pos} onPress={() => setPartOfSpeech(pos)} style={[styles.posPill, { backgroundColor: partOfSpeech === pos ? colors.primary : colors.muted }]}>
                <Text style={[styles.posPillText, { color: partOfSpeech === pos ? "#fff" : colors.mutedForeground }]}>{pos}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function WordCard({ item }: { item: VocabWord }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[item.status];
  return (
    <View style={[styles.wordCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.wordHeader}>
        <Text style={[styles.wordText, { color: colors.text }]}>{item.word}</Text>
        <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[item.status]}</Text>
        </View>
      </View>
      <Text style={[styles.posText, { color: colors.purple }]}>{item.partOfSpeech}</Text>
      <Text style={[styles.defText, { color: colors.mutedForeground }]} numberOfLines={2}>{item.definition}</Text>
      {item.example ? <Text style={[styles.exampleText, { color: colors.mutedForeground }]} numberOfLines={1}>"…{item.example}…"</Text> : null}
    </View>
  );
}

export default function VocabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vocabWords } = useApp();
  const [search, setSearch] = useState("");
  const [addVisible, setAddVisible] = useState(false);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const dueReview = useMemo(() => vocabWords.filter((w) => w.status === "review" || (w.status === "learning" && new Date(w.nextReview) <= new Date())), [vocabWords]);
  const filtered = useMemo(() => {
    if (!search.trim()) return vocabWords;
    const q = search.toLowerCase();
    return vocabWords.filter((w) => w.word.toLowerCase().includes(q) || w.definition.toLowerCase().includes(q));
  }, [vocabWords, search]);

  const mastered = useMemo(() => vocabWords.filter((w) => w.status === "mastered").length, [vocabWords]);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Vocabulário</Text>
          <Pressable onPress={() => setAddVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
            <Feather name="plus" size={18} color="#fff" />
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: colors.warningBg }]}>
            <Text style={[styles.statPillNum, { color: colors.warning }]}>{vocabWords.filter(w => w.status === "learning").length}</Text>
            <Text style={[styles.statPillLabel, { color: colors.warning }]}>Aprendendo</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.infoBg }]}>
            <Text style={[styles.statPillNum, { color: colors.primary }]}>{dueReview.length}</Text>
            <Text style={[styles.statPillLabel, { color: colors.primary }]}>Para revisar</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.statPillNum, { color: colors.success }]}>{mastered}</Text>
            <Text style={[styles.statPillLabel, { color: colors.success }]}>Dominadas</Text>
          </View>
        </View>

        {dueReview.length > 0 && (
          <Pressable
            style={[styles.reviewBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              router.push("/vocab/flashcards");
            }}
          >
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.reviewBtnText}>{dueReview.length} palavra{dueReview.length !== 1 ? "s" : ""} para revisar</Text>
          </Pressable>
        )}

        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar palavra..."
            placeholderTextColor={colors.mutedForeground}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}><Feather name="x" size={16} color={colors.mutedForeground} /></Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => <WordCard item={item} />}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!filtered.length}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="book-open" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {search ? "Nenhuma palavra encontrada" : "Nenhuma palavra ainda"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "Tente outra busca" : "Adicione palavras que encontrar durante os estudos"}
            </Text>
          </View>
        }
      />

      <AddWordModal visible={addVisible} onClose={() => setAddVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, gap: 12, paddingBottom: 12 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 2 },
  statPillNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statPillLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12 },
  reviewBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  wordCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 4 },
  wordHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wordText: { fontSize: 16, fontFamily: "Inter_700Bold", flex: 1 },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  posText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  defText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18, marginTop: 2 },
  exampleText: { fontSize: 12, fontFamily: "Inter_400Regular", fontStyle: "italic", marginTop: 2 },
  empty: { alignItems: "center", gap: 8, paddingVertical: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  modalCancel: { fontSize: 14, fontFamily: "Inter_400Regular" },
  modalSave: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  modalBody: { padding: 20, gap: 8 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 8 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular", minHeight: 44 },
  posRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  posPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  posPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
