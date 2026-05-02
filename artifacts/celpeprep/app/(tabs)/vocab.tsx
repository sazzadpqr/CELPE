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
  ScrollView,
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

// ─── Add Word Modal ────────────────────────────────────────────────────────────

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
        <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
          <Text style={[styles.inputLabel, { color: colors.text }]}>Palavra *</Text>
          <TextInput style={[styles.input, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={word} onChangeText={setWord} placeholder="Ex: cotidiano" placeholderTextColor={colors.mutedForeground} autoFocus />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Definição *</Text>
          <TextInput style={[styles.input, styles.inputMulti, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={definition} onChangeText={setDefinition} placeholder="Significado em português" placeholderTextColor={colors.mutedForeground} multiline />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Exemplo de uso</Text>
          <TextInput style={[styles.input, styles.inputMulti, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} value={example} onChangeText={setExample} placeholder="Frase com a palavra" placeholderTextColor={colors.mutedForeground} multiline />
          <Text style={[styles.inputLabel, { color: colors.text }]}>Classe gramatical</Text>
          <View style={styles.posRow}>
            {["substantivo", "verbo", "adjetivo", "advérbio", "outro"].map((pos) => (
              <Pressable key={pos} onPress={() => setPartOfSpeech(pos)} style={[styles.posPill, { backgroundColor: partOfSpeech === pos ? colors.primary : colors.muted }]}>
                <Text style={[styles.posPillText, { color: partOfSpeech === pos ? "#fff" : colors.mutedForeground }]}>{pos}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Word Detail Modal ─────────────────────────────────────────────────────────

function WordDetailModal({
  word,
  visible,
  onClose,
  onUpdate,
  onDelete,
}: {
  word: VocabWord | null;
  visible: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<VocabWord>) => Promise<void>;
  onDelete?: (id: string) => void;
}) {
  const colors = useColors();
  const [fillAnswer, setFillAnswer] = useState("");
  const [fillChecked, setFillChecked] = useState(false);
  const [fillCorrect, setFillCorrect] = useState(false);

  if (!word) return null;

  const statusColor = STATUS_COLORS[word.status];

  // Generate fill-in-the-blank from example
  const fillSentence = word.example
    ? word.example.replace(new RegExp(word.word, "gi"), "___________")
    : null;

  const hasFill = fillSentence && fillSentence !== word.example;

  const checkFill = () => {
    const correct = fillAnswer.trim().toLowerCase() === word.word.toLowerCase();
    setFillCorrect(correct);
    setFillChecked(true);
    Haptics.impactAsync(correct ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Heavy);
  };

  const resetFill = () => {
    setFillAnswer("");
    setFillChecked(false);
    setFillCorrect(false);
  };

  const handleMarkMastered = async () => {
    await onUpdate(word.id, { status: "mastered" });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  };

  const handleMarkReview = async () => {
    await onUpdate(word.id, { status: "review" });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[detailStyles.root, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[detailStyles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => { onClose(); resetFill(); }} style={detailStyles.closeBtn}>
            <Feather name="x" size={22} color={colors.mutedForeground} />
          </Pressable>
          <View style={[detailStyles.statusPill, { backgroundColor: statusColor + "20" }]}>
            <Text style={[detailStyles.statusText, { color: statusColor }]}>{STATUS_LABELS[word.status]}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={detailStyles.body} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Word */}
          <View style={detailStyles.wordSection}>
            <Text style={[detailStyles.wordText, { color: colors.text }]}>{word.word}</Text>
            <View style={[detailStyles.posBadge, { backgroundColor: colors.primary + "18" }]}>
              <Text style={[detailStyles.posText, { color: colors.primary }]}>{word.partOfSpeech}</Text>
            </View>
          </View>

          {/* Stats row */}
          <View style={detailStyles.statsRow}>
            <View style={[detailStyles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[detailStyles.statValue, { color: colors.text }]}>{word.timesReviewed}</Text>
              <Text style={[detailStyles.statLabel, { color: colors.mutedForeground }]}>revisões</Text>
            </View>
            <View style={[detailStyles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[detailStyles.statValue, { color: colors.text }]}>{word.easeLevel}/5</Text>
              <Text style={[detailStyles.statLabel, { color: colors.mutedForeground }]}>facilidade</Text>
            </View>
            <View style={[detailStyles.statItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[detailStyles.statValue, { color: colors.text }]}>
                {new Date(word.addedAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
              </Text>
              <Text style={[detailStyles.statLabel, { color: colors.mutedForeground }]}>adicionada</Text>
            </View>
          </View>

          {/* Definition */}
          <View style={[detailStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[detailStyles.sectionLabel, { color: colors.mutedForeground }]}>DEFINIÇÃO</Text>
            <Text style={[detailStyles.defText, { color: colors.text }]}>{word.definition}</Text>
          </View>

          {/* Example */}
          {word.example ? (
            <View style={[detailStyles.section, { backgroundColor: colors.infoBg, borderColor: colors.primary + "30" }]}>
              <Text style={[detailStyles.sectionLabel, { color: colors.primary }]}>EXEMPLO</Text>
              <Text style={[detailStyles.exampleText, { color: colors.text }]}>"{word.example}"</Text>
            </View>
          ) : null}

          {/* Fill-in-the-blank exercise */}
          {hasFill && (
            <View style={[detailStyles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={detailStyles.exerciseTitleRow}>
                <Feather name="edit-3" size={13} color={colors.primary} />
                <Text style={[detailStyles.sectionLabel, { color: colors.primary }]}>COMPLETE A FRASE</Text>
              </View>
              <Text style={[detailStyles.fillSentence, { color: colors.text }]}>{fillSentence}</Text>
              {!fillChecked ? (
                <View style={detailStyles.fillInputRow}>
                  <TextInput
                    style={[detailStyles.fillInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
                    value={fillAnswer}
                    onChangeText={setFillAnswer}
                    placeholder="Digite a palavra..."
                    placeholderTextColor={colors.mutedForeground}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={fillAnswer.trim() ? checkFill : undefined}
                  />
                  <Pressable
                    style={[detailStyles.fillCheckBtn, { backgroundColor: fillAnswer.trim() ? colors.primary : colors.muted }]}
                    onPress={fillAnswer.trim() ? checkFill : undefined}
                  >
                    <Feather name="check" size={18} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <View style={{ gap: 10 }}>
                  <View style={[detailStyles.fillResult, { backgroundColor: fillCorrect ? colors.successBg : colors.errorBg, borderColor: fillCorrect ? colors.success : colors.destructive }]}>
                    <Feather name={fillCorrect ? "check-circle" : "x-circle"} size={16} color={fillCorrect ? colors.success : colors.destructive} />
                    <Text style={[detailStyles.fillResultText, { color: fillCorrect ? colors.success : colors.destructive }]}>
                      {fillCorrect ? "Correto! 🎉" : `Incorreto — a resposta é "${word.word}"`}
                    </Text>
                  </View>
                  <Pressable onPress={resetFill} style={detailStyles.tryAgainBtn}>
                    <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
                    <Text style={[detailStyles.tryAgainText, { color: colors.mutedForeground }]}>Tentar novamente</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {/* Next review */}
          <View style={[detailStyles.nextReviewRow, { backgroundColor: colors.muted + "60" }]}>
            <Feather name="clock" size={12} color={colors.mutedForeground} />
            <Text style={[detailStyles.nextReviewText, { color: colors.mutedForeground }]}>
              Próxima revisão: {new Date(word.nextReview) <= new Date()
                ? "Agora!"
                : new Date(word.nextReview).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </Text>
          </View>

          {/* Action buttons */}
          <View style={detailStyles.actions}>
            {word.status !== "mastered" && (
              <Pressable style={[detailStyles.actionBtn, { backgroundColor: colors.success + "18", borderColor: colors.success + "40" }]} onPress={handleMarkMastered}>
                <Feather name="check-circle" size={16} color={colors.success} />
                <Text style={[detailStyles.actionBtnText, { color: colors.success }]}>Marcar como dominada</Text>
              </Pressable>
            )}
            {word.status === "mastered" && (
              <Pressable style={[detailStyles.actionBtn, { backgroundColor: colors.warningBg, borderColor: colors.warning + "40" }]} onPress={handleMarkReview}>
                <Feather name="refresh-cw" size={16} color={colors.warning} />
                <Text style={[detailStyles.actionBtnText, { color: colors.warning }]}>Mover para revisão</Text>
              </Pressable>
            )}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const detailStyles = StyleSheet.create({
  root: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14, borderBottomWidth: 1 },
  closeBtn: { padding: 4 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  body: { padding: 24, gap: 14, paddingBottom: 48 },
  wordSection: { alignItems: "center", gap: 10 },
  wordText: { fontSize: 36, fontFamily: "Inter_700Bold", textAlign: "center" },
  posBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  posText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  statsRow: { flexDirection: "row", gap: 10 },
  statItem: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, alignItems: "center", gap: 2 },
  statValue: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 8 },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  defText: { fontSize: 15, fontFamily: "Inter_400Regular", lineHeight: 22 },
  exampleText: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, fontStyle: "italic" },
  exerciseTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  fillSentence: { fontSize: 15, fontFamily: "Inter_500Medium", lineHeight: 22 },
  fillInputRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  fillInput: { flex: 1, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  fillCheckBtn: { width: 44, height: 44, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  fillResult: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  fillResultText: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  tryAgainBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "center" },
  tryAgainText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  nextReviewRow: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 8, padding: 10 },
  nextReviewText: { fontSize: 12, fontFamily: "Inter_400Regular" },
  actions: { gap: 10 },
  actionBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1, padding: 14 },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});

// ─── Word Card (tappable) ──────────────────────────────────────────────────────

function WordCard({ item, onPress }: { item: VocabWord; onPress: () => void }) {
  const colors = useColors();
  const statusColor = STATUS_COLORS[item.status];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wordCard,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.8 : 1 },
      ]}
    >
      <View style={styles.wordHeader}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.wordText, { color: colors.text }]}>{item.word}</Text>
          <Text style={[styles.posText, { color: colors.purple }]}>{item.partOfSpeech}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <View style={[styles.statusPill, { backgroundColor: statusColor + "20" }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{STATUS_LABELS[item.status]}</Text>
          </View>
          <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
        </View>
      </View>
      <Text style={[styles.defText, { color: colors.mutedForeground }]} numberOfLines={2}>{item.definition}</Text>
      {item.example ? <Text style={[styles.exampleText, { color: colors.mutedForeground }]} numberOfLines={1}>"{item.example}"</Text> : null}
    </Pressable>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function VocabScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vocabWords, updateVocabWord } = useApp();
  const [search, setSearch] = useState("");
  const [addVisible, setAddVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<VocabWord | null>(null);
  const [filter, setFilter] = useState<"all" | VocabWord["status"]>("all");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const dueReview = useMemo(() => vocabWords.filter((w) => w.status === "review" || (w.status === "learning" && new Date(w.nextReview) <= new Date())), [vocabWords]);

  const filtered = useMemo(() => {
    let list = vocabWords;
    if (filter !== "all") list = list.filter((w) => w.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((w) => w.word.toLowerCase().includes(q) || w.definition.toLowerCase().includes(q));
    }
    return list;
  }, [vocabWords, search, filter]);

  const mastered = useMemo(() => vocabWords.filter((w) => w.status === "mastered").length, [vocabWords]);
  const learning = useMemo(() => vocabWords.filter((w) => w.status === "learning").length, [vocabWords]);

  const FILTER_OPTIONS: { key: "all" | VocabWord["status"]; label: string; count: number }[] = [
    { key: "all", label: "Todas", count: vocabWords.length },
    { key: "learning", label: "Aprendendo", count: learning },
    { key: "review", label: "Revisar", count: dueReview.length },
    { key: "mastered", label: "Dominadas", count: mastered },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, backgroundColor: colors.background }]}>
        <View style={styles.headerTop}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Vocabulário</Text>
          <View style={styles.headerBtns}>
            <Pressable onPress={() => setAddVisible(true)} style={[styles.addBtn, { backgroundColor: colors.primary }]}>
              <Feather name="plus" size={18} color="#fff" />
            </Pressable>
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: colors.warningBg }]}>
            <Text style={[styles.statPillNum, { color: colors.warning }]}>{learning}</Text>
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
          <Pressable style={[styles.reviewBtn, { backgroundColor: colors.primary }]} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/vocab/flashcards"); }}>
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.reviewBtnText}>{dueReview.length} palavra{dueReview.length !== 1 ? "s" : ""} para revisar agora</Text>
            <Feather name="arrow-right" size={14} color="rgba(255,255,255,0.7)" />
          </Pressable>
        )}

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {FILTER_OPTIONS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterTab, { backgroundColor: filter === f.key ? colors.primary : colors.card, borderColor: filter === f.key ? colors.primary : colors.border }]}
            >
              <Text style={[styles.filterTabText, { color: filter === f.key ? "#fff" : colors.mutedForeground }]}>{f.label}</Text>
              <Text style={[styles.filterTabCount, { color: filter === f.key ? "rgba(255,255,255,0.7)" : colors.mutedForeground + "80" }]}>{f.count}</Text>
            </Pressable>
          ))}
        </View>

        {/* Search */}
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
        renderItem={({ item }) => (
          <WordCard item={item} onPress={() => setSelectedWord(item)} />
        )}
        contentContainerStyle={[styles.list, { paddingBottom: Platform.OS === "web" ? 34 : 100 }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="book-open" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {search ? "Nenhuma palavra encontrada" : filter !== "all" ? "Nenhuma palavra nesta categoria" : "Nenhuma palavra ainda"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              {search ? "Tente outra busca" : filter !== "all" ? "Mude o filtro ou adicione novas palavras" : "Adicione palavras que encontrar durante os estudos"}
            </Text>
          </View>
        }
      />

      <AddWordModal visible={addVisible} onClose={() => setAddVisible(false)} />
      <WordDetailModal
        word={selectedWord}
        visible={!!selectedWord}
        onClose={() => setSelectedWord(null)}
        onUpdate={updateVocabWord}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, gap: 12, paddingBottom: 12 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  screenTitle: { fontSize: 22, fontFamily: "Inter_700Bold" },
  headerBtns: { flexDirection: "row", gap: 10, alignItems: "center" },
  addBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statsRow: { flexDirection: "row", gap: 8 },
  statPill: { flex: 1, borderRadius: 10, padding: 10, alignItems: "center", gap: 2 },
  statPillNum: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statPillLabel: { fontSize: 10, fontFamily: "Inter_500Medium" },
  reviewBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: 14, borderRadius: 12 },
  reviewBtnText: { color: "#fff", fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterTab: { flex: 1, borderRadius: 8, borderWidth: 1, padding: 8, alignItems: "center", gap: 1 },
  filterTabText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  filterTabCount: { fontSize: 10, fontFamily: "Inter_400Regular" },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", paddingVertical: 0 },
  list: { paddingHorizontal: 20, paddingTop: 8, gap: 10 },
  wordCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  wordHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  wordText: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statusPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
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
  modalBody: { padding: 20 },
  inputLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginTop: 12, marginBottom: 6 },
  input: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, fontFamily: "Inter_400Regular" },
  inputMulti: { minHeight: 72, textAlignVertical: "top" },
  posRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  posPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  posPillText: { fontSize: 12, fontFamily: "Inter_500Medium" },
});
